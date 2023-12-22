---
title: Building APIs in Laravel
pubDate: 2023-01-31
image: building-apis-in-laravel.png
source: https://laravel-news.com/building-apis-in-laravel
partner: Laravel News
description: Explore effective API design in Laravel; Learn to focus on integration, eliminate pain points, and create user-centered, scalable APIs with practical examples.
---

Building APIs in Laravel is an art form. You must think beyond data access and wrapping your Eloquent Models in API endpoints.

The first thing you need to do is design your API; the best way to do this is to think about the purpose of your API. Why are you building this API, and what is the target use case? Once you have figured this out, you can effectively design your API based on how it should be integrated.

By focusing your perspective on how your API should be integrated, you can eliminate any potential pain points within your API before it is even released. This is why I always test integrating any APIs I build to ensure a smooth integration that covers all use cases I intend to have.

Let's talk through an example to paint a picture. I am building a new bank, Laracoin. I need my users to be able to create accounts and create transactions for these accounts. I have an `Account` model, a `Transaction` model, and a `Vendor` model to which each transaction will belong. An example of this is:

```markdown
Account -> Has Many -> Transaction -> Belongs To -> Vendor

Spending Account -> Lunch 11.50 -> Some Restaurant
```

So we have three main models that we need to focus on for our API. If we were to approach this without any design-led thinking, then we would create the following routes:

```markdown
GET /accounts
POST /accounts
GET /accounts/{account}
PUT|PATCH /accounts/{account}
DELETE /accounts/{account}

GET /transactions
POST /transactions
GET /transactions/{transaction}
PUT|PATCH /transactions/{transaction}
DELETE /transactions/{transaction}

GET /vendors
POST /vendors
GET /vendors/{vendor}
PUT|PATCH /vendors/{vendor}
DELETE /vendors/{vendor}
```

However, what are the benefits of these routes? We are just creating JSON access for our eloquent models, which works - but adds zero value, and from an integration perspective, it makes things feel very robotic.

Instead, let's think about the Design and Purpose of our API. Our API will likely be accessed by mostly internal mobile and web applications. We will focus on these use cases to start with. Knowing this means we can fine-tune our API to fit the user journeys in our applications. So typically, in these applications, we will see a list of accounts, as we can manage our accounts. We will also have to click through to an account to see a list of transactions. We will then have to click on a transaction to see more details. We would never really need to see the vendors directly, as they are there more for categorization than anything else. With that in mind, we can design our API around these use cases and principles:

```markdown
GET /accounts
POST /accounts
GET /accounts/{account}
PUT|PATCH /accounts/{account}
DELETE /accounts/{account}

GET /accounts/{account}/transactions
GET /accounts/{account}/transactions/{transaction}

POST /transactions
```

This will allow us to manage our accounts effectively and only be able to fetch transactions directly through the account to which it belongs. We do not want transactions to be edited or managed now. These should be created only - and from there, an internal process should update these should they be required.

Now that we know how our API is meant to be designed, we can focus on how to build this API to ensure it responds quickly and can scale in terms of its complexity.

Firstly, we will make the assumption that we are building an API-only Laravel application - so we will not need any `api` prefix. Let's think about how we might register these routes, as this is often the first part of your application that sees problems. A busy routes file is hard to parse mentally, and the cognitive load is the first battle in any application.

If this API were going to be public facing, I would look into supporting a versioned API, in which case I would create a version directory and keep each main group in a dedicated file. However, we aren't using versioning in this case so we will organize them differently.

The first routes file we want to create is `routes/api/accounts.php`, which we can add to our `routes/api.php`.

```php
Route::prefix('accounts')->as('accounts:')->middleware(['auth:sanctum', 'verified'])->group(
	base_path('routes/api/accounts.php),
);
```

Each group will load in its routes, setting up the default middleware prefix and route naming pattern. Our route file for `accounts` will be flat with minimal grouping other than when we want to look at sub-resources. This allows us to have only one area to look at when trying to understand the routes themselves, but it means that anything and everything to do with accounts will belong in this file.

```php
Route::get(
	'/',
	App\Http\Controllers\Accounts\IndexController::class,
)->name('index');
```

Our first route is the accounts index route, which will show all accounts for the authenticated user. This is likely the first thing called through the API aside from the authentication routes, so it is where I typically focus first. It is essential to look at the most critical routes first to unblock other teams, but also it allows you to flesh out the standards you want to follow within your application.

Now that we understand how we are routing our requests, we can think about how we want to process these requests. Where does the logic live, and how can we ensure we keep code duplication to a minimal amount?

