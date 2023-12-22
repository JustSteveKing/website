---
title: Effective Eloquent
pubDate: 2022-12-20
image: effective-eloquent.png
source: https://laravel-news.com/effective-eloquent
partner: Laravel News
description: Explore advanced Eloquent querying in Laravel with a focus on efficient ORM usage for a banking app, including user accounts and transactions management.
---

Get ready to level up your Laravel skills with this tutorial on eloquent queries! You'll learn everything you need to know, from beginner to advanced techniques.

To begin with, let's take a step back and think about what Eloquent is. Eloquent is an Object Relational Mapper for Laravel and a Query Builder. You can use the ORM to work with Eloquent Models to query your database fluently and effectively. You can also use the Query Builder through the database facade to manually build up your queries.

What are we going to be querying today? I have an application I have been working on for my [Laracon EU](https://laracon.eu/) talk, which is a bank application - exciting, I know. But it introduces some interesting options when it comes to querying data.

The data we are working with; a User can have many Accounts. Each Account has a running balance stored on it. Each Account has many Transactions and the Transaction links between the Account and a Vendor along with the amount the transaction was for. You can see a [SQL diagram for this here](https://drawsql.app/teams/laravel-news/diagrams/acme-bank) if you want to see a visual representation.

<iframe width="100%" height="500px" style="box-shadow: 0 2px 8px 0 rgba(63,69,81,0.16); border-radius:15px;" allowtransparency="true" allowfullscreen="true" scrolling="no" title="Embedded DrawSQL IFrame" frameborder="0" src="https://drawsql.app/teams/laravel-news/diagrams/acme-bank/embed"></iframe>

In my talk for Laracon, I am doing something specific with the queries as it focuses on the API itself. However, there are many other queries we could be using - so let us take a walk through them.

To get all accounts for a user that is logged in, we can write this quite simply like the following:

```php
use App\Models\Account;

$accounts = Account::where('user_id', auth()->id())->get();
```

Typically we would write this query in our controller and return the results. I won't go into the response mechanisms for this tutorial - as I don't want to give too much away. However, there could be multiple places where we want to run the same query for the same reason. For example, if we were building an internal dashboard and wanted to see the accounts for a user from an admin perspective.

To begin with, my personal bugbear is not starting a new Eloquent Builder for each query - it is so easy to do. It allows you full IDE completion without any additional files needed. To do this, we make the first part of our query a static call to `query`.

```php
use App\Models\Account;

$accounts = Account::query()->where('user_id', auth()->id())->get();
```

It is a simple addition to your query that takes no time and provides much better benefits than constantly forwarding static calls. This is a standard query you might be used to seeing in applications, and some would say it is fine as it is - and they would be right. It does exactly what you need it to do.

Instead of using the ORM, we could use the DB facade to run this query - which is, of course, lighter in memory usage and will be a fraction quicker to return. The likelihood of you seeing the speed difference is very low unless you have large datasets. However, let's have a look at this query.

```php
use Illuminate\Support\Facades\DB;

$accounts = DB::table('accounts')->where('user_id', auth()->id())->get();
```

In my tests, the DB facade used much less memory, but this is because it returns a collection of objects. Whereas the ORM query will return a collection of Models that need to be built and stored in memory. So we are paying for the convenience of having an Eloquent Model available.

Let us move forward. In my example, I have a controller that runs this query inline and returns the results. I have already mentioned that this query could be reused in other application areas, so what can I do to make sure I can control these queries more globally? Query classes to the rescue! 

This is a pattern I use pretty heavily and something you should at least entertain if you aren't going to adopt it. It is a trick I learned from the CQRS world, where read operations are classed as `Queries` and write operations are `Commands`. What I like about CQRS is its ability to segregate the logic between what the controller needs to know about and a class dedicated to simply querying data. Let's take a look at this class.

```php
final class FetchAccountsForUser implements FetchAccountsForUserContract
{
    public function handle(string $user): Collection
    {
        return Account::query()
            ->where('user_id', $user)
            ->get();
    }
}
```

This is a single query class that does just one thing, and in typical Steve fashion, it uses a contract/interface so that I can move this over to the container and resolve the query where I need to. So now, in our controller, we only need to run the following:

```php
$accounts = $this->query->handle(
    user: auth()->id(),
);
```

What benefits do we have doing things this way? For one, we are separating the logic into a dedicated class. If the scope of how we fetch Accounts for a user changes, we can easily update this across our codebase.

So when querying data in your applications, a lot of the time, you will notice that the queries aren't all that dynamic. Yes, the values you want to pass in will be dynamic, based on the users' input. However, the queries will only sometimes change. This is only sometimes true; for example, an API endpoint with options for including relationships, filtering, sorting results, etc.

We have introduced a new problem to our application. How can we support dynamic and non-dynamic queries in our application without having different workflows? So far, we have refactored to use a query class dedicated to running a query and returning our result.

I can combat this by passing a query builder into the query class, allowing me to make a dynamic part of what I need into something more static. Let's look at how we might approach this.

```php
final class FetchTransactionForAccount implements FetchTransactionForAccountContract
{
    public function handle(Builder $query, string $account): Builder
    {
        return $query->where('account_id', $account);
    }
}
```

Then we would call this inside of our controller in the following way.

```php
public function __invoke(Request $request, string $account): JsonResponse
{
    $transactions = $this->query->handle(
        query: Transaction::query(),
        account: $account,
    )->get();
}
```

We can achieve this by passing in `Transaction::query()` in our controller and the reference ID for the Account. The query class returns a query builder instance, so we need to return `get` on the result. This simplistic example may not highlight the benefits exceptionally well, so I will walk through an alternative.

Imagine we have a query where we always want to be returning a selection of relationships and apply scopes. For example, we want to show the most recent accounts for a user, with a total count of transactions.

```php
$accounts = Account::query()
    ->withCount('transactions')
    ->whereHas('transactions', function (Builder $query) {
        $query->where(
            'created_at',
            now()->subDays(7),
        )
    })->latest()->get();
```

Inline, this is a reasonable query. But if we have this in several places, and we suddenly need to start extending this to add additional scopes or only showing accounts that have been active within 30 days ... You can imagine how quickly this may grow.

Let's look at how this works in a query class approach.

```php
final class RecentAccountsForUser implements RecentAccountsForUserContract
{
    public function handle(Builder $query, int $days = 7): Builder
    {
        $query
            ->withCount('transactions')
            ->whereHas('transactions', function (Builder $query) {
                $query->where(
                    'created_at',
                    now()->subDays($days),
                )
            });
    }
}
```

When we come to implementing this:

```php
public function __invoke(Request $request): JsonResponse
{
    $accounts = $this->query->handle(
        query: Account::query()->where('user_id', auth()->id()),
    )->latest()->get();

    // handle the return.
}
```

A lot cleaner, and as we have a dedicated class for the main bulk of the query - it is very repeatable.

Is this needed, though? I know many people would simply add this to a specific method on the model, and it would be fine. But then we will be making our models bigger with each request to change this, as we all know we are more likely to add a helper method than replace it. Approaching this way makes you measure the benefits of adding it over extending what you have. Before you know it, 30 of these helper methods are on your model, which must be added to every model that comes back in a collection.

What if we wanted to move to use the DB facade across our entire application? Suddenly we have a lot of logic that needs changing in many places, and our outcomes become very unpredictable. Let's look at what this query using the DB facade would look like.

```php
$latestAccounts = DB::table(
    'transactions'
)->join(
    'accounts',
    'transactions.account_id', '=', 'accounts.id'
)->select(
    'accounts.*',
    DB::raw(
        'COUNT(transactions.id) as total_transactions')
)->groupBy(
    'transactions.account_id'
)->orderBy('transactions.created_at', 'desc')->get();
```

How about we break this up into this query class?

```php
final class RecentAccountsForUser implements RecentAccountsForUserContract
{
    public function handle(Builder $query, int $days = 7): Builder
    {
        return $query->select(
            'accounts.*',
            DB::raw('COUNT(transactions.id) as total_transactions')
        )->groupBy('transactions.account_id');
    }
}
```

Then in our implementation, it would look like the following:

```php
public function __invoke(Request $request): JsonResponse
{
    $accounts = $this->query->handle(
        query: DB::table(
            'transactions'
        )->join(
            'accounts',
            'transactions.account_id', '=', 'accounts.id'
        )->where('accounts.user_id', auth()->id()),
    )->orderBy('transactions.created_at', 'desc')->get();

    // handle the return.
}
```

It is quite a significant change. However, we can do it in stages and simultaneously test each small part. This benefit is that we can use the same query for one user, a selection of users, or all of our users - and the query class will not need to change. 

Overall, what we have done is create something that is like scopes but less tied to the Eloquent Builder itself.

This is how I like to manage my Eloquent queries in my applications, as it allows me to have repeatable parts that can be tested in isolation against various incoming options. I like to think of this as an effective approach to writing queries, but it isn't for everyone - my [recent article with Matt Stauffer](https://laravel-news.com/two-developers-approach-the-same-problem) proves that! Everything I just did can be achieved using helper methods on models or even query scopes - but I like my models to be light and my scopes to be lightweight and specific too. Adding too much logic to one scope feels wrong to me. It doesn't feel like it belongs here. I may be wrong, of course, and I am always happy to accept that my way isn't the only way to approach it.
