---
title: Valid validators validating data
pubDate: 2022-11-17
image: validation.png
source: https://laravel-news.com/validation
partner: Laravel News
description: Explore Laravel data validation methods, from form requests to centralizing rules with validators and Eloquent Models for cleaner, efficient code.
---

Validation is a must-have for any modern project, and in Laravel, it is super simple to get started. Within your controller methods, you can call a method, pass in the request, and an array of the rules you wish to validate with.

Is this approach the right way? Is it wrong to do it this way? Of course not, and anyone who tells you otherwise needs a slap with a wet fish. There is nothing wrong with this approach; it works and is testable. The important thing to remember is that while it can be improved, it might not need improving. 

In this tutorial, I will walk you through my journey of validation within Laravel, what changes I made and why. Let's start at the beginning.

When I started with Laravel, I did what the documentation told me, plain and simple. I would extend `app/Http/Controller` and call `$this->validate` at this point. My controllers were resourceful. My typical store method would look a little like the following, modernized to today's syntax:

```php
namespace App\Http\Controllers\Api;

class PostController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $this->validate($request, [
            'title' => 'required|string|min:2|max:255',
            'content' => 'required|string',
            'category_id' => 'required|exists:categories,id',
        ]);

        $post = Post::query()->create(
            attributes: [
                ...$request->validated(),
                'user_id' => auth()->id(),
            ],
        );

        return new JsonResponse(
            data: new PostResource(
                resource: $post,
            ),
            status: Http::CREATED->value,
        );
    }
}
```

Aside from the creation logic, there is nothing wrong with how this validation works. I can test it and manage it, and I know it will validate how I need it to. So if your validation looks like this, good job!

I then moved to invokable controllers, as I preferred to keep things simpler - it looked the same at this point, just with an invoke method instead of a store method.

```php
namespace App\Http\Controllers\Api\Posts;

class StoreController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $this->validate($request, [
            'title' => 'required|string|min:2|max:255',
            'content' => 'required|string',
            'category_id' => 'required|exists:categories,id',
        ]);

        $post = Post::query()->create(
            attributes: [
                ...$request->validated(),
                'user_id' => auth()->id(),
            ],
        );

        return new JsonResponse(
            data: new PostResource(
                resource: $post,
            ),
            status: Http::CREATED->value,
        );
    }
}
```

After this, I discovered how helpful Form Requests were - and how encapsulating my validation within these classes helped me. From there, my controller changed again. This time it looked like the following:

```php
namespace App\Http\Controllers\Api\Posts;

class StoreController
{
    public function __invoke(StoreRequest $request): JsonResponse
    {
        $post = Post::query()->create(
            attributes: [
                ...$request->validated(),
                'user_id' => auth()->id(),
            ],
        );

        return new JsonResponse(
            data: new PostResource(
                resource: $post,
            ),
            status: Http::CREATED->value,
        );
    }
}
```

I no longer needed to extend the base controller as I didn't need the validate method. I could easily inject the form request into my controllers invoke method, and all data would be pre-validated. This made my controllers super small and lightweight, as I had pushed validation to a dedicated class. My form request would look something like this:

```php
namespace App\Http\Requests\Api\Posts;

class StoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
             'title' => ['required', 'string', 'min:2', 'max:255',]
            'content' => ['required', 'string'],
            'category_id' => ['required', 'exists:categories,id'],
        ];
    }
}
```

For a while, I stuck with this style validation, as again, there is nothing wrong with it. If your validation looks like this, good job! Again this is scalable, testable, and repeatable. You can inject this anywhere you are using HTTP requests and need validation.

Where do we go from here, though? How could we improve this? This is a question I asked myself and was stuck for quite some time. Let me explain a scenario that made me question how this could be approached.

Imagine you have a project that allows the creation of posts through an API, a web interface, and perhaps the command line. The API and web interface can share the form request, as both can be injected into the controller. How about the command line? Do we need to repeat the validation for this? Some might argue that you don't need to validate the command line to the same extent, but you will want to add some validation.

I have been playing around with the idea of validators for a while. It is nothing new, so I have no idea why it took so long to figure it out! Validators, at least for me, were classes containing the rules and information essential to validate any request - HTTP or otherwise. Let me show you how one might look:

```php
namespace App\Validators\Posts;

class StoreValidator implements ValidatorContract
{
    public function rules(): array
    {
        return [
             'title' => ['required', 'string', 'min:2', 'max:255',]
            'content' => ['required', 'string'],
            'category_id' => ['required', 'exists:categories,id'],
        ];
    }
}
```

It starts simple, just a place I wanted to centralize the storage of these validation rules. From there, I could extend it as I needed to.

```php
namespace App\Validators\Posts;

class StoreValidator implements ValidatorContract
{
    public function rules(): array
    {
        return [
             'title' => ['required', 'string', 'min:2', 'max:255',]
            'content' => ['required', 'string'],
            'category_id' => ['required', 'exists:categories,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'category_id.exists' => 'This category does not exist, you Doughnut',
        ];
    }
}
```

I could add things like messages for when I wanted to customize the validation messages. I could add more methods to encapsulate more validation logic. But how does this look in practice? Let's revisit the Store Controller example. Our controller will look the same as we have already moved validation out, so let's instead look at the form request:

```php
namespace App\Http\Requests\Api\Posts;

class StoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return (new StoreValidator())->rules();
    }
}
```

As simple as that, I can switch an array stuck in a class and replace it with a class specific to how we want to store and validate this information.

I have seen another approach that I feel is good and bad. Let me talk you through it. I have seen some people keep their validation rules within their Eloquent Models. Now I am not 100% sure on this one, as it feels like we would be mixing purposes a little - however, it is also ingenious. As what you want to do is keep the rules around how this Model is created within the model itself. It knows its own rules. This would look a little like the following:

```php
namespace App\Models;

class Post extends Model
{
    public static array $rules = [
             'title' => ['required', 'string', 'min:2', 'max:255',]
            'content' => ['required', 'string'],
            'category_id' => ['required', 'exists:categories,id'],
    ];

    // The rest of your model here.
}
```

This could be used in a form request easily and stays with your model, so you can control it from one central point in a class that cares about this.

```php
namespace App\Http\Requests\Api\Posts;

class StoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return Post::$rules;
    }
}
```

These are a few ways in which you can validate the data. All are correct, and all can be tested. Which way do you prefer to handle your validation? Do you have a way not mentioned here or in the docs? Let us know on Twitter!
