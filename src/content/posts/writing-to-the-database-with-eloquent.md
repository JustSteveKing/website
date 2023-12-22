---
title: Writing to the Database with Eloquent
pubDate: 2022-09-29
image: writing-to-the-database-with-eloquent.png
source: https://laravel-news.com/writing-to-the-database-with-eloquent
partner: Laravel News
description: Learn different methods of writing to the database using Laravel's Eloquent ORM, including create, query builders, repositories, actions, and more. Master database interactions with Eloquent.
---

Laravel Eloquent is one of the most powerful and amazing features in a modern framework today. From casting data to value objects and classes, protected the database using fillable fields, transactions, scopes, global scopes, and relationships. Eloquent enables you to succeed in whatever you need to do with the database.

Getting started with Eloquent can sometimes feel intimidating, as it can do so much you are never really sure where to start. In this tutorial, I will focus on what I consider to be one of the essential aspects of any application - writing to the database.

You can write to the database in any application area: a controller, a Job, middleware, artisan command. What is the best way to handle database writes though?

Let's start with a simple Eloquent model with no relationships.

```php
final class Post extends Model
{
    protected $fillable = [
        'title',
        'slug',
        'content',
        'published',
    ];

    protected $casts = [
        'published' => 'boolean',
    ];
}
```

We have a `Post` model that represents a blog post; it has a title, slug, content, and a boolean flag to say if it is published. In this example, let's imagine that the published property defaults to `true` in the database. Now, to begin with, we have told Eloquent that we want to be able to fill in the `title`, `slug`, `content`, and `published` properties or columns. So if we pass anything not registered in the `fillable` array, an exception will be thrown - protecting our application from potential issues.

Now that we know what fields can be filled, we can look at writing data to the database, whether creating, updating, or deleting. If your model inherits the `SoftDeletes` trait, then deleting a record is a write action - but for this example, I will keep it simple; a delete is a delete.

What you have most likely seen, especially in the documentation, is something like the following:

```php
Post::create($request->only('title', 'slug', 'content'));
```

This is what I can standard Eloquent, you have a model, and you call the static method to create a new instance - passing in a specific array from the request. There are benefits to this approach; it is clean and simple, and everyone understands it. I may be a very opinionated developer at times. However, still, I will use this approach, especially if I am in prototyping mode, where it is more about testing an idea over building something long-term.

We can take this one step further by starting a new Eloquent query builder instance on the model before asking for a new instance to be created. This would look like the following:

```php
Post::query()->create($request->only('title', 'slug', 'content'));
```

As you can see, it is still very simple and is becoming a more standardized way to start queries in Laravel. One of the most significant benefits of this approach is that everything after `query` follows the Query Builder Contract, which was recently introduced. Because of how Laravel works under the hood, your IDE will not understand the static calls very well - as it is a static proxy to a method using `__callStatic` over an actual static method. Luckily this is not the case with the `query` method, which is a static method on the Eloquent Model you are extending.

There is the "older" method of building your model to save to the database. However, I rarely see it used very often anymore. I will mention it, though, for clarity:

```php
$post = new Post();
$post->title = $request->get('title');
$post->slug = $request->get('slug');
$post->content = $request->get('content');
$post->save();
```

This is where we would build up the model programmatically, assigning values to properties and then saving it to the database. This was a little long-winded to do and always felt like it was too much effort to achieve. However, this is still an acceptable way to create a new model if this is how you prefer to do it.

So far, we have looked at three different approaches to creating new data in the database. We can use a similar approach to updating data in the database, a static call to `update` or using the query building contract `query()->where('column', 'value')->update()` or finally programmatically setting the property and then `save`. I won't repeat myself here, as it is much the same as above.

What do we do if we aren't sure if the record already exists? For example, we want to create or update an existing post. We will have a column that is what we want to check against in terms of uniqueness - then we pass through an array of values that we want to create or update depending on if it exists.

```php
Post::query()->updateOrCreate(
    attributes: ['slug' => $request->get('slug'),
    values: [
        'title' => $request->get('title'),
        'content' => $request->get('content'),
    ],
);
```

This has some tremendous benefits if you aren't sure if the record will exist, and I recently implemented this myself when I wanted to "ensure" a record was in the database no matter what. For example, for an OAuth 2.0 social login, you can accept the information from the provider and update or create a new record before authenticating the user.

Could we take this a step further? What would be the benefits? You could use a pattern like the Repository Pattern to basically "proxy" the calls you would send to eloquent through a different class. There are a few benefits to this, or at least there used to be before Eloquent became what it is today. Let's look at an example:

