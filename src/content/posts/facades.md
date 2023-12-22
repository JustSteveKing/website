---
title: Reaching for Facades
pubDate: 2022-11-04
image: facades.png
source: https://laravel-news.com/facades
partner: Laravel News
description: Demystify Laravel Facades with this insightful guide, showcasing their practicality in creating clear and efficient code, and embracing Laravel's unique features.
---

Facades, people seem to love them or hate them. Either way, they are a natural part of what Laravel is today. Laravel Facades, however, aren't strictly facades; are they? Instead, they are static accessors to resolve a class from the container.

When I first started with Laravel, I hated it, and after three years of using Larvel - I finally started to accept it. I was your typical Laravel hater of today. It was when I learned to embrace Laravel for what it is, instead of trying to fight the framework of my way of thinking, that I learned to love it. Some might say I am one of its biggest advocates now.

One of the things I hated for a time was Facades. I was in the grumpy camp complaining about static method calls, blah blah blah. But I didn't know how they worked in Laravel. I was joining in with the noise repeating what other developers had said without knowing what I was talking about. 

Fast forward to today, and I understand how Facades work - and you know what? I have definitely changed my tune. I want to write this tutorial not so that you can all agree with me, although you should, but so that you, too, can understand how facades work and where they have their benefits.

This isn't strictly a tutorial, as I will be walking you through existing code that I have written, whereas I usually would write the code as I write the tutorial so I can explain the natural refactoring points. The code I am going to walk you through is the [Get Send Stack](https://getsendstack.com/) Laravel package that you can find on [GitHub here](https://github.com/getsendstack/laravel-sendstack).

While building this package, I did what I usually do and started building an API integration using the HTTP Facade - using an interface/contract to leverage the DI container to inject the instance when needed. Let me take you through these stages of code. We will start with not using the DI container first.

```php
class AddSubscriberController
{
    public function __invoke(AddSubscriberRequest $request)
    {
        $client = new Client(
            url: strval(config('services.sendstack.url')),
            token: strval(config('services.sendstack.token')),
        );

        try {
            $subscriber = $client->subscribers()->create(
                request: new SubscriberRequest(
                    email: $request->get('email'),
                    firstName: $request->get('first_name'),
                    lastName: $request->get('last_name'),
                    optIn: $request->get('opt_in'),
                ),
            );
        } catch (Throwable $exception) {
            throw new FailedToSubscribeException(
                message: $exception->getMessage(),
                previous: $exception,
            );
        }

        // return redirect or response.
    }
}
```

So this is a 'little' long-winded, but it is clear to see what you are doing. You create the client, send the request through the client, and catch a potential exception. Finally, returning either a redirect or a response depending if it were an API or web controller. This code isn't bad. You can test it. You can ensure behavior within the controller with little effort. 

However, if the package changed how you integrated with it, everywhere you were newing up the client to work with the API, you would have to go through your code base and make all the changes as required. This is a perfect time to look at refactoring, as you are saving yourself future work by working smarter. Using the DI container directly, let's look at a refactored version of the above code.

```php
class AddSubscriberController
{
    public function __construct(
        private readonly ClientContract $client,
    ) {}

    public function __invoke(AddSubscriberRequest $request)
    {
        try {
            $subscriber = $this->client->subscribers()->create(
                request: new SubscriberRequest(
                    email: $request->get('email'),
                    firstName: $request->get('first_name'),
                    lastName: $request->get('last_name'),
                    optIn: $request->get('opt_in'),
                ),
            );
        } catch (Throwable $exception) {
            throw new FailedToSubscribeException(
                message: $exception->getMessage(),
                previous: $exception,
            );
        }

        // return redirect or response.
    }
}
```

Cleaner and more manageable now, we are injecting from the DI container the contract/interface, which will resolve the client for us - as the package service provider has detailed the instructions on how to build the client. There is nothing wrong with this approach; it is a pattern I use heavily in my code. I can replace the implementation to get a different result and still use the same package API as I am using the interface/contract. But again, while I am using the container - am I fighting the framework? One of the things many of us like about Laravel is its developer experience, and we can thank Eloquent a lot for that. We don't have to mess around with juggling the container to create a new model or anything like that. We are very used to statically calling what we want when we want. So let's look at the above example using the Facade I created with the package.

```php
class AddSubscriberController
{
    public function __invoke(AddSubscriberRequest $request)
    {
        try {
            $subscriber = SendStack::subscribers()->create(
                request: new SubscriberRequest(
                    email: $request->get('email'),
                    firstName: $request->get('first_name'),
                    lastName: $request->get('last_name'),
                    optIn: $request->get('opt_in'),
                ),
            );
        } catch (Throwable $exception) {
            throw new FailedToSubscribeException(
                message: $exception->getMessage(),
                previous: $exception,
            );
        }

        // return redirect or response.
    }
}
```

No more containers to worry about - and we are getting back that familiar Laravel feeling that we were missing. The upside here is that the developer experience is straightforward, the implementation looks clean, and we achieve the same result. What are the downsides? Because there are some, of course. The only downside is that you cannot switch implementation as the Facade is static to its implementation. But in my experience, moving from Provider A to Provider B when you are talking external services is more complex than creating and binding a new implementation to the container. People who always bang this drum look at the problem with a narrow ideological scope. In reality, changing providers is a considerable effort, not just from a code perspective - so there is always enough time to focus on implementing something different where you need to. Sometimes the new provider has something the older one doesn't. Maybe you have to send additional data through in your requests etc.

My point here is that while the SOLID principles are great, and you should look to them for advice - they are often an unrealistic dream that aren't going to work in practice, or you are going to spend so long writing the feature that the scope changes before you have finished. Fighting the framework at every turn does not help you build good products. You create good products by accepting less than perfect and acknowledging change may be required.

How does this relate to Facades? as you can see from the code examples, Facades make it easier in many ways. Neither way is incorrect, and neither way is correct. A Facade will allow a friendlier implementation but will force you down a particular path. Using the container will allow you more flexibility moving forward, but it isn't a magic bullet and comes with its own risks. Simply newing up instances when you need them is easy, but also lazy when there are better ways to achieve the same result.

What does a Facade actually look like? Here is the exact code from the package.

```php
declare(strict_types=1);

namespace SendStack\Laravel\Facades;

use Illuminate\Support\Facades\Facade;
use SendStack\Laravel\Contracts\ClientContract;
use SendStack\Laravel\Http\Resources\SubscribersResource;
use SendStack\Laravel\Http\Resources\TagResource;

/**
 * @method static SubscribersResource subscribers()
 * @method static TagResource tags()
 * @method static bool isActiveSubscriber(string $email)
 *
 * @see ClientContract
 */
class SendStack extends Facade
{
    protected static function getFacadeAccessor()
    {
        return ClientContract::class;
    }
}
```

It has a protected static method to get the class it needs to construct and build, and the class we are extending will forward all static calls into this class once resolved from the container. People talk about it like it is a dirty word, but in reality, it is no different from creating a container alias, really, other than the syntax. In my example, I have added docblocks for the methods on the implementation/interface to allow better IDE completion - but this is just an extra step I like to take.

The moral of this story is that Facades are not evil and can actually be very helpful - so ignore the haters and embrace them as I have. You will be happier for it and will be a lot more productive.
