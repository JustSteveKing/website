---
title: Laravel DDD - Starting our Domain Code; Data Objects and Factories
pubDate: 2022-05-03
image: starting-our-domain-code-with-data-objects-and-factories.png
description: Enhance code consistency and safety in Domain-Driven Design with Laravel DDD. Learn about Data Objects & Factories.
---

In our previous blog post we set up our Laravel application to use Domain Driven Design, and we did this in a way that would let us expand and add new domains as and when we needed nicely.

This article is taking that next step, creating our domain code. We will being this part of the journey by creating data objects and data object factories. But before that, let’s talk about what these are, and why we would use them.

## Data Objects

Data Objects are just plain old php objects that give us more context and control than your typical array would do. Imagine the following example:

```php
$post = [
    'title' => 'My Post Title',
    'content' => 'This is the post content',
    'published' => true,
];
```

Now imagine we passed this array into a method to publish it. How do we know what array keys are available? How do we know what types the values are? What can we actually do with this array as we pass it around our application, and how do we keep context of what it actually is?

Simply put using data objects (otherwise known as Data Transfer Objects) we can keep context, know what properties are needed, and have type safety. This to me makes a lot more sense, pass around a purpose built object instead of this flexible array. Let us see what this might look like:

```php
<?php

declare(strict_types=1);

class PostDataObject
{
    public function __construct(
        protected readonly string $title,
        protected readonly string $content,
        protected readonly bool $published = false,
    ) {}
}
```

Now this class not only has the ability to context, and type safety, but it is also has the ability to provide sensible defaults and add immutability and protection when being used. It is like that array gained super powers and is now helping rescue your code.

## Data Object Factories

So, in Laravel we have factories already. We have factories for our Eloquent Models to create fake instances within our test environment. They’re useful! I personally use them all the time, and couldn’t think of writing any tests without them set up. So how can we relate this ideology to data objects? Why would we?

Data Object Factories provide a consistent way to create your data objects. In reality you will be creating these objects in multiple places around your code base and want to ensure that they work in a repeatable way. Now this closely resembles the Factory Pattern, however it doesn’t follow it exactly. It is more of a utility pattern, something we can create to control how something works. Create our data object without them isn’t impossible, but it means we have to handle it all ourselves. Imagine if we extended our scope and wanted to add the `published_at` property onto our Data Object? We would have to go through and everywhere we were newing up an instance of the data object, we would have to amend and provide a fallback incase one is not available. You can imagine how messy this gets:

```php
<?php

$postDataObject = new PostDataObject(
    title: $request->get('title'),
    content: $request->get('content'),
    published: $request->get('published'),
    publishedAt: $request->get('published') ? $request->get('published_at', now()) : null,
);
```

So in the example above is where we would be publishing our blog post - if we had marked it ready to be published. we are going to have to do this every time we are trying to new up an instance of this object.

Now let’s step back and look at what this would look like if we used a factory before we go ahead and design this data object factory:

```php
<?php

$factory = new PostDataObjectFactory();
$postDataObject = $factory->make($request->validated());
```

And if we needed to extend this in any way, we can extend our validation or do an array merge in place - and it is all self contained. It is also very testable. we can test the creation passing in different array options to see how it behaves.

So how would this factory actually work? What would be the best way to create this?

```php
<?php

declare(strict_types=1);

class PostDataObjectFactory
{
    public function make(array $attributes): PostDataObject
    {
        $publishedAt = data_get($attributes, 'published') ?? now();

        return new PostDataObject(
            title: (string) data_get($attributes, 'title'),
            content: (string) data_get($attributes, 'content'),
            published: (bool) data_get($attributes, 'published'),
            publishedAt: $publishedAt,
        );
    }
}
```

All of our conditional logic for setting the published at property is encapsulated - allowing us to make changes as required in one place and have it effect all other instances easily.

There is no other need for this factory, it is there simply to create an object in a blueprinted way over and over again. In the example above I use the laravel helper `data_get` to simply allow me to recursively get items from a section of an array using dot notation if the key value is stored a few levels deep.
