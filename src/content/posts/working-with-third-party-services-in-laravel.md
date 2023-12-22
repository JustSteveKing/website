---
title: Working with third party services in Laravel
pubDate: 2021-04-30
description: Learn how to work with 3rd party services in Laravel, focusing on connecting to the PingPing API. Improve your Laravel skills today!
image: working-with-third-party-services-in-laravel.png
---

I have been working with 3rd party APIs for longer than I care to admit, over
time I have found a few ways that work nicely for me. In particular when
working with a Laravel application, it is always good to define a standard for
how you do things. Not only is this good practice in general, but it also
makes it predictable when you are trying to add or update or debug anything.
By following a standard, you know how your projects work from one to another.

In this article, I am going to walk through how I connect and work with 3rd party APIs - what has worked for me and how I like to approach this task. I am going to walk through how to connect to the [PingPing](https://pingping.io/) API in your Laravel project, and how you can use it to start getting the monitoring information from your websites.

This article is using **Laravel 8** and **PHP 8**, please do not follow this exactly if you are on lower versions - you will have to slightly adapt.

Firstly, set up a new Laravel project, or use an existing one if you want to add a service onto your existing app. What we need to do is create a new namespace for where our 3rd party APIs will live. I typically store these under `App\Services` as it makes the most sense to me. From there we want to create the namespace for the API we are working with. Create another directory, so it should look like this: `app/Services/PingPing`.

The first thing we want to do in this directory is to create a Client that we can use to connect to the API, create a class called `Client` that looks like this:

```php

namespace App\Services\PingPing;


class Client
{

    //

}
```

Next, we want to build up our constructor so that it accepts a few default parameters:

```php
public function __construct(
    protected string $uri,
    protected string $token,
) {}
```

What we are going to do with this part, is use a Laravel Service Provider to pull some configuration options and pass them into the constructor when we resolve this class from the container.

In your terminal, create a new Service Provider like: `php artisan make:provider PingPingServiceProvider`. If all went well, you should now have a file under `app/Providers/PingPingServiceProvider`. Now we are going to add our Client into the `register` method so that we can register our Service into the container. Your Service Provider should now look like this:

```php
namespace App\Providers;

use App\Services\PingPing\Client;
use Illuminate\Support\ServiceProvider;

class PingPingServiceProvider extends ServiceProvider
{
    public function register()
    {
        $this->app->singleton(Client::class, function ($app) {
            return new Client(
                uri: config('services.ping-ping.uri'),
                token: config('services.ping-ping.token'),
            );
        });
    }

    public function boot()
    {
        //
    }
}
```

As you can see from the service provider, we also need to add some config values to our `config/services.php` file and `.env` file:

```php
return [
    'ping-ping' => [
        'uri' => env('PING_PING_API_URI', 'https://pingping.io/webapi'),
        'token' => env('PING_PING_API_TOKEN'),
    ],
];
```

Next we need to register our service into our Laravel application, by adding this Service Provider in `config/app.php` under 'providers':

```php
return [
    'providers' => [
        /*
        * Application Service Providers...
        */
        App\Providers\AppServiceProvider::class,
        App\Providers\AuthServiceProvider::class,
        // App\Providers\BroadcastServiceProvider::class,
        App\Providers\EventServiceProvider::class,
        App\Providers\RouteServiceProvider::class,
        App\Providers\PingPingServiceProvider::class,
    ],
];
```

So, now we have a basic service set up. We have the environment variables and the config all sorted, we have a Client class which is registered into our container using our Service Provider. We have the beginnings of an API integration.

Our next step is to start working with the API. You can read the PingPing documentation [here](https://docs.pingping.io/) if you would like to, but I will walk you through it too.

Firstly, when working with 3rd party APIs, you want to be able to tests working against the API without sending loads of requests. In laravel you can use the Http facade and the `fake()` method to achieve this which is quite nice. However, I like to add this as a method on my Clients. To do this, I typically create a trait to handle this as I may be working with multiple APIs in an application - all of which need a fake method. I do this by creating a new directory under `app/Services/Concerns` to follow the Laravel naming convension for traits. Create one that looks like this:

```php
namespace App\Services\Concerns;

use Illuminate\Support\Facades\Http;

trait HasFake
{
    /**
    * Proxies a fake call to Illuminate\Http\Client\Factory::fake()
    * 
    * @param null|callable|array $callback
    */
    public static function fake(
        null|callable|array $callback = null,
    ): void {
        Http::fake($callback);
    }
}
```

As you can see we are simply proxying the fake call through to the Http facade and forwarding any arguments along with them.

Now we just need to pull this trait into our Client class, and we can start faking requests:

```php
namespace App\Services\PingPing;

use App\Services\Concerns\HasFake;

class Client
{
    use HasFake;

    public function __construct(
        protected string $uri,
        protected string $token,
    ) {}
}
```

Now we are set up for testing our API, we can also start building up requests we may want to send. If you look through the documentation for PingPing you will see that you can get a list of monitors stored on your account quite easily. Let's start with this endpoint, and see how we may need to refactor as we go through.

Our first step is to create a new public method on our Client called `monitors` so that we can hit an API endpoint. Your method should look like this:

```php
public function monitors()
{
    $request = Http::withToken(
        token: $this->token,
    );

    $response = $request->get(
        url: "{$this->uri}/monitors",
    );

    if (! $response->successful()) {
        return $response->toException();
    }

    return $response;
}
```

As you can see, we are building up our request with our API token that we injected into our constructor. We then create our response. There are a few things we can do to improve this though.

Currently the exception thrown is a HTML exception, which may not be what we want. Also, we have no retry policy or timeouts set. Lets refactor our Client class to implement these things:

```php
namespace App\Services\PingPing;

use App\Services\Concerns\HasFake;
use Illuminate\Support\Facades\Http;

class Client
{
    use HasFake;

    public function __construct(
        protected string $uri,
        protected string $token,
        protected int $timeout = 10,
        protected null|int $retryTimes = null,
        protected null|int $retryMilliseconds = null,
    ) {}

    public function monitors()
    {
        $request = Http::withToken(
            token: $this->token,
        )->withHeaders([
            'Accept' => 'application/json',
        ])->timeout(
            seconds: $this->timeout,
        );

        if (
            ! is_null($this->retryTimes)
            && ! is_null($this->retryMilliseconds)
        ) {
            $request->retry(
                times: $this->retryTimes,
                sleep: $this->retryMilliseconds,
            );
        }

        $response = $request->get(
            url: "{$this->uri}/monitors",
        );

        if (! $response->successful()) {
            return $response->toException();
        }

        return $response;
    }
}
```

What we are doing now is passing some default values into our constructor so that we can set a default timeout, and how we want to handle any retries. We can now extend our service provider and config to include these values.

Extend your configuration to look like this:

```php
return [
    'ping-ping' => [
        'uri' => env('PING_PING_API_URL', 'https://pingping.io/webapi'),
        'token' => env('PING_PING_API_TOKEN'),
        'timeout' => env('PING_PING_TIMEOUT', 10),
        'retry_times' => env('PING_PING_RETRY_TIMES', null),
        'retry_milliseconds' => env('PING_PING_RETRY_MILLISECONDS', null),
    ],
];
```

Then extend your service provider to look like this:

```php
namespace App\Providers;

use App\Services\PingPing\Client;
use Illuminate\Support\ServiceProvider;

class PingPingServiceProvider extends ServiceProvider
{
    public function register()
    {
        $this->app->singleton(Client::class, function ($app) {
            return new Client(
                uri: config('services.ping-ping.uri'),
                token: config('services.ping-ping.token'),
                timeout: config('services.ping-ping.timeout'),
                retryTimes: config('services.ping-ping.retry_times'),
                retryMilliseconds: config('services.ping-ping.retry_milliseconds'),
            );
        });
    }

    public function boot()
    {
        //
    }
}
```

As you can see we are simply extending how we build our constructor to pull in the new values which we store in out env file - or providing the default NULL if we do not need this.

So back to monitors. We can now confirm we can get a Response back from the API, what can we do with it? This is where we have options, and the one we choose depends on what level of integration we need to build. For example, if we were building an SDK to provide to others we would simply return the Response and let the integrator decide how they want to work with the response in their application. But this is our application, and we are building an integration not an SDK.

What we want to do is using the [Spatie Data Transfer Object Package](https://github.com/spatie/data-transfer-object) create a series of Data Transfer Objects so that we can map the API response to Objects that are valuable to our application, and don't include lots of extra stuff that your typical HTTP request would have.

Let's start with an action to create our monitor under `app/Services/PingPing/Actions/CreateMonitor.php` that should look like this when complete:

```php
namespace App\Services\PingPing\Actions;

use Carbon\Carbon;
use App\Services\PingPing\DTO\Checks;
use App\Services\PingPing\DTO\Uptime;
use App\Services\PingPing\DTO\Monitor;
use App\Services\PingPing\DTO\UptimeMeta;
use App\Services\PingPing\DTO\CertificateHealth;
use App\Services\PingPing\DTO\CertificateHealthMeta;

class CreateMonitor
{
    public static function handle(array $item): Monitor
    {
        return new Monitor(
            id: $item['id'],
            identifier: $item['identifier'],
            alias: $item['alias'],
            scheme: $item['scheme'],
            host: $item['host'],
            port: $item['port'],
            url: $item['url'],
            statusPage: $item['status_page'],
            checks: new Checks(
                uptime: new Uptime(
                    id: $item['checks']['uptime']['id'],
                    status: $item['checks']['uptime']['status'],
                    error: $item['checks']['uptime']['error'],
                    interval: $item['checks']['uptime']['interval'],
                    enabled: $item['checks']['uptime']['is_enabled'],
                    notificationThreshold: $item['checks']['uptime']['notification_threshold'],
                    lastCheckAt: Carbon::parse($item['checks']['uptime']['last_check_at']),
                    meta: new UptimeMeta(
                        httpStatusCode: $item['checks']['uptime']['meta']['http_status_code'],
                        averageUptimePercentage: $item['checks']['uptime']['meta']['average_uptime_percentage'],
                        averageResponseTime: $item['checks']['uptime']['meta']['average_response_time'],
                        offlineSince: Carbon::parse($item['checks']['uptime']['meta']['offline_since']),
                    ),
                ),
                certificateHealth: new CertificateHealth(
                    id: $item['checks']['certificate_health']['id'],
                    status: $item['checks']['certificate_health']['status'],
                    error: $item['checks']['certificate_health']['error'],
                    interval: $item['checks']['certificate_health']['interval'],
                    enabled: $item['checks']['certificate_health']['is_enabled'],
                    notificationThreshold: $item['checks']['certificate_health']['notification_threshold'],
                    lastCheckAt: Carbon::parse($item['checks']['certificate_health']['last_check_at']),
                    meta: new CertificateHealthMeta(
                        issuer: $item['checks']['certificate_health']['meta']['issuer'],
                        signatureAlgorithm: $item['checks']['certificate_health']['meta']['signature_algorithm'],
                        selfSigned: $item['checks']['certificate_health']['meta']['is_self_signed'],
                        validFrom: Carbon::parse($item['checks']['certificate_health']['meta']['valid_from']),
                        validTo: Carbon::parse($item['checks']['certificate_health']['meta']['valid_to']),
                    ),
                ),
            ),
        );
    }
}
```

As you can see from the above we are mapping everything that the API is responding with currently - for your integration you could choose the parts that are important to yourself and expand when needed.

Let's create our Monitor DTO under `app/Services/PingPing/DTO/Monitor.php` which should look like this:

```php
namespace App\Services\PingPing\DTO;

use Spatie\DataTransferObject\DataTransferObject;

class Monitor extends DataTransferObject
{
    public int $id;
    public string $identifier;
    public string $alias;
    public string $scheme;
    public string $host;
    public string $port;
    public string $url;
    public string $statusPage;
    public Checks $checks;
}
```

As you can see in this DTO, we are pulling in a different DTO to handle the checks on a monitor, create this under `app/Services/PingPing/DTO/Checks.php` and it should look like the following:

```php
namespace App\Services\PingPing\DTO;

use Spatie\DataTransferObject\DataTransferObject;

class Checks extends DataTransferObject
{
    public Uptime $uptime;
    public CertificateHealth $certificateHealth;
}
```

Again as before, we have 2 further DTOs created here that we need to create under the same namespace:

```php
namespace App\Services\PingPing\DTO;

class Uptime extends Check
{
    public UptimeMeta $meta;
}
```

```php
namespace App\Services\PingPing\DTO;

class CertificateHealth extends Check
{
    public CertificateHealthMeta $meta;
}
```

What you will notice about these two, is that they are extending a completely different class instead of the usual DataTransferObject from Spatie. This is because both have identical fields except their meta information. The Check DTO looks like this:

```php
namespace App\Services\PingPing\DTO;

use Carbon\Carbon;
use Spatie\DataTransferObject\DataTransferObject;

class Check extends DataTransferObject
{
    public int $id;
    public string $status;
    public null|string $error;
    public int $interval;
    public bool $enabled;
    public int $notificationThreshold;
    public Carbon $lastCheckAt;
}
```

Now let us create the UptimeMeta DTO:

```php
namespace App\Services\PingPing\DTO;

use Carbon\Carbon;
use Spatie\DataTransferObject\DataTransferObject;

class UptimeMeta extends DataTransferObject
{
    public int $httpStatusCode;
    public int $averageUptimePercentage;
    public int $averageResponseTime;
    public null|Carbon $offlineSince;
}
```

And now for the CertificateHealthMeta DTO:

```php
namespace App\Services\PingPing\DTO;

use Carbon\Carbon;
use Spatie\DataTransferObject\DataTransferObject;

class CertificateHealthMeta extends DataTransferObject
{
    public string $issuer;
    public string $signatureAlgorithm;
    public bool $selfSigned;
    public null|Carbon $validFrom;
    public null|Carbon $validTo;
}
```

So now we are mapping all of the response to DTOs using our CreateMonitor Action, we just need to create a MonitorCollection under `app/Services/PingPing/Collections/MonitorCollection.php` which should look like this:

```php
namespace App\Services\PingPing\Collections;

use Illuminate\Support\Collection;

class MonitorCollection extends Collection
{
    //
}
```

Pretty simple right? All we want to do really is extend the Illuminate standard Collection so it can be extended at a later date.

So we have created all of our DTOs, a Collection, an Action to handle the creation. Now we just need to update our Client itself to make over everything!

```php
namespace App\Services\PingPing;

use App\Services\Concerns\HasFake;
use Illuminate\Support\Facades\Http;
use App\Services\PingPing\Actions\CreateMonitor;
use App\Services\PingPing\Collections\MonitorCollection;

class Client
{
    use HasFake;

    public function __construct(
        protected string $uri,
        protected string $token,
        protected int $timeout = 10,
        protected null|int $retryTimes = null,
        protected null|int $retryMilliseconds = null,
    ) {}

    public function monitors()
    {
        $request = Http::withToken(
            token: $this->token,
        )->withHeaders([
            'Accept' => 'application/json',
        ])->timeout(
            seconds: $this->timeout,
        );

        if (
            ! is_null($this->retryTimes)
            && ! is_null($this->retryMilliseconds)
        ) {
            $request->retry(
                times: $this->retryTimes,
                sleep: $this->retryMilliseconds,
            );
        }

        $response = $request->get(
            url: "{$this->uri}/monitors",
        );

        if (! $response->successful()) {
            return $response->toException();
        }

        $collection = new MonitorCollection();

        foreach ($response->collect('data') as $item) {
            $monitor = CreateMonitor::handle(
                item: $item,
            );

            $collection->add(
                item: $monitor,
            );
        }

        return $collection;
    }
}
```

As you can see, we get the response from our API. Then if it wasn't successful we return the response as an exception, then we create our collection - map over the data in our response as a collection. Use our Action to create a full DTO and push this onto our collection, which we finally return.

The result of all of the above is a simple to use, and easy to extend API integration, which returns specific Objects - which you later extend to make requests yourself. During my time writing this article I was writing the code as I went along and testing in [TinkerwellApp](https://tinkerwell.app/) which I have found to be super useful for this sort of work. 

If you enjoyed this article, why not let me know on twitter [@JustSteveKing](https://twitter.com/JustSteveKing) or checkout the repo for this tutorial on [GitHub](https://github.com/JustSteveKing/laravel-api-service-tutorial)