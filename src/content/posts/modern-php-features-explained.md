---
title: Modern PHP features explained - PHP 8.0 and 8.1
pubDate: 2022-10-27
image: modern-php-features-explained.png
source: https://laravel-news.com/modern-php-features-explained
partner: Laravel News
description: Explore PHP 8.0 and 8.1's modern features; constructor property promotion, union types, named arguments, match expressions, enums, and more, enhancing code readability.
---

Since its release in late 2020, PHP 8 has been a game changer. In this tutorial, I will walk through all the latest features with real-world examples of when I might choose to use them.

I fell in love with the PHP language early in my career, and since then, I have advocated for it as a language every chance I get. However, since the 8.* releases, I have not had to exaggerate a single thing. Instead, I have been able to rely solely on facts with the language. Let's take a walk through a few of the prominent features from the PHP 8.0 release.

## Constructor property promotion

This has got to be one of my most used 8.0 features and has saved me many keystrokes. Let's break it down:

```php
// Before PHP 8.0
class Client
{
    private string $url;

    public function __construct(string $url)
    {
        $this->url = $url;
    }
}
```

```php
// PHP 8.0
class Client
{
    public function __construct(
        private string $url,
    ) {}
}
```

We can now set properties on our objects directly in the constructor as an argument instead of having to manually assign them. I use this almost all the time now, as it saves effort, but also it keeps the properties contained with the constructor - so you understand a lot more about your objects straight away, no scrolling required.

## Union Types

Another fantastic feature that was released is Union Types. This is where a type hinted variable or a return type can be one or more types. This has helped with static analysis, where you might have conditional returns within a method. Let's look at an example.

```php
// Before PHP 8.0
class PostService
{
    public function all(): mixed
    {
        if (! Auth::check()) {
            return [];
        }

        return Post::query()->get();
    }
}
```

```php
// PHP 8.0
class PostService
{
    public function all(): array|Collection
    {
        if (! Auth::check()) {
            return [];
        }

        return Post::query()->get();
    }
}
```

This new addition allows us to be super specific in how static analysis and ourselves understand our code - even just from a cursory glance. We know that the `all` method will either return an array or a collection, which means that our code is much more predictable, and we know how to handle it.

## Named Arguments

Yet another feature that I perhaps overuse these days. I find that using named arguments allows us to be declarative in our code - no more guessing what that third parameter to that function means in relation to your code base. Let's look at another example.

```php
// Before PHP 8.0
class ProcessImage
{
    public static function handle(string $path, int $height, int $width, string $type, int $quality, int $compression): void
    {
        // logic for handling image processing
    }
}

ProcessImage::handle('/path/to/image.jpg', 500, 300, 'jpg', 100, 5);
```

```php
// PHP 8.0
class ProcessImage
{
    public static function handle(string $path, int $height, int $width, string $type, int $quality, int $compression): void
    {
        // logic for handling image processing
    }
}

ProcessImage::handle(
    path: '/path/to/image.jpg',
    height: 500,
    width: 300,
    type: 'jpg',
    quality: 100,
    compression: 5,
);
```

As you can see in the above example - getting the height and width the wrong way around would create different effects from what you might expect. With the class and implementation being right next to each other, it is relatively easy. Now imagine this method was from a package you installed that may not have the best documentation - using named arguments allows you and anyone else using your code base to understand the order of these arguments for the method. However, this should still be used with caution, as library authors tend to change parameter names more frequently and aren't always considered breaking changes.

## Match Expressions

An improvement that everyone loves that I have spoken to, a significant improvement. In the past, we used a big switch statement with multiple cases, and let's be honest - it wasn't the nicest thing to look at or deal with. Let's look at an example.

```php
// Before PHP 8.0
switch (string $method) {
    case 'GET':
        $method = 'GET';
        break;
    case 'POST':
        $method = 'POST';
        break;
    default:
        throw new Exception("$method is not supported yet.");
}
```

```php
// PHP 8.0
match (string $method) {
    'GET' => $method = 'GET',
    'POST' => $method = 'POST',
    default => throw new Exception(
        message: "$method is not supported yet.",
    ),
};
```

The match statement allows a much more condensed syntax and is much more readable. I can't speak for any performance improvements this may add, but I know it is much easier to work with in the real world.

## Using ::class on objects

In the past, when you wanted to pass a class string to a method, you had to use something like `get_class`, which always felt a little pointless. The system already knows about the class at the time, as you have already autoloaded it in or created a new instance. Let's look at an example/

```php
// Before PHP 8.0
$commandBus->dispatch(get_class($event), $payload);
```

```php
// PHP 8.0
$commandBus->dispatch(
    event: $event::class,
    payload: $payload,
);
```

This might not be a show-stopper in terms of features, but it is definitely something I use and will always reach for when needed.

## None capturing catch blocks

Sometimes when building an application, you don't need access to the exception that may be thrown. This is rarely the case for me, though. Your mileage may vary, though. Let's look at an example.

```php
// Before PHP 8.0
try {
    $response = $this->sendRequest();
} catch (RequestException $exception) {
    Log::error('API request failed to send.');
}
```

```php
// PHP 8.0
try {
    $response = $this->sendRequest();
} catch (RequestException) {
    Log::error('API request failed to send.');
}
```

We don't need to catch the exception, as we aren't using it in this case. If we wanted to include a message from the exception, then maybe make sure you catch the exception. As I said, this isn't something I use, as I usually want to use the thrown exception.

We can all agree that PHP 8.0 was a fantastic release we were all waiting for. So how about PHP 8.1? What did that bring us? Surely it cannot get better, right? If you were thinking this, like I did, you would be wrong. Here is why.