```php
class PostRepository
{
    private Model $model;

    public function __construct()
    {
        $this->model = Post::query();
    }

    public function create(array $attributes): Model
    {
        return $this->model->create(
            attributes: $attributes,
        );
    }
}
```

If we were using the DB Facade or plain PDO, then perhaps the Repository Pattern would give us quite a lot of benefits in keeping consistency. Let's move on.

At some point, people decided that moving from a Repository class to a Service class would be a good idea. However, this is the same thing ... Let's not go into that one.

So, we want a way to handle interacting with Eloquent that isn't so "inline" or procedural. A few years ago, I adopted an approach that is now labeled as "actions". It is similar to the Repository Pattern. However, each interaction with Eloquent is its own class instead of a method within one class.

Let's look at this example, where we have a dedicated class for each interaction called an "action":

```php
final class CreateNewPostAction implements CreateNewPostContract
{
    public function handle(array $attributes): Model|Post
    {
        return Post::query()
            ->create(
                attributes: $attributes,
            );
    }
}
```

Our class implements a contract to bind it to the container nicely, allowing us to inject this into a constructor and call the handle method with our data when needed. This is getting increasingly popular, and many people (as well as packages) have started adopting this approach, as you create utility classes that do one thing well - and can easily have test doubles created for them. The other benefit is that we use an interface; if we ever decide to move away from Eloquent (not sure why you would want to), we can quickly change our code to reflect this without having to hunt anything down.

Again, an approach that is pretty good - and has no real downsides, in principle. I mentioned that I am a pretty picky developer, right? Well ...

My biggest problem with "actions" after using them for so long is that we put all of our write, update, and delete integrations under one hood. Actions don't split things up enough for me. If I think about it, we have two different things we want to be able to achieve - we want to write, and we want to read. This reflects partially onto another design pattern called CQRS (Command Query Responsibility Segregation), which is something I have borrowed from a little. In CQRS, typically, you would use a command bus and a query bus to read and write data, typically emitting events to be stored using event sourcing. However, sometimes that is a lot more work than you need. Don't get me wrong, there is definitely a time and place for that approach, but you should only reach for it when you need to - otherwise, you will over-engineer your solution from the smallest part.

So I split my write actions into "Commands" and my read actions into "Queries" so that my interactions are separated and focused. Let's have a look at a Command:

```php
final class CreateNewPost implements CreateNewPostContract
{
    public function handle(array $attributes): Model|Post
    {
        return Post::query()
            ->create(
                attributes: $attributes,
            );
    }
}
```

Would you look at that, other than the class naming, it is the same thing as an action. This is by design. Actions are an excellent way to write to the database. I find they tend to get crowded too quickly.

What other ways could we improve on this? Introducing a Domain Transfer Object would be a good place to begin, as it provides type safety, context and consistency.

```php
final class CreateNewPost implements CreateNewPostContract
{
    public function handle(CreatePostRequest $post): Model|Post
    {
        return Post::query()
            ->create(
                attributes: $post->toArray(),
            );
    }
}
```

So we are now introducing type safety in an array where we previously relied on arrays and hoped things went the right way. Yes, we can validate to our hearts' content - but objects have a better consistency.

Is there any way we could improve upon this? There is always room for improvement, but do we need to? This current approach is reliable, type-safe, and easy to remember. But, what do we do if the database table locks before we can write, or if we have a blip in network connectivity, maybe Cloudflare goes down at just the wrong time.

Database Transactions will save our butts here. They aren't used as much as they probably should be, but they are a powerful tool that you should consider adopting soon.

```php
final class CreateNewPost implements CreateNewPostContract
{
    public function handle(CreatePostRequest $post): Model|Post
    {
        return DB::transaction(
            fn() => Post::query()->create(
                attributes: $post->toArray(),
            )
        );
    }
}
```

We got there in the end! I would be jumping for joy if I saw code like this in a PR or a code review I had to do. However, do not feel like you have to write code this way. Remember, it is perfectly ok to just inline static `create` if it does the job for you! It is important to do what you are comfortable with, what will make you effective - not what others say you should be doing in the community.

Taking the approach we just looked at, we could approach reading from the database in the same way. Break down the problem, identify the steps and where improvements could be made, but always question if maybe you are taking it a step too far. If it feels natural, it is probably a good sign.

How do you approach writing to the database? How far along the journey would you go, and when is too far? Let us know your thoughts on Twitter!