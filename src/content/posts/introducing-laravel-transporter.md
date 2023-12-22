---
title: Introducing - Laravel Transporter
pubDate: 2021-06-08
image: introducing-laravel-transporter.png
description: Introducing Laravel Transporter; Streamline your API requests with a powerful OOP approach. Manage API interactions efficiently with class-based requests, offering easy configuration and maintenance for Laravel applications.
---

Sending API requests in any PHP framework has always been a little bit of a manual process, yes you can create an SDK or wrapper - but you are still having to do the same thing.

You pull in the HTTP client, or facade, you configure it in a proceedural way entering the URI you want to send a request to, then tag on the optional extras such as authentication, payload, any additional headers. It is quite a manual process.

A lot of the time you have a specific request you want to send, yes you may slightly adjust things as you go by passing in an identifier etc etc - but in general they remain relatively constant.

This has frustrated me for a while, we have to great lengths to make a lot of our code Object Oriented. Yet, we hadn't tried to do this with API requests. I have been sitting on this question for quite a while, pondering on the possible solutions - how it might look, and how it might be used.

The result of this has turned into my latest Laravel package: [Laravel Transporter](https://github.com/JustSteveKing/laravel-transporter) which I describe as:

> Transporter is a futuristic way to send API requests in PHP. This is an OOP approach to handle API requests.

Quite a bold statement, so let me dig in.

To get started all you need to do is install it, theres no configuration required nothing extra to add to your project - it will only be used when you want to use it.

Then, let's take an example API request:

```bash
GET https://jsonplaceholder.typicode.com/todos?completed=true HTTP/1.1
```

All we are doing here is filtering a list of todos that are completed - nothing overly difficult.

Firstly let us have a look at how we would do this usually (but let's pretend this API required us to be authenticated using an API token we have previously generated).

```php
Http::withToken(config('jsonplaceholder.api.token'))
->get("https://jsonplaceholder.typicode.com/todos", [
    'completed' => 'true',
]);
```

Not terrible right? I mean, it works and does what you might expect. But, this is very proceedural. What happens if the URL changes? What happens if the query parameters change? We have to hunt through our code base, and update these everywhere. You know, the thing we are trying to avoid more and more in everything we build.

Let's add a little magic to these requests and see how we would send this exact same request using Laravel Transporter:

```php
TodoRequest::build()->send();
```

That's it. The entire thing condensed into a class. Let's look how we got there.

First thing we do, create our request:

```bash
php artisan make:api-request TodoRequest
```

This gives us `app/Transporter/TodoRequest.php`, inside there we have:

```php
<?php

declare(strict_types=1);

namespace App\Transporter;

use Illuminate\Http\Client\PendingRequest;
use JustSteveKing\Transporter\Request;

class TodoRequest extends Request
{
    protected string $method = 'GET';
    protected string $baseUrl = 'https://jsonplaceholder.typicode.com';
    protected string $path = '/todos';

    protected array $data = [
        'completed' => true,
    ];

    protected function withRequest(PendingRequest $request): void
    {
        $request->withToken(config('jsonplaceholder.api.token'));
    }
}
```

Going back to the original problem, if options change - we have to hunt everywhere in our application for where we may have used it. That problem has been solved by moving this to a class based request. Also, as the request itself is just a fancy wrapper around Laravels inbuilt `PendingRequest` - we can call all the same methods before and after sending. Meaning there is no new API to learn, so it is relatively straight forward. You can override options at runtime too - want to show not completed todos?

```php
TodoRequest::build()->withData([
    'completed' => false,
])->send();
```

This may not be a ground breaking package that is going to change the world, however what it is going to do is make you start asking the question: Could I send API requests in a more structured and organised way?

Imagine a scenario, where you needed to work with a 3rd party API. You could quite quickly generate a series of requests and it will be done! Let's take the example of Laravel Forge, which if you remember I wrote about before when I released PHP-SDK [here is that article](https://www.juststeveking.uk/adventures-in-php-php-sdk-builder/).

First we can generate a base API request:

```bash
php artisan make:api-request Forge\\ForgeRequest
```

Then make these changes:

```php
<?php

declare(strict_types=1);

namespace App\Transporter\Forge;

use Illuminate\Http\Client\PendingRequest;
use JustSteveKing\Transporter\Request;

class ForgeRequest extends Request
{
    protected string $baseUrl = 'https://forge.laravel.com/api/v1';

    protected function withRequest(PendingRequest $request): void
    {
        $request->withToken(config('services.forge.token'));
    }
}
```

Next let's take the example of getting all servers. Generate a new request for this request:

```bash
php artisan make:api-request Forge\\Servers\\ListServers
```

Then make the following changes:

```php
<?php

declare(strict_types=1);

namespace App\Transporter\Forge\Servers;

use App\Transporter\Forge\ForgeRequest;
use Illuminate\Http\Client\PendingRequest;

class ListServers extends ForgeRequest
{
    protected string $method = 'GET';

    protected string $path = '/servers';
}
```

All we have done here is used inheritance to extend the ForgeRequest which contains our initial state for every request we need - and allows us to build upon that where we want to.

Thanks for reading, I welcome any feedback that may assist in pushing this package forward and making it easier to use! Feel free to start a discussion or open an issue on the [GitHub Repository](https://github.com/JustSteveKing/laravel-transporter) or even drop me a tweet/DM on [twitter](https://twitter.com/JustSteveKing).