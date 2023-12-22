---
title: Adapter Pattern
pubDate: 2022-05-12
image: adapter-pattern.png
description: Explore the adapter design pattern in coding through a practical example of building a versatile social poster class, adaptable for different social networks.
---

Of all of the design patterns you could use in your code, the adapter pattern is one of my all time favourites. It allows you to abstract the implementation to an adapter that implements an interface. so you can switch implementation simply by switching the adapter.

Let us walk through an example.

Firstly we need something that will manage our adapters, what is it we will be building? For this I will use a fictional approach as it makes explaining the process easier.

We will be building a social poster, a class that allows us to post to different social media channels. Firstly we will need the adapters interface, it is important to bear in mind what the social networks allow you to do. Having a `postVideo` method on the interface when only 2 of the 3 social networks supports this isn't a great idea. The main reason for using this pattern is to simplify integrating across different services under a common API.

Let us set the basic requirements of our code.

- We want to be able to post an update.
- We want to be able to fetch a post.
- We want to be able to delete a post.
- We want to be able to get a list of posts.

So knowing that, we can design our contract/interface using that information:

```php
interface NetworkAdapterContract
{
    public function post(string $message): void;
    public function fetch(mixed $identifier): mixed;
    public function delete(mixed $identifier): void;
    public function get(): array;
}
```
For now we will stick to the `mixed` type and `array` type to keep things super simple. Unless we do a lot of additional processing this is the minimum viable code we need, but we can make this stricter later if we need to by processing API responses and standardising them under things like `NetworkCollection` and `NetworkResource` interfaces/contracts. But that is going too deep into implementation instead of focusing on the pattern.

Our first social network we want to integrate with is twitter, probably my most used social network. So we will build the twitter adapter using the `NetworkAdapterContract` contract/interface.

```php
class TwitterAdapter implements NetworkAdapterContract
{
    public function __construct(
        private TwitterSDK $sdk,
    ) {}

    public function post(string $message): void
    {
        $this->sdk->tweet(Formatter::tweet($message));
    }

    public function fetch(mixed $identifier): mixed
    {
        return $this->sdk->fetchTweet($identifier);
    }

    public function delete(mixed $identifier): void
    {
        $this->ssk->deleteTweet($identifier);
    }

    public function get(): array
    {
        return $this->sdk->getLatestTweets();
    }
}
```

As you can see the SDK I am pulling in is completely made up and isn't based off of an actual package you can use. However it illustrated the point that the SDKs API and the contract API is different, and you are using the adapter to proxy calls through to the SDK.

Let us take another example, this time LinkedIn - a social network I rarely use and I have only found useful when looking for work. But nonetheless we will use this as an example:

```php
class LinkedInAdapter implements NetworkAdapterContract
{
    public function __construct(
        private LinkedInSDK $sdk,
    ) {}

    public function post(string $message): void
    {
        $this->sdk->postUpdate(Formatter::linkedin($message));
    }

    public function fetch(mixed $identifier): mixed
    {
        return $this->sdk->fetchUpdates($identifier);
    }

    public function delete(mixed $identifier): void
    {
        $this->ssk->delete($identifier);
    }

    public function get(): array
    {
        return $this->sdk->getUpdates();
    }
}
```

As you can see the Adapaters API is the same because of the `NetworkAdapterContract` interface/contract we implement, but the implemented SDK is very different. However we achieve the same result when working with these adapters.

So how can we implement this adapter pattern? Let us create a new class called `Poster` which will be in charge of using these adapters.

There are a couple of approaches we could use here, we could use some PHP magic methods such as `__get` or `__call` to magically forward the calls to the adapter, or we could add helper methods which reflect the action we are performing in the adapter itself.

Let us first build out the `Poster` class without this part, and refactor to show the specifics.

```php
class Poster
{
    private function __construct(
        private string $adapter,
    ) {}

    public static function use(
        string $adapter,
    ): static {
        return new static(
            adapter: $adapter,
        );
    }
}
```

The surrounding class is super simple, all it needs to do is understand that is has an adapter and can access the adapters. Currently all we are doing is passing through the string name of the adapter, because ideally we would rely on DI to create the adapter and SDK etc.

To use this class and to create an adapter we can simply:

```php
$twitter = Poster::use(TwitterAdapter::class);
```

At this point we do not have much other than a class with a string property. Nothing exciting. Let us look at how this could work in Laravel...

Out next step would be to refactor the `Poster` class to allow us to have an adapter and a driver. The driver will be the class string, and the adapter will be the class itself.

```php
class Poster
{
    private function __construct(
        private string $driver,
        private NetworkAdapterContract $adapter,
    ) {}

    public static function use(
        string $driver,
    ): static {
        return new static(
            driver: $driver,
            adapter: app()->make($driver),
        );
    }
}
```

This allows us to `Poster::use(TwitterAdapter::class)` and have the `class-string` respresentation stored for reference, and the adapter itself to be built by Laravels container allowing us to interact efficiently. Let us next make a service provider called `PosterServiceProvider`

```php
class PosterServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(
            abstract: TwitterSDK::class,
            concrete: fn() => 
                new TwitterSDK(
                    token: config('services.twitter.api_token'),
                ),
            ,
        );
    }
}
```

What we are doing here is telling our container that when we are trying to build a new instance of `TwitterSDK` we want to create it with the stored API token. Thanks to Laravels containers zero config requirement, we can instantiate a new `TwitterAdapter` without having to add this to out service provider.

So now our container can build our twitter adapter we can look at how we want to be able to forward calls through to the adapter.

```php
class Poster
{
    private function __construct(
        private string $driver,
        private NetworkAdapterContract $adapter,
    ) {}

    public static function use(
        string $driver,
    ): static {
        return new static(
            driver: $driver,
            adapter: app()->make($driver),
        );
    }

    public function post(string $message): void
    {
        $this->adapter->post($message);
    }
}
```

In the above example we are using the `Poster` class to post using a helper method, which is a more than acceptable way to do this. One popular library that uses this approach is [flysystem](https://flysystem.thephpleague.com) by Frank de Jonge. This is most likely the best approach as it requires the least amount of magic, and isn't going to give you IDE warnings. However, if you have a very complicated implementation that you don't want to duplicate methods you can use the `__call()` method:

```php
class Poster
{
    private function __construct(
        private string $driver,
        private NetworkAdapterContract $adapter,
    ) {}

    public static function use(
        string $driver,
    ): static {
        return new static(
            driver: $driver,
            adapter: app()->make($driver),
        );
    }

    public function __call($method, $args)
    {
        if (! method_exists($this->adapter, $method)) {
            throw new AdapterException(
                message: "Method [$method] not found in [$this->driver]."
            );
        }

        return $this->adapter->$method(...$args);
    }
}
```

All we are doing here is checking that the method exists on the forwarding class beforehand, and throwing a specific exception that describes the error if it does not exist. We then just call the method passing in the arguments.

This is a very useful pattern to use, but it isn't something that should be used everywhere. It has its place, but it is very powerful when needed.
