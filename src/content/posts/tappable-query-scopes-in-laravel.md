---
title: Tappable Query Scopes in Laravel
pubDate: 2022-05-06
image: tappable-query-scopes-in-laravel.png
description: Enhance Laravel Query Scopes with Tappable Query Scopes - Learn about tappable query scopes in Laravel, a clean way to apply multiple scopes.
---

I recently saw an awesome tweet while browsing twitter which introduced this idea of tappable query scopes, and wanted to share it and dig into it a little more. The idea originally came from a PR on the laravel/framework repo in the comments [link here](https://github.com/laravel/framework/pull/42111#issuecomment-1116944244).

What is does is allow you to create class based scopes that are invokable, and are called using the tap() method in Laravel, it looks a little like the below:

```php
class MatchingEmail
{
    public function __construct(
        protected readonly string $email,
    ) {}

    public function __invoke(Builder $query): void
    {
        $query->where('email', $this->email);
    }
}

User::query()->tap(new MatchingEmail('taylor@laravel.com'))->get();
```

Now if we step back a minute, and look at it. It is an amazing idea! It looks incredible, and I am wondering how it could be taken a step further? Let’s dig in.

I have a project locally called `laravel-playground` that I use to test out packages and ideas, it is very much worth doing! It allows me to test these ideas without it effecting any projects I might already have.

So what we have is an invokable class that acts like a callable that we can simply call to extend the query we are building. So in effect the above example could use the below:

```php
User::query()->tap(function (Builder $query) {
    $query->where('email', 'taylor@laravel.com');
})->get();
```

But what if we want to call multiple scopes on a query? Do we want to do something like the following:

```php
User::query()
    ->tap(new MatchingEmail('taylor@laravel.com'))
    ->tap(new ActiveUser())
    ->get();
```

While this is still quite clean, adding multiple tap calls on the query is going to start to get confusing. So I played around with a little bit of code that allows me to do the following:

```php
User::query()->filter(
    new MatchingEmail('taylor@laravel.com'),
    new ActiveUser()
)->get();
```

So what we are doing is passing in multiple callables so that we can iterate over them and apply them to the current builder instance. To do this all we have to do is create a new Macro for Illuminate\Database\Eloquent\Builder

```php
Builder::macro('filter', function (...$scopes): Builder {
    collect($scopes)->each(function ($scope)  {
        $this->tap($scope);
    });
    return $this;
});
```

So we are extending the Builder and adding the filter method. This allows us to pass in a variadic list of callables to then collect and iterate over (this could be a foreach if you want) and then we call the tap method behind the scenes to apply the scope changes. eventually returning the builder instance back.
