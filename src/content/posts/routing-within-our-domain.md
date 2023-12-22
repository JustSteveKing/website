---
title: Laravel DDD - Routing within our Domain
pubDate: 2022-05-04
image: routing-within-our-domain.png
description: Learn how to manage routes in Laravel DDD by creating domain-specific route files and using service providers for cleaner and more organized code.
---

In a normal Laravel application we store all of our routes within `web.php` or `api.php` typically, however how does this work with our Domain Driven Design approach? Do we create a `routes/{domain}.php` file, or do we want to put this somewhere else?

My typical approach with this scenario is to create a routes file per domain, and store this within the domain itself. We can then use our Domains Service Provider to register our routes, and they will then be enabled and disabled simply by removing the domain service provider. This makes each domain able to be completely removed simply by using the service providers.

Let us start with the Blogging Domain API again, and create the routes file, create the following file `src/Domains/Blogging/Routes/Api/v1.php` and add the following:

```php
<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

Route::prefix('api/v1')->as('api:v1:')->group(function () {

    Route::prefix('posts')->as('posts:')->group(function () {
        Route::get('/', App\Http\Controllers\API\V1\Posts\IndexHandler::class)->name('index');
    });

});
```

What we are doing here is creating a prefix of `api/v1` for all of our routes, setting the naming strategy to all begin with `api:v1:` so that we have a consistent naming convention within our application. Soon we will add the logic into our Request Handler, which is a naming convention I use for Controllers. Feel free to rename this to Controllers if this makes you more comfortable.

Our next step is to start registering our routes, so we will return to our Service Provider and add the following bit of code:

```php
<?php

declare(strict_types=1);

namespace Domains\Blogging\Providers;

use Illuminate\Support\ServiceProvider;

class BloggingServiceProvider extends ServiceProvider
{
    /**
     * @return void
     */
    public function boot(): void
    {
        $this->app->register(
            provider: PostsServiceProvider::class,
        );

        $this->registerRoutes();
    }

    /**
     * @return void
     */
    protected function registerRoutes(): void
    {
        $this->loadRoutesFrom(
            path: __DIR__ . '/../Routes/API/v1.php',
        );
    }
}
```

What we can do is start to add more routes inside the `registerRoutes` method as and when we need to add them. If we run `php artisan route:list` then we will see the following route listed:

```markdown
GET|HEAD   api/v1/posts .................................................................. api:v1:posts:index › API\V1\Posts\IndexHandler
```

If we disable the `BloggingServiceProvider` inside `config/app.php` then we will no longer see this route registered. This allows us to have a really clean way to register and deregister our domains.

The logic for this Request Handler is very similar to what we did in a previous blog post, however I will walk through it again for the purpose of understanding the entire workflow.

To begin with, as usual we create an interface/contract for the query we want to perform: 

```php
<?php

declare(strict_types=1);

namespace Infrastructure\Blogging\Queries;

use Illuminate\Database\Eloquent\Collection;

interface FindAllPostsContract
{
    /**
     * @return Collection
     */
    public function handle(): Collection;
}
```

Then we can create the implementation:

```php
<?php

declare(strict_types=1);

namespace Domains\Blogging\Queries;

use App\Models\Post;
use Illuminate\Database\Eloquent\Collection;
use Infrastructure\Blogging\Queries\FindAllPostsContract;

class FindAllPosts implements FindAllPostsContract
{
    /**
     * @return Collection
     */
    public function handle(): Collection
    {
        return Post::query()->get();
    }
}
```

Then we can continue to add this into our `PostsServiceProvider`:

```php
<?php

declare(strict_types=1);

namespace Domains\Blogging\Providers;

use Domains\Blogging\Commands\CreatePostCommand;
use Domains\Blogging\DataObjects\PostDataObject;
use Domains\Blogging\Factories\PostDataObjectFactory;
use Domains\Blogging\Queries\FindAllPosts;
use Illuminate\Support\ServiceProvider;
use Infrastructure\Blogging\Commands\CreatePostContract;
use Infrastructure\Blogging\DataObjects\PostDataObjectContract;
use Infrastructure\Blogging\Factories\PostDataObjectFactoryContract;
use Infrastructure\Blogging\Queries\FindAllPostsContract;

class PostsServiceProvider extends ServiceProvider
{
    /**
     * @var array<class-string,class-string>
     */
    public array $bindings = [
        PostDataObjectFactoryContract::class => PostDataObjectFactory::class,
        PostDataObjectContract::class => PostDataObject::class,
        CreatePostContract::class => CreatePostCommand::class,
        FindAllPostsContract::class => FindAllPosts::class,
    ];
}
```

Finally we want to add be able to access this logic within our Request Handler:

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers\API\V1\Posts;

use App\Http\Resources\API\V1\PostResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Infrastructure\Blogging\Queries\FindAllPostsContract;
use JustSteveKing\StatusCode\Http;

final class IndexHandler
{
    /**
     * @param FindAllPostsContract $query
     */
    public function __construct(
        private readonly FindAllPostsContract $query,
    ) {}

    /**
     * @param Request $request
     * @return JsonResponse
     */
    public function __invoke(Request $request): JsonResponse
    {
        return new JsonResponse(
            data: PostResource::collection(
                resource: $this->query->handle(),
            ),
            status: Http::OK,
        );
    }
}
```

And we have come full circle, our routes are being registered and working and now we can handle these routes in our request handlers using a nice and simple query.
