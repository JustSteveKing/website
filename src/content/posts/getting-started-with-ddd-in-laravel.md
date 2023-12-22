---
title: Laravel DDD - Getting started with DDD in Laravel
pubDate: 2022-05-03
image: getting-started-with-ddd-in-laravel.png
description: Master Laravel DDD with ease; Learn how to enhance your Laravel applications by implementing Domain Driven Design for improved structure and maintainability.
---

In a typical Laravel application we are very used to doing things in a certain way, by the book as they say. However there comes a point in the applications lifetime that it is going to be easier to start looking to split this code into Domains so that we can logically group our code.

Our first step is to decide what is our domain code and what is our application code, and the simplest way to do that is to keep anything that can be directly accessed from the outside world (as in web, cli or API) inside of the `App` namespace. From here we can start to define our domain boundaries, try to think of these in broader terms that just “A post must be in the Post domain” as you aren’t solving any problems at that point.

Let’s take an example of an agency website it has a blog, portfolio and contact form. It isn’t a complicated build and isn’t likely to require a transition to Domain Driven Design - but it is something we can understand easily without complicating DDD by application logic. We can start by splitting our domains into:

    - Blogging
    - Work
    - Communication

Our blogging domain contains anything to do with blog posts and categories, our work domain is all about portfolio items and case studies, and our communication domain is form submissions and any outside communications required such as sending tweets.

Inside of our `composer.json` we will want to autoload our namespace for Domains, to make sure we can load these easily. To do this we need to add a few more namespaces:

```json
"autoload": {
    "psr-4": {
        "App\\": "app/",
        "Database\\Factories\\": "database/factories/",
        "Database\\Seeders\\": "database/seeders/",
        "Domains\\": "src/Domains",
        "Infrastructure\\": "src/Infrastructure"
    }
},
```

As you can see I have created 2 new top level namespaces, `Domains` and `Infrastructure`. Inside domains is where we will keep all domain specific code, and inside infrastructure is where I would typically keep all interfaces/contracts that I am binding inside my application. This is not the only way you can do this, however it is what I have found works for me.

The next thing we want to make sure that we do is create a Service Provider for each domain. You may be asking yourself why at this point, and it is understandable, at first I wasn’t sure on this. However after spending some time working with it, it started to make a lot more sense.

An example of the Service Provider will look like this:

```php
<?php

declare(strict_types=1);

namespace Domains\Blogging\Providers;

use Illuminate\Support\ServiceProvider;

class BloggingServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // more will go here later
    }
}
```

Carrying on from our example above, let me show you what your config/app.php providers array should have by the end of it:

```php
<?php

return [
    'providers' => [
        // All others that come with Laravel
   
        /*
         * Domain Service Providers
         */
        Domains\Communication\Providers\CommunicationServiceProvider::class,
        Domains\Blogging\Providers\BloggingServiceProvider::class,
        Domains\Work\Providers\WorkServiceProvider::class,
    ]
];
```

This allows us, using configuration, to turn domains on and off simply by commenting our the service provider. It also allows us to add entire domains easily.

Now that we have our domains being loaded through composer, and our Laravel application is aware of the service providers for each domain - we are ready to write actual domain code.
