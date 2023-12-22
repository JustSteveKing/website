---
title: Testing JSON:API Endpoints with PestPHP
pubDate: 2023-02-10
image: testing-json-api-endpoints-with-pestphp.png
source: https://laravel-news.com/testing-json-api-endpoints-with-pestphp
partner: Laravel News
description: Efficient JSON:API Endpoint Testing with pestPHP - Learn how to effectively test JSON:API endpoints in Laravel using pestPHP.
---

JSON:API provides many options for filtering, sorting, and including extra data into the requested data using query parameters. Testing this can be frustrating - but in this tutorial, I will walk through how I approach testing these endpoints.

Let's take an example of an endpoint where we want to get a list of Projects, which has the following data model:

```yaml
Project:
  attributes:
    id: string
    name: string
    description: text
    status: string (Enum: planning, in-progress, in-testing, done)
    active: boolean
  relationships:
    owner: BelongsTo (User)
    client: BelongsTo (Client)
```

I won't show the code for the controller, as that is somewhat subjective. However, we should return a JSON:API Resource inside a JSON Response. Let's have a quick look at the query, which will be based on my previous tutorial on [Effective Eloquent](https://laravel-news.com/effective-eloquent).

```php
final class FetchProjectsByUser
{
	public function handle(Builder $builder, string $user): Builder
	{
		return QueryBuilder::for(
			subject: $builder,
		)->allowedIncludes(
			includes: ['owner', 'client'],
		)->allowedFilters(
			filters: ['status', 'active'],
		)->where(
			'user_id',
			$user,
		)->getEloquentBuilder();
	}
}
```

From here, we can start testing the endpoint to ensure all options are available. We want to get all projects, all that are or aren't active, of various statuses, and we want to ensure that we can include both the owner and client information should it be requested. But how about the unhappy path tests?

My first test when working with endpoints like this is ensuring unauthenticated users cannot access it. These tests assume that the controller we want to use is called `IndexController`.

```php
it('returns the correct status code if unauthenticated', function (): void {
	getJson(
		uri: action(IndexController::class),
	)->assertStatus(
		status: Http::UNAUTHORIZED->value,
	);
});
```

This test is a must-add, ensuring that you can access the endpoint or not access the endpoint based on whether you are logged in or not. We can then test to ensure we get the correct status code if logged in.

```php
it('returns the correct status code for users', function (): void {
	actingAs(User::factory()->create())->getJson(
		uri: action(IndexController::class),
	)->assertStatus(
		status: Http::OK->value,
	);
});
```

These more straightforward tests are often overlooked and should be added to ensure you get the simple things right. In the past, I have skipped these, assuming that things would work - only to find that I was causing an issue with some code I added that was forcing 500 errors on specific endpoints. Next, we can jump into testing more JSON:API specific features.

```php
it('can fetch the projects client', function (): void {
	actingAs(User::factory()->create())->getJson(
		uri: action(IndexController::class, [
			'include' => 'client',
		]),
	)->assertStatus(
		status: Http::OK->value,
	)->assertJson(fn (AssertableJson $json) => $json
		->first(fn (AssertableJson $json) => $json
			->has('relationships.client')
			->etc()
		)
	);
});
```

We want to test that the relationship exists here, as we will not get complete information, including this relationship, just enough to know what to request for specifics. This is part of the design of JSON:API, though.

The next step is filtering the API, ensuring we can fetch specific projects based on the filterable attributes we added to our query.

```php
it('can filter to active projects only', function (): void {
	actingAs(User::factory()->create())->getJson(
		uri: action(IndexController::class, [
			'filter[active]' => true,
		]),
	)->assertStatus(
		status: Http::OK->value,
	)->assertJson(fn (AssertableJson $json) => $json
		->each(fn (AssertableJson $json) => $json
			->where('attributes.active', true)
			->etc()
		)
	);
});
```

We can apply this approach to any filters we might use for our endpoints, allowing anyone working with our API to get precisely the data they need.

How do you go about testing your API endpoints? This is a simple guide to test JSON:API endpoints in Laravel using pestPHP. The principles can be applied to any other tests you may need to do within your API.
