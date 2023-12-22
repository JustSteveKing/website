---
title: Managing Routes in a large Laravel Application
pubDate: 2023-02-17
image: managing-routes.png
source: https://laravel-news.com/managing-routes
partner: Laravel News
description: Learn strategies like Route Service Provider, File Requires, and Route Groups for managing routes in a large Laravel application.
---

Laravels routes files can get pretty busy. Before you know it, you have to search within the routes file to find anything. How do you combat this, though? 

You can approach this in many ways, depending on how you would prefer to approach it. In this tutorial, I will walk through a few of the options I have seen and then finish on how I approach this and why I approach it this way.

I will use a simple example, but you can use your imagination a little! Imagine we are building an API application that allows customers to order online from a catalog and enable their customers to track shipments.

### Route Service Provider

Using the route service provider, you can easily add additional route entries. Let's take a look at an example:

```php
class RouteServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->configureRateLimiting();

        $this->routes(function (): void {
            Route::middleware('api')
                ->group(base_path('routes/api.php'));
        });
    }
}
```

This is similar to the default `RouteServiceProvider` you get within your Laravel Project. Yours may differ depending on the age of your application. How can we extend this? We can add extra route loading in the provider:

```php
class RouteServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->configureRateLimiting();

        $this->routes(function (): void {
            Route::middleware('api')
                ->group(base_path('routes/api.php'));

            Route::middleware('api')
                ->group(base_path('routes/resource/catalog.php'));

            Route::middleware('api')
                ->group(base_path('routes/resource/orders.php'));

            Route::middleware('api')
                ->group(base_path('routes/resource/payments.php'));

            Route::middleware('api')
                ->group(base_path('routes/resource/deliveries.php'));
        });
    }
}
```

This isn't aimed to be perfectly accurate. I am using this more as an example with a few moving parts that are likely to have at least 75+ routes. So here we are managing this within the `RouteServiceProvider` so everything is central in how we load in routes. The biggest issue I have found with this approach is that when in a routes file, you need to know what else is being loaded in. I previously worked on a very large application that used this approach, and it took a lot of mental effort to keep coming back to see if the routes were being loaded in and if they were in an order that could cause issues.

When opening up a Laravel project for the first time, you pay attention to a few key areas: Eloquent Modes, Routes, and Tests. You open the routes file and look at the routes registered to understand the application size and how things are put together.

## Requiring the File

If you install Laravel Breeze, you will notice that it adds the following to your `routes/web.php` file:

```php
require __DIR__ . '/auth.php';
```

This loads in the authentication routes that come with the package, allowing you to keep your service provider more minimal and understand how many additional files need to be checked for looking at all routes. Let's take our above example and add the routes in this approach:

```php
// The rest of your `routes/api.php` file

require __DIR__ . '/resource/catalog.php';
require __DIR__ . '/resource/orders.php';
require __DIR__ . '/resource/payments.php';
require __DIR__ . '/resource/deliveries.php';
```

This, to me, is an improvement on the Service Provider approach, as you are likely to have better visibility in your application when going through the route files. However, requiring the files is something that I hate seeing. It just feels messy and lazy.

The benefits are that you can see things required to load in all of the routes in one simple place where you expect to see routes. The downside, however, is that it is just a required method that loads the file when this script is executed. 

To me, this can be improved upon quite a bit. There is no information here saying what the URL structure might be like or any additional middleware you know is being applied to all routes.

### Route Groups

This is my preferred approach. We see them being used in the `RouteServiceProvider`, which is where I got the idea from. The basic principle here is that in your main routes file (`routes/api.php` in our case), we build our route groups like we would if we were adding our routes manually and then tell that group it needs to use a separate file.

```php
// The rest of your `routes/api.php` file

Route::prefix('catalog')->as('catalog:')->middleware(['auth:sanctum'])->group(
    base_path('routes/resources/catalog.php'),
);

Route::prefix('orders')->as('orders:')->middleware(['auth:sanctum'])->group(
    base_path('routes/resources/orders.php'),
);

Route::prefix('payments')->as('payments:')->middleware(['auth:sanctum'])->group(
    base_path('routes/resources/payments.php'),
);

Route::prefix('deliveries')->as('deliveries:')->middleware(['auth:sanctum'])->group(
    base_path('routes/resources/deliveries.php'),
);
```

As you can see from the above, we are just using the `base_path` helper function to load the routes in the right place. Looking at the routes file, we can see the groups building up your application, but it isn't taking over the file - even if you end up with 20-30 groups, it is still pretty readable.

From here, we can manage "resources" and "sub-resources" in the dedicated routes file, meaning fewer class name classes during imports and having dedicated files that you can easily understand in isolation or within the content of your entire application.

How do you combat the cognitive load of an extensive routes file? Have you found an interesting way you would like to share? Let us know on Twitter.
