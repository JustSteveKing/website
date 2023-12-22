---
title: Using Route Registrars in your Laravel application
pubDate: 2022-07-19
image: using-route-registrars-in-your-laravel-application.png
source: https://laravel-news.com/route-registrars
partner: Laravel News
description: Enhance Laravel route management with Route Registrars. Simplify route registration and organization for cleaner and more efficient code.
---

Recently I came across a unique approach to loading routes into Laravel applications, and I wanted to share this with you. It allows you to create Route Registrars classes you register your routes within. I saw this in a package currently being developed by [Ollie Read](https://twitter.com/ollieread), and it caught my attention as a clean and exciting way to register routes.

The changes required to your standard Laravel application are relatively simple. We make a few changes to the Route Service Provider - and remove the web and API route files. The first thing we do is create a new trait/concern that we can add to our `app/Providers/RouteServiceProvider` called `MapRouteRegistrars`. Add the following code to this new trait/concern.

```php
declare(strict_types=1);

namespace App\Routing\Concerns;

use App\Routing\Contracts\RouteRegistrar;
use Illuminate\Contracts\Routing\Registrar;
use RuntimeException;

trait MapRouteRegistrars
{
	protected function mapRoutes(Registrar $router, array $registrars): void
	{
		foreach ($registrars as $registrar) {
			if (! class_exists($registrar) || ! is_subclass_of($registrar, RouteRegistrar::class)) {
				throw new RuntimeException(sprintf(
					'Cannot map routes \'%s\', it is not a valid routes class',
					$registrar
				));
			}

			(new $registrar)->map($router);
		}
	}
}
```

As you can see, we also need to create an interface/contract to use and ensure all of our Registrars implement it. Create this under `app/Routing/Contracts/RouteRegistrar` and add the following code.

```php
declare(strict_types=1);

namespace App\Routing\Contracts;

use Illuminate\Contracts\Routing\Registrar;

interface RouteRegistrar
{
	public function map(Registrar $registrar): void;
}
```

Now that we have the trait and interface in place, we can look at the changes we need to make to the default Route Service Provider.

```php
declare(strict_types=1);

namespace App\Providers;

use App\Routing\Concerns\MapsRouteRegistrars;
use Illuminate\Contracts\Routing\Registrar;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;

class RouteServiceProvider extends ServiceProvider
{
	use MapsRouteRegistrars;

	protected array $registrars = [];

	public function boot(): void
	{
		$this->routes(function (Registrar $router) {
			$this->mapRoutes($router, $this->registrars);
		});
	}
}
```

From the above code, you can see that we have added a new property to our route service provider. This property is where the application's route registrars are registered and loaded inside the boot method.

Now that we have got our application ready to use route registrars instead of route files, let's create a default one for our application. This approach would work exceptionally well in a domain-driven design or modular system - allowing each domain or module to register its routes. For this example, we will keep this simple so that you can understand the approach. Create a new route registrar in `app/Routing/Registrars/DefaultRegistrar.php` and add the following code.

```php
declare(strict_types=1);

namespace App\Routing\Registrars;

use App\Routing\Contracts\RouteRegistrar;

class DefaultRegistrar implements RouteRegistrar
{
	public function map(Registrar $registrar): void
	{
		$registrar->view('/', 'welcome');
	}
}
```

Now that our default registrar is created, we can register this inside our Route Service Provider, ensuring it is loaded. 

```php
declare(strict_types=1);

namespace App\Providers;

use App\Routing\Concerns\MapsRouteRegistrars;
use App\Routing\Registrars\DefaultRegistrar;
use Illuminate\Contracts\Routing\Registrar;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;

class RouteServiceProvider extends ServiceProvider
{
	use MapsRouteRegistrars;

	protected array $registrars = [
		DefaultRegistrar::class,
	];

	public function boot(): void
	{
		$this->routes(function (Registrar $router) {
			$this->mapRoutes($router, $this->registrars);
		});
	}
}
```

Now, if you visit `/`, you will be loaded with the `welcome` view, which means that everything is all hooked up correctly. I can imagine a great way that I might utilize this in an application of mine, where I have static marketing routes, blog routes, admin routes, and more. As an example, I would imagine the route service provider looking like the following:

```php
declare(strict_types=1);

namespace App\Providers;

use App\Routing\Concerns\MapsRouteRegistrars;
use App\Routing\Registrars\AdminRegistrar;
use App\Routing\Registrars\BlogRegistrar;
use App\Routing\Registrars\MarketingRegistrar;
use Illuminate\Contracts\Routing\Registrar;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;

class RouteServiceProvider extends ServiceProvider
{
	use MapsRouteRegistrars;

	protected array $registrars = [
		MarketingRegistrar::class, // Marketing Routes
		BlogRegistrar::class, // Blog Routes
		AdminRegistrar::class, // Admin Routes
	];

	public function boot(): void
	{
		$this->routes(function (Registrar $router) {
			$this->mapRoutes($router, $this->registrars);
		});
	}
}
```

Splitting our routes like this is a great way to move from a standard PHP routes file to a class-based routing system allowing for better encapsulation with your application or domain.

What other ways have you found to help you manage a growing application? Especially from a routing perspective, they can get a little unruly after a while. Let us know on Twitter.