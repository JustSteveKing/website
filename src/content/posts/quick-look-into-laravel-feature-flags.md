---
title: Quick Look into Laravel Feature Flags
pubDate: 2021-09-28
image: quick-look-into-laravel-feature-flags.png
description: Discover Laravel Feature Flags, a powerful package for feature flag management in Laravel applications. Control feature access with ease.
---

Not that long ago I published my latest package, [Laravel Feature Flags](https://github.com/JustSteveKing/laravel-feature-flags), which is a simple to use feature flag implementation for Laravel.

The main concept for this package, was to allow grouping of users who you want to enable upcoming features for, or you simply want to control access to certain parts of your application based on more than just roles and permissions.

Take the example that you have a product that you have launched to paying customers, you are currently working on a few new features but want to do some specific user testing. You invite a small group of active users to partake in a beta program, so that you can get quick feedback and fine tune any functionality before pushing a wider release out.

This is why I created Laravel Feature Flags. I wanted to go beyond just Roles and Permissions and messing anything up internally for Gating access to things.

To get started, add the `JustSteveKing\Laravel\FeatureFlags\Concerns\HasFeatures` Trait to your `User` model:

```php
<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use JustSteveKing\Laravel\FeatureFlags\Concerns\HasFeatures;

class User extends Authenticatable
{
    use HasFeatures;
}
```

What this will allow you to do is add users to feature groups, and also assign them specific feature access - much like you would with roles and permissions.

## Adding a user to a group

You can add a user to a feature group very easily by using the following approach, however if the group does not yet exist it will create it first - so be careful you check your spellings etc.

```php
auth()->user()->addToGroup('group-name');
```

Alternatively you can simply join a group:

```php
auth()->user()->joinGroup('group-name');
```

## Checking if already in group

You can use this simple check to see if your user is in a group:

```php
auth()->user()->inGroup('group-name');
```

If you want to control a part of your UI, you can use the blade helper:

```php
@featuregroup('group-name')

@endfeaturegroup
```

## What if I have an API?

No worries, I got you covered! One of my biggest bug bears with existing solutions was that they aren't flexible, offered no Blade helpers, but also - they didn't think about APIs. I have added 2 lots of middleware to this package now, allowing you to control web routes and API route access on a feature level.

To enable it, simply add the following to your Http Kernel:

```php
protected $routeMiddleware = [
    'feature' => \JustSteveKing\Laravel\FeatureFlags\Http\Middleware\FeatureMiddleware::class,
    'feature-group' => \JustSteveKing\Laravel\FeatureFlags\Http\Middleware\GroupMiddleware::class,
];
```

What this will allow you to do is limit access to routes based on specific features, or feature groups:

```php
Route::middleware(['feature:run-reports,print reports'])->group(/* */);
Route::middleware(['feature-group:beta-testers,internal,developer advocates'])->group(/* */);
```

This is also configuration driven, allowing you to choose how to handle unauthorised access. You can set your config to be in "abort" mode meaning that the application will halt and a configured status code will be thrown - allowing you to choose a 403 or 404. Or you can set this into "redirect" mode simply avoiding any issues and redirecting to a configured route; perhaps a form letting them request access etc etc.

I'd love to get some more feedback on this package, so feel free to [check it out on GitHub](https://github.com/JustSteveKing/laravel-feature-flags) and drop me any issues if you think there could be improvements or anything added!