---
title: Laravel DDD - Querying Records in our Domain
pubDate: 2022-05-03
image: querying-records-in-our-domain.png
description: Learn how to leverage Laravel DDD for efficient record queries. Simplify read actions in your application.
---

In the last instalment we spoke about using a simplified version of the CQRS pattern to create **commands**. This time we are going to talk about the other side to this and talk about **queries**.

A Query is a read action, a way to read data from external systems such as the database. As with before, we are going to carry on in our Blogging domain and this time we will try to read a Post entry based off a passed in slug.

We have already covered how to add these commands and queries into our container so we can bind and call them nicely. So I won’t go through that again, but instead we will expand upon it and the examples.

## Our First Query

Our first query is to lookup a Post record based off of a passed in slug. To do this we don’t need as much boilerplate code as we did for the command - so this is a lot simpler. We will still want to create an interface/contract that we can bind to, but beyond that - there is no data objects or factories to create. First up we should always start with our interface/contract, as we need to think about the options and parameters we need to pass in.

```php
<?php

declare(strict_types=1);

namespace Infrastructure\Blogging\Queries;

interface FindPostBySlugContract
{
    public function handle(string $slug): null|Model;
}
```

As you can see from the above code example, the requirements for this is a lot simpler than the command. All we need is the lookup string and it will return either null or an Eloquent Model.

```php
<?php

declare(strict_types=1);

namespace Domains\Blogging\Queries;

class FindPostBySlug implements FindPostBySlugContract
{
    public function handle(string $slug): null|Model
    {
        return Post::query()->where(
            column: 'slug',
            value: $slug,
        )->firstOrFail();
    }
}
```

All we are doing here is querying using a `where` clause to lookup the record and return the first one - which will return either the instance or null. So our query is super simple.

We could write this query inside our application itself, however we with DDD we want to abstract this logic out of our application and into our domain so that if required it can be rebuilt. You could take these commands and queries a step further by casting these models to Data Objects - however that would take a lot of additional time to explain, so perhaps best left for another time.

## Adding our Query to the container

Now we have our query we can add it to our container, so that as we said - we can inject the interface/contract and keep the implementation as interoperable as possible.

```php
<?php

declare(strict_types=1);

namespace Domains\Blogging\Providers;

use Domains\Blogging\Commands\CreatePost;
use Domains\Blogging\Queries\FindPostBySlug;
use Domains\Blogging\DataObjects\PostDataObject;
use Domains\Blogging\Factories\PostDataObjectFactory;
use Infrastructure\Blogging\Commands\CreatePostContract;
use Infrastructure\Blogging\Queries\FindPostBySlugContract;
use Infrastructure\Blogging\DataObjects\PostDataObjectContract;
use Infrastructure\Blogging\Factories\PostDataObjectFactoryContract;

class PostsServiceProvider extends ServiceProvider
{
    /**
     * @var array<class-string,class-string>
     */
    public array $bindings = [
        PostDataObjectFactoryContract::class => PostDataObjectFactory::class,
        PostDataObjectContract::class => PostDataObject::class,
        FindPostBySlugContract::class => FindPostBySlug::class,
        CreatePostContract::class => CreatePost::class,
    ];
}
```

As before, we are simply adding the interface/contract and implementation into the bindings on the Posts Service Provider, which will be auto-registered through our Domain Service Provider.

## Using our Query

To use the query in our controllers we can inject the interface/contract into the controllers constructor - and then call handle on it within our controller method itself. It is clean and relatively simple to replicate across your code base.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controller\API\V1\Posts;

class FindController
{
    public function __construct(
        private readonly FindPostBySlugContract $query,
    ) {}

    public function __invoke(Request $request, string $slug)
    {
        $post = $this->query->handle(
            slug: $slug,
        );

        return new JsonResponse(
            data: new PostResource(
                resource: $post,
            ),
            status: Http::OK,
        );
    }
}
```

In the above example we have an invokable controller that has one URL parameter slug which we can use to pass through to our Query and fetch the single record. We can then use this to return a Post Resource using the correct Post with a HTTP status OK (200).
