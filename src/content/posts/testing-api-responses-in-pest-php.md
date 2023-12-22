---
title: Testing API responses in pestPHP
pubDate: 2022-05-11
image: testing-api-responses-in-pest-php.png
description: Efficient API Response Testing in Laravel with pestPHP - Learn to test Laravel API responses effectively using pestPHP and fixtures.
---

I get asked about API response testing a lot, how should you do it, and where to start. I have a general rule when it comes to testing APIs, and that rule is: "test your code, and your code only". What do I mean by this? Let me explain:

In your application you are writing code that integrates with an API (this API will be out of your control), and you will most likely use some library of package to integrate with this API (another thing that is out of your control). So do not spend time trying to mock and replicate the behaviour of libraries or services that you have no control over, it will take you more time than is worth it. Instead focus your testing efforts on what you can control; how you send a request and how you respond to API responses. Beyond that there isn't much you can do.

I have previously written blog posts about how to integrate with 3rd party APIs in Laravel, so I am not going to go into too much detail on the how part and focus purely on the testing side. Imagine we have 3 endpoints we need to integrate with:

- a `GET` endpoint
- a `POST` endpoint
- a `DELET` endpoint

This is a typical CRUD style behaviour where you want to `READ` some data, `CREATE` some data and `DELETE` some data. I will use a fictional API for this, as it is the approach that is important not the specifics of the API.

*Our API*

Our API is a simple API that lets us manage a library of books that we have access to, nothing exciting. We can add new books to this API and we can remove books when we have gifted them or got rid of them in someway. So let us start with the first idea, getting a list of books that we have in our library. For the interest of simplicity I am not going to handle authentication in these examples. The examples I will use the Laravel Http facade to make this even more straight forward.

```php
$response = Http::get('https://books-api.com/books');
```

Perfect we have made a request and received a response, now we can trust that the Http facade here has been well tested by the Laravel team so we do not need to test that a request was actually sent here. All we need to do is test that the response is something that we expect it to be. This is where using a library like pestPHP really comes in handy as the language you use for testing is very human readable.

```php
it('can get a list of books from the API', function () {
    $response = Http::get('https://books-api.com/books');

    expect($response->json())->toEqual('??? what goes here ???');
});
```

As you can see from the example above we are making a request, and testing that the JSON response is going to equal something that we can work with. How do we do this part? To do this we need to open us `tests/Pest.php` and add a custom functions to allow us to work some magic. What this will do is allow us to load in a `Fixture` and pass this into the Http Facade for the response.

```php
function fixture(string $name): array
{
    $file = file_get_contents(
        filename: base_path("tests/Fixtures/$name.json"),
    );

    if(! $file) {
        throw new InvalidArgumentException(
            message: "Cannot find fixture: [$name] at tests/Fixtures/$name.json",
        );
    }

    return json_decode(
        json: $file,
        associative: true,
    );
}
```

As you can see, I typically create a directory called `Fixtures` inside my tests directory so that I can store example reponses from the API, to test against.

So let us walk through the testing code one more time, but this time we are going to fake the request and test the response.

```php
it('can get a list of books from the API', function () {
    $responseData = fixture('BooksApi/book-list');

    Http::fake([
        '*' => Http::response(
            body: $responseData,
            status: 200,
        ),
    ]);

    $response = Http::get('https://books-api.com/books');

    expect($response->json())->toEqual($responseData);
});
```

So what we are doing is fetching the json data from the fixture, passing this to the `Http::faker()` method so that any requests will return this as a response, and then expecting that when we make a request that our output is what we expect. So the Fixture data itself is usually what you would get from the API documentation, and it might look a little like this:

```json
// tests/Fixtures/BooksApi/book-list.json
{
    "data": {
        [
            {
                "id": "12345",
                "title": "The Lord of The Rings",
                "author": "J R R Tolkien"
            },
            {
                "id": "12346",
                "title": "The Hobbit",
                "author": "J R R Tolkien"
            }
        ]
    }
}
```

So we can extend our test above to clover a little more.

```php
it('can get a list of books from the API', function () {
    $responseData = fixture('BooksApi/book-list');

    Http::fake([
        '*' => Http::response(
            body: $responseData,
            status: 200,
        ),
    ]);

    $books = Http::get('https://books-api.com/books');

    expect($books->json())->toEqual($responseData);

    $books->json('data')->each(function ($book) {
        expect($book['author'])->toEqual('J R R Tolkien');
    });
});
```

So we are now mapping over the request and making sure that it is formatted in the way which we would expect it to be.

The post request we can do the same, we can create some fake data and post it using the Http facade while faking, and test the outcome of our action.

```php
it('can create a new book', function () {
    $responseData = fixture('BooksApi/create-book');

    Http::fake([
        '*' => Http::response(
            body: $responseData,
            status: 201,
        ),
    ]);

    $book = Http::post('https://books-api.com/books', [
        'title' => 'Spock Must Die!',
        'author' => 'James Blish',
    ]);

    expect($books->json())->toEqual($responseData);

    expect($book->json('data'))->title->toEqual('Spok Must Die!');
});
```

We are now testing that the response matches and that when we interogate the data the attributes match what we expect them to be.

The expact same thing can be done with the `DELETE` endpoint, where we send a request to an endpoint and expect the response to be formatted in a specific way.

```php
it('can delete a book from the API', function () {
    Http::fake([
        '*' => Http:response(
            data: null,
            status: 204,
        ),
    ]);

    $response = Http::delete('https://books-api.com/books/12345');

    expect($response->status())->toEqual(204);
});
```

In the above example our API is returning no data as we just deleted the resource so all we need to do is check that the status code matches. Beyond that it is not important for our application to know about anything, we care that we requested an action and we got the expected answer back from the API confirming our action was completed or at the least listened to.

API testing doesn't have to be hard, and you can go very indepth with it, but you only need to go as deep as your application cares about. Going beyond this is wasting valuable time you could be using in other areas of your code.
