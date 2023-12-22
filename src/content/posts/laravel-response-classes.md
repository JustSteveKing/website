---
title: Laravel Response Classes
pubDate: 2023-03-14
image: laravel-response-classes.png
source: https://laravel-news.com/laravel-response-classes
partner: Laravel News
description: Laravel Response Classes; Simplify API responses, maintain code quality with custom response classes.
---

Responding from your Laravel application is what I would call vital, especially when you are building an API. Let's have a look at how we can power up our responses.

Many of us typically start with using the helper functions in our applications, as the docs and many tutorials will use them. They are easy to start with and do exactly what you expect them to do. Let's take a look at what these look like:

```php
return response()->json(
    data: [],
    status: 200,
);
```

This is a slightly exaggerated example; you usually send data through and skip the status code. However, for me, habits die hard!

This code will create a new `JsonResponse` for you and pass in the data and status code ready for you to return. This works, and there is nothing wrong with using this approach. If you are using this already, a way to step up your API game here is to add the status code to be more declarative in what you are returning.

Moving forwards, we can skip using helper functions and start using the underlying class that the helper functions create:

```php
return new JsonResponse(
    data: [],
    status: 200,
);
```

I like this approach as it relies less on helpers and is more declarative. Looking at the code, you know exactly what is being returned because it is right in front of you instead of being abstracted behind a helper. You can level this up by using a constant or another way to declare the status code itself - making this even more accessible to read and understand for developers who may not know all the status codes by heart. Let's see what that might look like:

```php
return new JsonResponse(
    data: [],
    status: JsonResponse::HTTP_OK,
);
```

The `JsonResponse` class extends the Symfony Response class through a few layers of abstraction so that you can call this directly - however, your static analyzer may complain about this. I built a package called `juststeveking/http-status-code`, a PHP Enum that will return something similar, and its only job is to return status codes. I prefer this more lightweight utility approach to things like this, as you know exactly what is happening and what this class or package may do. The problem sometimes is that the class you are using does so much that you have to load this huge thing into memory just to be able to return an integer value. This doesn't make much sense, so I recommend using a dedicated package or class to manage this yourself. Let's see what it looks like when you do that:

```php
return new JsonResponse(
    data: [],
    status: Http::OK->value,
);
```

This is a significant step forward in terms of clarity of how declarative our code is. It is easy to read and understand exactly what is going on. However, we find ourselves creating the same block of code time after time, so how can we resolve this?

The answer is quite a simple one - Response classes. In Laravel, there is a contract we can use called `Responsable`, which tells us that our class must have a `toResponse` method on it. We can return this directly from our controllers, as Laravel will parse and understand these classes with no problems. Let us look at a quick basic example of what these classes look like:

```php
class MyJsonResponse implements Responsable
{
    public function __construct(
        public readonly array $data,
        public readonly Http $status = Http::OK,
   ) {}

    public function toResponse($request): Response
    {
        return new JsonResponse(
            data: $this->data,
            status: $this->status->value,
        );
    }
}
```

This is something simple to use. However, it isn't adding any value to our application. It is just an abstraction around what is already there. Let's look at something that might add more value to our application.

```php
class CollectionResponse implements Responsable
{
    public function __construct(
        public readonly JsonResourceCollection $data,
        public readonly Http $status = Http::OK,
    ) {}

    public function toResponse($request): Response
    {
        return new JsonResponse(
            data: $this->data,
            status: $this->status->value,
        );
    }
}
```

Now we have a response class that will handle any resource collections we pass through, making it very reusable for our application. Let's look at how we might return this in our controller:

```php
return new CollectionResponse(
    data: UserResource::collection(
        resource: User::query()->get(),
    ),
);
```

It is cleaner, has less code duplication, and is easy to override the default status should we need to. It gives us the benefit that the helper methods and Json Response class gave us - but allows us more context and predictability.

However, we are now faced with the problem of code duplication in other areas. Within our response classes themselves. Many of these look similar, the only difference being that the constructor properties will be different types. We want to keep the context of using custom response classes, but we want to avoid creating something with a vast union-type argument for a property - when we may as well add mixed and be done with it.

In this situation, you can either reach for an abstract class to extend or a trait to add the behavior to classes that need it. Personally, I am a fan of composition over inheritance, so using a trait makes more sense to me.

```php
trait SendsResponse
{
    public function toResponse($request): Response
    {
        return new JsonResponse(
            data: $this->data,
            status: $this->status->value,
        );
    }
}
```

The biggest problem with this approach is that static analysis will complain about this code because the trait needs to have or know about the properties of the class. This is something of an easy fix, though.

```php
/**
 * @property-read mixed $data
 * @property-read Http $status 
 */
```

We can add this doc block to the trait so that it is aware of properties that it has access to.

Now our Response classes will be a lot simpler to use and build, with less repetition in our code.

```php
class MessageResponse implements Responsable
{
    use SendsResponse;

    public function __construct(
        public readonly array $data,
        public readonly Http $status = Http::OK,
    ) {}
}
```

Now we can build out all the potential responses that we need to send easily, keeping type safety up and code duplication down.
