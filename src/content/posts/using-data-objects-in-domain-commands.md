---
title: Laravel DDD - Using Data Objects; Domain Commands
pubDate: 2022-05-03
image: using-data-objects-in-domain-commands.png
description: Laravel DDD; Use Data Objects and Domain Commands to escape 'array hell' and perform clean write operations in your application.
---
In our last instalment we spoke about how we can use data objects and data object factories to escape what I call “array hell”, a place where we have no idea what is in something passed to a method and there is no context or strictness about them. Now that we know how we are going to create these let’s look at a way we can use them!

Domain commands, are a term that I use to describe actionable classes that perform write operations. This is something that I borrowed from the CQRS world, but without the added complexity. The purpose of these commands are to create single classes that have one purpose and one purpose only: to write data to any external service. In our case, we are using them to write to the database.

Following on from our original concept, we are going to create a command to write a new post into the database. To do this however we need to extend our data object a little. Make the following changes so your data object looks like the below:

```php
<?php

declare(strict_types=1);

class PostDataObject implements PostDataObjectContract
{
    public function __construct(
        protected readonly string $title,
        protected readonly string $content,
        protected readonly bool $published = false,
        protected readonly null|Carbon $publishedAt = null,
    ) {}

    public function toArray(): array
    {
        return [
            'title' => $this->title,
            'content' => $this->content,
            'published' => $this->published,
            'published_at' => $this->publishedAt
        ];
    }
}
```

Using this toArray method it allows us to turn our Data Object into something that Eloquent can understand and work with. As you can also see we are adding PostDataObjectContract to to data object as an implementation, so that we can ensure we are returning the correct data objects without binding it to a specific implementation.

## Building our first Command

To build our first command, we realistically want to create an interface/contract to bind our implementation to in the application. This will allow us to use dependency injection to resolve the concrete implementation out of the container, meaning that our domain code is interoperable.

Let’s start with our interface/contract, what we need is something specific for each command so that for each command has the ability to be easily overriden.

```php
<?php

declare(strict_types=1);

namespace Infrastructure\Blogging\Commands;

interface CreatePostContract
{
    public function handle(PostDataObjectContract $post, int $user): null|Model;
}
```

In the above contract we are creating one method for this command called handle, and we want to pass in the implementation for the `PostDataObjectContract` as well as the `int` for the user, in this case it is the users ID that we pass in, then we expect to return either null or an Eloquent Model. Now onto our implementation itself.

Our implementation is something that is interchangeable incase we rename something like our Post model to Article or anything that could be intrusive to our code base.

```php
<?php

declare(strict_types=1);

namespace Domains\Blogging\Commands;

class CreatePostCommand implements CreatePostContract
{
    public function handle(PostDataObjectContract $post, int $user): null|Model
    {
        return Post::query()->create(
            attributes: array_merge(
                $post->toArray(),
                ['user_id' => $user]
            ),
        );
    }
}
```

From the above we can see that this commands only job is to start a query builder on the Post model, then create a new instance of Post using some attributes. We know that a post is usually required to have an author, so we pass in the foreign key as an integer and array merge the data object as an array and an array that sets the user_id to the value passed in. This allows us to not only use the authenticated user but it also allows us to pass in the ID of any user that this might be created for making the command more flexible.

## Binding our Command

Now that we have the interface/contract and the implementation - we need to let the Laravel container know about this so that when we try to inject using dependency injection we get the right implementation. We are able to do this inside our domain service provider using the `bindings` property. This is a great way to attach these into any controller or anything else. However, as we might have quite a few commands we want to register to this domain it is sensible to look at registering these within a separate service provider.

When it comes to additional service providers we have a number of options available - in terms of naming conventions. Should we create a `CommandsServiceProvider` inside our Blogging domain? Or should we create a `PostsServiceProvider` so that all bindings relating to this part of the domain is all together? My preferred way here is to use something specific to what is going to be needed, so in this case creating a `PostsServiceProvider`. To do this, we can create a Service Provider in `src/Domains/Blogging/Providers/PostsServiceProvider.php` and this should look like:

```php
<?php

declare(strict_types=1);

namespace Domains\Blogging\Providers;

use Domains\Blogging\Commands\CreatePost;
use Domains\Blogging\DataObjects\PostDataObject;
use Domains\Blogging\Factories\PostDataObjectFactory;
use Infrastructure\Blogging\Commands\CreatePostContract;
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
        CreatePostContract::class => CreatePost::class,
    ];
}
```
This is a single service provider that will let us add all the bindings for the posts in our blogging domain, as we move on we will be able to register things such as Queries and more.

Now all that is left for us to do is to let our Blogging domains Service Provider know about this additional provider, and then we can start binding to our DI container within Laravel.

```php
<?php

declare(strict_types=1);

namespace Domains\Blogging\Providers;

use Illuminate\Support\ServiceProvider;

class BloggingServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->app->register(
            provider: PostsServiceProvider::class
        );
    }
}
```

By calling $this->app->register we are able to register any additional service providers from within our domain to load in nicely and easily. It also means that if we remove the domain service provider from config/app.php then we are also removing these bindings automatically.

## Using our Command

So now we have our service providers all connected and registering correctly, we can now look to start our application implementation. In this example I am going to take the easiest route to explain this, by using an API.

To begin with we need a controller that will allow us to inject what we need, this controller will be nice and simple to use, and the purpose of this one will be to allow users to create their own posts.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controller\API\V1\Posts;

class StoreController
{
    public function __construct(
        private readonly Authenticatable $user,
        private readonly CreatePostContract $command,
        private readonly PostDataObjectFactoryContract $factory,
    ) {}

    public function __invoke(StoreRequest $request)
    {
        $postDataObject = $this->factory->make(
            attributes: $request->validated(),
        );

        $post = $this->command->handle(
            post: $postDataObject,
            user: $user->id,
        );

        return new JsonResponse(
            data: new PostResource(
                resource: $post,
            ),
            status: Http::CREATED,
        );
    }
}
```

In our Controllers constructor we are injecting:

- **Authenticatable**: The currently authenticated user.
- **CreatePostContract**: The Commands interface/contract to use.
- **PostDataObjectFactoryContract**: The Data Object Factory interface/contract to use.

We then build up our data object, send it through to our command, and pass this instance through to a a JSON Response using a Laravel Resource. Some very simple steps we would be very used to taking in our controllers, but the benefit is that each injected class is interoperable through the container, and each part can be testing in isolation nicely as well as testing the controller in a Feature test.
