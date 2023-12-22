---
title: Logging external HTTP Requests with Laravel Telescope
pubDate: 2022-06-21
image: logging-external-http-requests-with-laravel-telescope.png
source: https://laravel-news.com/logging-external-http-requests-with-laravel-telescope
partner: Laravel News
description: Track and debug third-party API requests with Laravel Telescope for improved visibility in your Laravel application.
---

The biggest issue with working with third-party APIs is that we have very little visibility. We integrate them into our code base and test them - but we have no idea how often we use them unless the API we are integrating with has metrics we can use. I have been quite frustrated with this for quite some time - but there is something we can do.

Laravel Telescope is a debugging assistant for your application, which means that it will log and give you insight into what is going on from a high level. We can tap into this and add custom watchers to enable more debugging and logging, and this is what we will do in this short tutorial.

Once you have installed Laravel Telescope, make sure you publish the configuration and migrate the database, we can start to create our watcher for Guzzle - the client underneath the Http facade. The most logical place to keep these classes, at least for me, is inside `app/Telescope/Watchers` as the code belongs to our application - but we are extending Telescope itself. But what does a standard watcher look like? I will show you a rough outline of the base requirements below:

```php
class YourWatcher extends Watcher
{
  public function register($app): void
  {
    // handle code for watcher here.
  }
}
```

This is a rough outline. You can add as many methods as you need to add the watcher that works for you. So without further ado, let us create a new watcher `app/Telescope/Watchers/GuzzleRequestWatcher.php`, and we will walk through what it needs to do.

```php
declare(strict_types=1);

namespace App\\Telescope\\Watchers;

use GuzzleHttp\\Client;
use GuzzleHttp\\TransferStats;
use Laravel\\Telescope\\IncomingEntry;
use Laravel\\Telescope\\Telescope;
use Laravel\\Telescope\\Watchers\\FetchesStackTrace;
use Laravel\\Telescope\\Watchers\\Watcher;

final class GuzzleRequestWatcher extends Watcher
{
  use FetchesStackTrace;
}
```

We first need to include the trait FetchesStackTrace as this allows us to capture what and where these requests are coming from. If we refactor these HTTP calls to other locations, we can make sure we call them how we intend to. Next, we need to add a method for registering our watcher:

```php
declare(strict_types=1);

namespace App\\Telescope\\Watchers;

use GuzzleHttp\\Client;
use GuzzleHttp\\TransferStats;
use Laravel\\Telescope\\IncomingEntry;
use Laravel\\Telescope\\Telescope;
use Laravel\\Telescope\\Watchers\\FetchesStackTrace;
use Laravel\\Telescope\\Watchers\\Watcher;

final class GuzzleRequestWatcher extends Watcher
{
  use FetchesStackTrace;

  public function register($app)
  {
    $app->bind(
      abstract: Client::class,
      concrete: $this->buildClient(
        app: $app,
      ),
    );
  }
}
```

We intercept the Guzzle client and register it into the container, but to do so, we want to specify how we want the client to be built. Let’s look at the buildClient method:

```php
private function buildClient(Application $app): Closure
{
  return static function (Application $app): Client {
  	$config = $app['config']['guzzle'] ?? [];

    if (Telescope::isRecording()) {
      // Record our Http query.
    }

    return new Client(
      config: $config,
    );
  };
}
```

We return a static function that builds our Guzzle Client here. First, we get any guzzle config - and then, if telescope is recording, we add a way to record the query. Finally, we return the client with its configuration. So how do we record our HTTP query? Let’s take a look:

```php
if (Telescope::isRecording()) {
  $config['on_stats'] = static function (TransferStats $stats): void {
    $caller = $this->getCallerFromStackTrace(); // This comes from the trait we included.

    Telescope::recordQuery(
      entry: IncomingEntry::make([
        'connection' => 'guzzle',
        'bindings' => [],
        'sql' => (string) $stats->getEffectiveUri(),
        'time' => number_format(
          num: $stats->getTransferTime() * 1000,
          decimals: 2,
          thousand_separator: '',
        ),
        'slow' => $stats->getTransferTime() > 1,
        'file' => $caller['file'],
        'line' => $caller['line'],
        'hash' => md5((string) $stats->getEffectiveUri())
      ]),
    );
  };
}
```

So we extend the configuration by adding the `on_stats` option, which is a callback. This callback will get the stack trace and record a new query. This new entry will contain all relevant things to do with the query we can record. So if we put it all together:

```php
declare(strict_types=1);

namespace App\Telescope\Watchers;

use Closure;
use GuzzleHttp\Client;
use GuzzleHttp\TransferStats;
use Illuminate\Foundation\Application;
use Laravel\Telescope\IncomingEntry;
use Laravel\Telescope\Telescope;
use Laravel\Telescope\Watchers\FetchesStackTrace;
use Laravel\Telescope\Watchers\Watcher;

final class GuzzleRequestWatcher extends Watcher
{
    use FetchesStackTrace;

    public function register($app): void
    {
        $app->bind(
            abstract: Client::class,
            concrete: $this->buildClient(
                app: $app,
            ),
        );
    }

    private function buildClient(Application $app): Closure
    {
        return static function (Application $app): Client {
            $config = $app['config']['guzzle'] ?? [];

            if (Telescope::isRecording()) {
                $config['on_stats'] = function (TransferStats $stats) {
                    $caller = $this->getCallerFromStackTrace();
                    Telescope::recordQuery(
                        entry: IncomingEntry::make([
                            'connection' => 'guzzle',
                            'bindings' => [],
                            'sql' => (string) $stats->getEffectiveUri(),
                            'time' => number_format(
                                num: $stats->getTransferTime() * 1000,
                                decimals: 2,
                                thousands_separator: '',
                            ),
                            'slow' => $stats->getTransferTime() > 1,
                            'file' => $caller['file'],
                            'line' => $caller['line'],
                            'hash' => md5((string) $stats->getEffectiveUri()),
                        ]),
                    );
                };
            }

            return new Client(
                config: $config,
            );
        };
    }
}
```

Now, all we need to do is make sure that we register this new watcher inside of `config/telescope.php`, and we should start seeing our Http queries being logged.

```php
'watchers' => [
  // all other watchers
  App\\Telescope\\Watchers\\GuzzleRequestWatcher::class,
]
```

To test this, create a test route:

```php
Route::get('/guzzle-test', function () {
    Http::post('<https://jsonplaceholder.typicode.com/posts>', ['title' => 'test']);
});
```

When you open up Telescope, you should now see a navigation item on the side called HTTP Client, and if you open this up, you will see logs appear here - you can inspect the headers, the payload, and the status of the request. So if you start seeing failures from API integrations, this will help you massively with your debugging.

Did you find this helpful? What other ways do you use to monitor and log your external API requests? Let us know on Twitter!