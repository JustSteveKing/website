---
title: Using DTOs to keep context
pubDate: 2022-12-02
image: using-dtos-to-keep-context.png
source: https://laravel-news.com/using-dtos-to-keep-context
partner: Laravel News
description: PHP 8 makes it easier to use Data Transfer Objects (DTOs) for cleaner and safer code. Learn how to handle context and type safety with DTOs in your app.
---

DTOs, or Data Transfer Objects, can be used for so much. Since PHP 8 was released, creating these fantastic classes in your projects has never been easier.

From escaping the basic construct of an Array to adding type safety to what used to be just a plain old array. In pre-PHP 8, things were possible; it took much more boilerplate code and never felt worthwhile.

With PHP 8.2 looming on the horizon, our options are opening up more and more in the PHP ecosystem. A great book to read would be [Object Design Style Guide by Matthias Noback](https://matthiasnoback.nl/book/style-guide-for-object-design/), which I recommend all developers should read at least once.

I, however, do not call these DTOs as I don't just use them within my domain code. Instead, I call these Data Objects, as that is what they are. For the remainder of this tutorial, I will refer to them as Data Objects.

When creating Data Objects, I like to make all of the properties readonly as they should only ever be read, not written - it defeats the point of them. This gives me an immutable structure I can pass through my application to keep context and type safety - which I call a win-win situation.

Let's look at an example. I will borrow the idea from the [Laravel Bootcamp](https://bootcamp.laravel.com/) and create Chirps. Our chirp has two things it needs to care about, its' message and the user who created it. When building applications these days, I either use UUIDs or ULIDs, depending on the application. In this one, I will use ULIDs.

So we want to refactor the Bootcamp code base to make it easier to manage in the long run - web interface, API, CLI, etc. So we look to move from inline logic in our application to shared classes. Let's see what this looks like.

```php
$validated = $request->validate([
    'message' => 'required|string|max:255',
]);
 
$request->user()->chirps()->create($validated);
 
return redirect(route('chirps.index'));
```

We can refactor this so that we do our validation in a Form Request and move the creation over to something else.

```php
public function __invoke(StoreRequest $request): Response
{
    return new JsonResponse(
        data: $this->command->handle(
            chirp: $request->validated(),
        ),
        status: Http::CREATED->value,
    );
}
```

Here we are returning and handling everything in one go - this can make it a little hard to read, so let's split this out.

```php
$chirp = $this->command->handle(
    chirp: $request->validated(),
);
```

This is fine, and there is no reason you have to go further than this. However, if you want to do more and start adding context, then you can begin adding Data Objects which are - in my opinion - nice to use.

How should our chirp look? What would be helpful to us? Let's look at what I used and talk through the decision process.

```php
final class ChirpObject implements DataObjectContract
{
    public function __construct(
        public readonly string $user,
        public readonly string $message,
    ) {}

    public function toArray(): array
    {
        return [
            'message' => $this->message,
            'user_id' => $this->user,
        ];
    }
}
```

So, in typical Steve fashion, this is a final class. It implements an interface called `DataObjectContract`, which comes from one of the Laravel packages I typically pull into a project. Each property is public and accessible outside the class, but they are also readonly so that my context can't change as soon as the object has been created. I then have a method called `toArray`, which is enforced by the interface, and it is a way for me to implement how this object should be sent to Eloquent.

Using this approach allows me to use a contextual object and add extra type safety to the application. This means that I can rest easy when passing data around my application. How does our controller now look?

```php
public function __invoke(StoreRequest $request): Response
{
    return new JsonResponse(
        data: $this->command->handle(
            chirp: new ChirpObject(
                user: strval(auth()->id()),
                message: strval($request->get('message')),
            ),
        ),
        status: Http::CREATED->value,
    );
}
```

This code, to me, is ideal. We might want to wrap our code in a try-catch block to catch any potential issues, but that isn't quite the point I am trying to get across right now.

So far, the biggest issue I have found is that creating Data Objects is sometimes a bit of a pain, especially as they get bigger. If I am working in a larger application, where the Data Objects are larger, I will use a slightly different approach. In this example, I wouldn't use it. However, in the interest of showing you how you can use it - I will show you this now:

```php
final class StoreController
{
    public function __construct(
        private readonly ChirpFactoryContract $factory,
        private readonly CreateNewChirpContract $command,
    ) {}

    public function __invoke(StoreRequest $request): Response
    {
        return new JsonResponse(
            data: $this->command->handle(
                chirp: $this->factory(
                    data: [
                        ...$request->validated(),
                        'user' => strval(auth()->id()),
                    ]
                ),
            ),
            status: Http::CREATED->value,
        );
    }
}
```

Creating a Data Object Factory will allow us to control how the Data Objects are created and allow us to transform the incoming request into something closer to how we want to work in our application. Let's look at what the Data Object Factory would look like.

```php
final class ChirpFactory implements ChirpFactoryContract
{
    public function make(array $data): DataObjectContract
    {
        return new ChirpObject(
            user: strval(data_get($data, 'user')),
            message: strval(data_get($data, 'message')),
        );
    }
}
```

They are only simple classes that take the request array to turn it into an object, but as the request payload gets larger, these help clean up your controller code.

Have you found exciting ways to use Data Objects? How do you handle their creation? I used to add static creation methods to my Data Objects - but it felt like I was mixing the purpose of the Data Object itself. Let us know your thoughts on Twitter!
