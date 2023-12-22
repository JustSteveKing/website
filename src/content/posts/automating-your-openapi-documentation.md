---
title: Automating your OpenAPI Documentation
pubDate: 2022-10-21
image: automating-your-openapi-documentation.png
source: https://laravel-news.com/automating-your-openapi-documentation
partner: Laravel News
description: Learn to automate API documentation in Laravel with a design-first approach using OpenAPI, Scribe, and efficient pagination in this practical tutorial.
---

Over the years, as developers, we have always looked for ways that we can automate our documentation, from PHPDoc to Swagger and beyond. In recent years that has been a significant shift in the API world to adopt a more design-first-led approach to API documentation. This was mainly spurred by the creation of the OpenAPI specification, which is the replacement for Swagger.

As developers, we often don't have the time or inclination to dive into a design-first approach to our APIs - this is just a fact. While it might be best practice, and what everyone is saying. In reality, we are paid to build and ship features, so we often skip steps. What if I told you that you could add one small step to your workflow that would allow you to build API documentation as you go?

Let's get started. In this tutorial, I will build an utterly fictional API with no purpose, and it won't be how I would typically build an API. This is for a reason, though, as I want you to focus purely on the steps I take.

I won't go through the initial setup steps, as this has been covered a lot in the past. I will make many assumptions in this tutorial - mostly around you knowing how to set up and install Laravel, but also about using artisan to generate classes.

We have a Laravel project open in our IDE, and we need to add some functionality. I find it helpful when building APIs to assess the purpose of the API. Try to understand why it is being built and what it is being built for. This allows us to understand what is going to be useful for our API and stops us from adding more endpoints that simply aren't needed.

We will be building a simple bookshelf API in this tutorial. It will allow us to create some pretty basic functionality - so that we have a purpose for what we are building. This API aims at consumers who can connect to our API to manage their books. The most important thing to these users is a way to see their books and add books quickly. There would be other functionality available eventually but always start an API with what is the primary purpose that every user will need.

Create a new model, migration, and factory for the Book model. This will be the primary model within our API. The attributes you want on this model aren't that important for this tutorial - but I will walk through them anyway:

```php
public function up(): void
{
    Schema::create('books', static function (Blueprint $table): void {
        $table->id();

        $table->string('title');
        $table->string('subtitle')->nullable();
        $table->text('description');
        $table->string('language');

        $table->unsignedBigInteger('pages');

        $table->json('authors');
        $table->json('categories');
        $table->json('images');
        $table->json('isbn');

        $table->date('published_at');
        $table->timestamps();
    });
}
```

This reflects the Google Books API somewhat. We have a book title and subtitle, which is the book's name. The description and language explain what the book is about and in what language. We have a page count to see whether it is a large book. Then we have authors, categories, images, and ISBNs to add extra information. Finally, there is the published date.

Now that we have the model and database, we can start looking into the API itself. Our first step will be to install a package that lets us generate our API documentation. There is an excellent package called [Scribe](https://scribe.knuckles.wtf/) that you can use, which works in both Laravel and simple PHP applications. You can install it using the following composer command:

```bash
composer require --dev knuckleswtf/scribe
```

Once you have installed this, you can follow the setup instructions to get this working within your application. Once this is installed, and the configuration is published - you can do a test run of the API doc generation to ensure it works as expected. You should get something like this out of the box:

```yaml
openapi: 3.0.3
info:
  title: Laravel
  description: ''
  version: 1.0.0
servers:
  -
    url: 'http://localhost:8000'
paths: []
tags: []
```

Now that we know it is working, we can look to add a few routes to ensure that they are used in the OpenAPI generation.

Let us start with our first routes around fetching books, getting a list of books, and getting a single book.

```php
Route::prefix('books')->as('books:')->middleware(['api'])->group(static function (): void {
    Route::get(
        '/',
        App\Http\Controllers\Api\Books\IndexController::class,
    )->name(
        name: 'index',
    );

    Route::get(
        '{book}',
        App\Http\Controllers\Api\Books\ShowController::class,
    )->name(
        name: 'show',
    );
});
```

We have two routes under the `books` prefix, and both are `GET` routes that require no authentication. These will be part of the public API that anyone can access.

Now we have the routes and controllers in place. We need to think about how we want to handle these routes. We want to sort and filter our requests so that we can request specific lists of books. To achieve this, we will use the [Spatie Laravel Query Builder](https://github.com/spatie/laravel-query-builder) package, providing a clean interface to search and filter what we need. Let's get this installed using the following composer command:

```bash
composer require spatie/laravel-query-builder
```

Once this has been installed, we will be able to think about how to filter our API requests to get the correct list of books. With all good APIs, there is pagination. To achieve this, we could use the built-in paginator from Laravel. However, [Aaron Francis](https://aaronfrancis.com/2022/efficient-pagination-using-deferred-joins) created a paginator called [Fast Paginate](https://github.com/hammerstonedev/fast-paginate) which is much more performant - something important when it comes to an API. You can install this using the following composer command:

```bash
composer require hammerstone/fast-paginate
```

Let's combine these two things so we can build up a collection and return a paginated result.

```php
return QueryBuilder::for(
    subject: Book::class,
)->allowedFilters(
    filters: ['language', 'pages', 'published_at'],
)->fastPaginate();
```

This works well for our use case - however, I am not a fan of returning query results directly from your API. We should always transform the response using an API resource to a controllable format. Laravel has built-in resources, or you can use the[ PHP Leagues Fractal](https://fractal.thephpleague.com/) package, which is pretty good. In this example, I will use a package I have [written about before](https://laravel-news.com/json-api-resources-in-laravel), so I won't go into detail. Eventually, we should end up with a controller that looks like the following or at least closely resembles it:

```php
final class IndexController
{
    public function __invoke(Request $request): JsonResponse
    {
        return new JsonResponse(
            data: BookResource::collection(
                resource: QueryBuilder::for(
                    subject: Book::class,
                )->allowedFilters(
                    filters: ['language', 'pages', 'published_at'],
                )->fastPaginate(),
            ),
        );
    }
}
```

So far, this will only register our route in the OpenAPI specification, which is better than nothing. But with some extra work, we can document the parameters and group things, making a lot more sense. In Scribe, you can do this using either DocBlocks or Attributes. I prefer to use DocBlocks myself for this, as there aren't attributes for all of the fields you would want to use. Let me show you an example, and I will walk you through everything I have done.

```php
final class IndexController
{
    /**
     * @group Book Collection
     *
     * Get all Books from the API.
     *
     * @queryParam filter[language] Filter the books to a specific language. filter[language]=en
     * @queryParam filter[pages] Filter the books to those with a certain amount of pages. filter[pages]=1000
     * @queryParam filter[published_at] Filter the books to those published on a certain date. filter[published_at]=12-12-1992
     *
     */
    public function __invoke(Request $request): JsonResponse
    {
        return new JsonResponse(
            data: BookResource::collection(
                resource: QueryBuilder::for(
                    subject: Book::class,
                )->allowedFilters(
                    filters: ['language', 'pages', 'published_at'],
                )->fastPaginate(),
            ),
        );
    }
}
```

We start by adding `@group Book Collection` which will group this endpoint under a "Book Collection"  allowing for easier navigation of your API documentation. We then add "Get all Books from the API." which describes the specific endpoint. We then can add additional `@queryParam` entries to document the available query parameters this endpoint takes. Much easier than writing YAML, right!

The Scribe documentation has much more information, and you can go in-depth with what information you add. I have only brushed the basics here - but already you can see how useful this can be. What do you use for your API Documentation? Let us know on Twitter!