I recently wrote a tutorial about how to use [Eloquent Effectively](https://laravel-news.com/effective-eloquent), which dives into query classes. This is my preferred approach, as it ensures that we have a minimal amount of code duplication. I won't go into the specifics as to why I will use this approach, as I went into detail in the previous tutorial. However, I will walk through how to use it in your application. You can follow this approach if it suits your needs.

The critical thing to remember is that the best way to get the most out of your API is to build it in a way that works for you and your team. Spending hours trying to adjust to a method that doesn't feel natural will only slow you down in a way that won't give you the benefit you are trying to achieve.

When creating a query class, you need to make the corresponding interface bind to the controller. This isn't a required step. However, it is me writing the tutorial - so what did you expect, really?

```php
interface FilterForUserContract
{
	public function handle(Builder $query, string $user): Builder;
}
```

Then the implementation we want to use:

```php
final class FilterAccountsForUser implements FilterForUserContract
{
	public function handle(Builder $query, string $user): Builder
	{
		return QueryBuilder::for(
			subject: $query,
		)->allowedIncludes(
			include: ['transactions'],
		)->where('user_id', $user)->getEloquentBuilder();
	}
}
```

This query class will get all accounts for the passed-through user, allowing you to include the transactions for each account optionally - then pass back the eloquent builder to add additional scopes where needed.

We can then use this within our controller to query the accounts for the authenticated user, then return them within our response. Let's look at how we might use this query to understand the available options.

```php
final class IndexController
{
	public function __construct(
		private readonly Authenticatable $user,
		private readonly FilterForUserContract $query,
	) {}

	public function __invoke(Request $request): Responsable
	{
		$accounts = $this->query->handle(
			query: Account::query()->latest(),
			user: $this->user->getAuthIdentifier(),
		);

		// return response here.
	}
}
```

At this point, our controller has an eloquent builder that will pass to the response, so when passing the data, make sure you either call `get` or `paginate` to pass the data through properly. This leads us to the next point in my opinionated journey.

Responding is the primary responsibility of our API. We should respond quickly and efficiently to have a fast and responsive API for our users to experience. How we respond as an API can be split into two areas, the response class and how the data is transformed for the response.

These two areas are Responses and API Resources. I will start with the API Resources, as I care very much about them. API Resources are used to obfuscate away from the database structure and a way for you to transform the information stored in your API in a way that will best be consumed on the client side.

I use JSON:API standards within my Laravel APIs as it is an excellent standard that is well-documented and used within the API community. Luckily [Tim MacDonald has created a fantastic package](https://github.com/timacdonald/json-api) for creating JSON:API resources in Laravel, which I swear by in all of my Laravel applications. I have recently [written a tutorial](https://laravel-news.com/json-api-resources-in-laravel) on how to use this package, so I will only go into some detail here.

Let us start with the Account Resource, which will be set up to have the relevant relationships and attributes. Since my last tutorial, the package has been updated recently, making setting relationships up easier.

```php
final class AccountResource extends JsonApiResource
{
	public $relationships = [
		'transactions' => TransactionResource::class,
	];

	public function toAttributes(Request $request): array
	{
		return [
			'name' => $this->name,
			'balance' => $this->balance->getAmount(),
		];
	}
}
```

We are keeping this super simple for now. We want to return the account name and balance, with an option to load in the transactions relationship.

Using these resources means that to access the name, and we would have to use: `data.attributes.name`, which may take a while to get used to in your web or mobile applications, but you will get the hang of it soon enough. I like this approach, as we can separate the relationships and attributes and extend them where needed.

Once our resources are filled out, we can focus on other areas, such as Authorization. This is a vital part of our API and should not be overlooked. Most of us have used Laravels Gate before, using the Gate Facade. However, I like injecting the Gate contract from the framework itself. This is mainly because I prefer Dependency Injection over Facades when I get a chance. Let's look at what this might look like in the `StoreController` for accounts.

```php
final class StoreController
{
	public function __construct(
		private readonly Gate $access,
	) {}

	public function __invoke(StoreRequest $request): Responsable
	{
		if (! $this->access->allows('store')) {
			// respond with an error.
		}

		// the rest of the controller goes here.
	}
}
```

Here we are just using the Gate functionality as if it were the facade, as they are the same thing. I use `allows` here, but you can use `can` or other methods. You should focus on Authorization over how it is implemented, as this is a minor detail for your application at the end of the day.

So we know how we want the data to be represented in the API and how we want to authorize users in the application. Next, we can look at how we might handle write operations.

When it comes to our API, write operations are vital. We need to ensure these are fast as they can be so that our API feels snappy.

You can write data in your API in many different ways, but my preferred approach is to use background jobs and return quickly. This means you can worry about the logic around how things are created in your own time rather than your clients. The benefit is that your background jobs can still publish updates through web sockets for a real-time feel.

Let's look at the updated `StoreController` for accounts when we use this approach:

```php
final class StoreController
{
	public function __construct(
		private readonly Gate $access,
		private readonly Authenticatable $user,
	) {}

	public function __invoke(StoreRequest $request): Responsable
	{
		if (! $this->access->allows('store')) {
			// respond with an error.
		}

		dispatch(new CreateAccount(
			payload: NewAccount::from($request->validated()),
			user: $this->user->getAuthIdentifier(),
		));

		// the rest of the controller goes here.
	}
}
```

We are sending our background job a payload of a Data Transfer Object, which will be serialized on the queue. We created this DTO using the validated data and want to send it through the user ID because we need to know who to make this for.

Following this approach, we have valid data and type-safe data being passed through to create the model. In our tests, all we need to do here is ensure that the job is dispatched.

```php
it('dispatches a background job for creation', function (string $string): void {
	Bus::fake();

	actingAs(User::factory()->create())->postJson(
		uri: action(StoreController::class),
		data: [
			'name' => $string,
		],
	)->assertStatus(
		status: Http::ACCEPTED->value,
	);

	Bus::assertDispatched(CreateAccount::class);
})->with('strings');
```

We are testing here to ensure that we pass validation, get the correct status code back from our API, and then confirm that the right background job is dispatched.

After this, we can test the job in isolation because it doesn't need to be included in our endpoint test. Now, how will this be written to the database? We use a `Command` class to write our data. I use this approach because using only Action classes is messy. We end up with 100s of action classes that are hard to parse when looking for a specific one in our directory.

As always, because I love to use Dependency Injection, we need to create the interface we will use to resolve our implementation.

```php
interface CreateNewAccountContract
{
	public function handle(NewAccount $payload, string $user): Model;
}
```

We use the New Account DTO as the payload and pass through the user ID as a string. Typically, I give this as a string; I would use a UUID or ULID for the ID field in my applications.

```php
final class CreateNewAccount implements CreateNewAccountContract
{
	public function handle(NewAccount $payload, string $user): Model
	{
		return DB::transaction(
			callback: fn (): Model => Account::query()->create(
					attributes: [
						...$payload->toArray(),
						'user_id' => $user,
				],
			),
		);
	}
}
```

We wrap our write action in a database transaction so that we only commit to the database if the write is successful. It allows us to roll back and throw an exception should the write be unsuccessful.

We have covered how to transform model data for our response, how to query and write data, as well as how we want to authorize users in the application. The final stage for building a solid API in Laravel is looking at how we respond as an API.

Most APIs suck when it comes to responding. It is ironic as it is perhaps the most essential part of an API. In Laravel, there are multiple ways in which you can respond, from using helper functions to returning new instances of `JsonResponse`. I, however, like to build out dedicated Response classes. These are similar to Query and Command classes, which aim to reduce code duplication but are also the most predictable way to return a response.

The first response I create is a collection response, which I would use when returning a list of accounts owned by the authenticated user. I would also make a collection of other responses, from single model responses to empty responses and error responses.

```php
class Response implements Responsable
{
	public function toResponse(): JsonResponse
	{
		return new JsonResponse(
			data: $this->data,
			status: $this->status->value,
		);
	}
}
```

We first must create the initial response that our response classes will extend. This is because they will all respond in the same way. They all need to return the data and the status code - in the same way. So now, let us look at the collection response class itself.

```php
final class CollectionResponse extends Response
{
	public function __construct(
		private readonly JsonApiResourceCollection $data,
		private readonly Http $status = Http::OK,
	) {}
}
```

This is super clean and easy to implement moving forward, and you can turn the `data` property into a union type to be more flexible.

```php
final class CollectionResponse extends Response
{
	public function __construct(
		private readonly Collection|JsonResource|JsonApiResourceCollection $data,
		private readonly Http $status = Http::OK,
	) {}
}
```

These are clean and easy to understand, so let us look at the final implementation for the `IndexController` for accounts.

```php
final class IndexController
{
	public function __construct(
		private readonly Authenticatable $user,
		private readonly FilterForUserContract $query,
	) {}

	public function __invoke(Request $request): Responsable
	{
		$accounts = $this->query->handle(
			query: Account::query()->latest(),
			user: $this->user->getAuthIdentifier(),
		);

		return new CollectionResponse(
			data: $accounts->paginate(),
		);
	}
}
```

Focusing on these critical areas allows you to scale your API in complexity without worrying about code duplication. These are the key areas that I will always focus on when trying to figure out what is causing a Laravel API to be slow.

This is by no means an exhaustive tutorial or list of what you need to focus on, but following this somewhat short guide, you can set yourself up for success moving forwards.
