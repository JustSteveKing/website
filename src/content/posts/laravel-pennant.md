---
title: Laravel Pennant
pubDate: 2023-02-10
image: laravel-pennant.png
source: https://laravel-news.com/laravel-pennant
partner: Laravel News
description: Laravel Pennant in Laravel 10; Manage Feature Flags easily. Perfect for A/B testing, incremental rollouts, and more.
---

Laravel Pennant is a package created by the Laravel team that will arrive with [Laravel 10](https://laravel-news.com/laravel-10) provides Feature Flags for your applications. 

> Feature flags enable you to incrementally roll out new application features with confidence, A/B test new interface designs, compliment a trunk-based development strategy, and much more.

[This package](https://laravel.com/docs/10.x/pennant) is the latest in the lineup of official packages provided by the core team and means that we now have a well-built and well-tested package that provides us with some great functionality.

Breaking down the package's features, we can look into what this package gives us.

Creating a new feature is a simple process of defining it with your `AppServiceProvider` like so:

```php
public function boot(): void
{
    Feature::define('beta-testers', fn (User $user) => match (true) {
        $user->isBetaTester() => true,
        default => false,
    });
}
```

This is a super clean and easy way to define features in your application. However, you can also use a class-based approach to your features:

```php
class BetaTesters
{
    public function resolve(User $user): mixed
    {
        return match (true) {
            $user->isBetaTester() => true,
            default => false,
        };
    }
}
```

Looking through the documentation, I see that there will be many exciting ways this could be used. Let's look at one example from the documentation and see what we can do with it.

```php
class PodcastController
{
    public function index(Request $request): Response
    {
        return Feature::when(NewApi::class,
            fn () => $this->resolveNewApiResponse($request),
            fn () => $this->resolveLegacyApiResponse($request),
        );
    }
} 
```

Moving forward, this works well for a versioned API - you can control where the request is meant to go based on whether the user has access. Let's expand upon this example.

```php
class PodcastController
{
    public function __construct(
        private readonly RedirectAction $action,
    ) {}

    public function index(Request $request): Response
    {
        return Feature::when(BetaTester::class,
            fn () => $this->action->handle('v2'),
            fn () => $this->action->handle('v1'),
        );
    }
}
```

We could use our action to redirect to the correct API route based on whether or not the use is a beta tester. We could move this a layer higher into middleware to make this simpler.

```php
class VersionMiddleware
{
    public function handle(Request $request, Closure $next): mixed
    {
        if (Feature::active('beta-tester')) {
            return new RedirectResponse(
                uri: 'generate the url here',
            );
        }

        return $next($request);
    }
}
```

As you can imagine, what you will be able to do with [this package](https://laravel.com/docs/10.x/pennant) will only be limited by your imagination. I cannot wait to use this package and see what improvements it allows me to add to my application.