## Enums

Lovely Enums, the savior of pointless database tables and floating constants across the codebases of the world. Enums have quickly become one of my favorite features of PHP 8.1 - I can now push my roles into Enums instead of keeping them in a table that never changes. I can set HTTP methods to Enums instead of constants or public static properties of a class I never really wanted to use. Let's have a look.

```php
// Before PHP 8.1
class Method
{
    public const GET = 'GET';
    public const POST = 'POST';
    public const PUT = 'PUT';
    public const PATCH = 'PATCH';
    public const DELETE = 'DELETE';
}
```

```php
// PHP 8.1
enum Method: string
{
    case GET = 'GET';
    case POST = 'POST';
    case PUT = 'PUT';
    case PATCH = 'PATCH';
    case DELETE = 'DELETE';
}
```

The above example highlights the syntax differences, which are improved, but how about actual usage? Let's take a quick example of a trait I would typically use in an API integration.

```php
// Before PHP 8.1
trait SendsRequests
{
    public function send(string $method, string $uri, array $options = []): Response
    {
        if (! in_array($method, ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'])) {
            throw new InvalidArgumentException(
                message: "Method [$method] is not supported.",
            );
        }

        return $this->buildRequest()->send(
            method: $method,
            uri: $uri,
            options: $options,
        );
    }
}
```

```php
// PHP 8.1
trait SendsRequests
{
    public function send(Method $method, string $uri, array $options = []): Response
    {
        return $this->buildRequest()->send(
            method: $method->value,
            uri: $uri,
            options: $options,
        );
    }
}
```

It allows my method to know precisely what is being passed in from a type perspective - and there is less chance of an Exception being thrown due to an unsupported type. If we want to extend support, now we add a new case to our Enum - instead of adding a new constant and having to refactor all of the conditions where we might be checking for support.

## Unpacking Arrays

This feature is something that I wasn't sure I would use until I did. Previously we would always have to replicate things or merge arrays to get what we needed. Now we can just unpack the array, and the behavior will be the same. I use DTOs a lot in my code, and all of them have a method called `toArray`, which is an easy way for me to transform a DTO into something that Eloquent will handle for me. Let's take a look at an example.

```php
// Before PHP 8.1
final class CreateNewClient implements CreateNewClientContract
{
    public function handle(DataObjectContract $client, int $account): Model|Client
    {
        return Client::query()->create(
            attributes: array_merge(
                $client->toArray(),
                [
                    'account_id' => $account,
                ],
            ),
        );
    }
}
```

```php
// PHP 8.1
final class CreateNewClient implements CreateNewClientContract
{
    public function handle(DataObjectContract $client, int $account): Model|Client
    {
        return Client::query()->create(
            attributes: [
                ...$client->toArray(),
                'account_id' => $account,
            ],
        );
    }
}
```

As you can see, it is only a small code change, but it means that I don't have to worry about merging an array and can simply unpack in place to build the array I need. It is cleaner and easier to manage. I can't comment on performance as it is such a small operation, but I would be interested to hear from anyone who has benchmarked this different approach to see if there are any differences.

## New in constructors

What can I say about new constructors that you aren't already imagining? Not much, but I will give it a go. Before PHP 8.1, sometimes you might not be passing in a new instance of a class to a constructor for various reasons, and sometimes you did. It created this situation where you were never really sure if you needed to pass an instance or not. Having that moment of - I will just pass null and see what happens - a hope for the best moment. Thank you, PHP 8.1, for providing us some safeguards against deadlines and rushed decisions. Am I right? Let's look at an example.

```php
// Before PHP 8.1
class BuyerWorkflow
{
    public function __construct(
        private null|WorkflowStepContract $step = null
    ) {
        $this->step = new InitialBuyerStep();
    }
}
```

```php
// PHP 8.1
class BuyerWorkflow
{
    public function __construct(
        private WorkflowStepContract $step = new InitialBuyerStep(),
    ) {}
}
```

So the primary win here, at least in my opinion, is code cleanliness. Using the new in constructor feature, we can stop worrying about potentially passing null - and just let the class handle it. The example above is a little simplistic. In all honesty, that may be due to the fact that I haven't really had these issues before. However, I know many of you would have done this and can hopefully see the benefit of using this new feature.

## Read-only Properties

I am in love. I won't lie. This was a massive game-changer for me. It allows me to program in immutability easily without having to decrease visibility. Previously I had to change properties that I wanted public to be protected or private - which meant that I then had to add getters to the class - which felt like adding boilerplate that really was not needed. Let's look at an example.

```php
// Before PHP 8.1
class Post
{
    public function __construct() {
        protected string $title,
        protected string $content,
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function getContent(): string
    {
        return $this->content;
    }
}
```

```php
// PHP 8.1
class Post
{
    public function __construct() {
        public readonly string $title,
        public readonly string $content,
    }
}
```

Looking at that code example, the improvements you can add because of this new language feature are impressive. It is clear to see the benefit that readonly properties can give you - your code is less verbose, and you can loosen up on visibility and access while still keeping immutability.

This, of course, is not an exhaustive list - it is just a few key things that make the releases stand out. There are many more things that were added to PHP 8.0 and 8.1 that I have not mentioned here. If you want a more in-depth run down on all the things added, I highly recommend checking out [Stitcher by Brent Roose](https://stitcher.io/), who is diligent in his updates around the language updates.

I will not go into PHP 8.2 in this article, as it is yet to be released, so I haven't formulated any opinions on the new features yet - but watch this space as it will be coming. Not to mention the improvements already in planning for PHP 8.3!

What was your favorite modern PHP feature? What would you like to see added in future releases? Let us know on Twitter!