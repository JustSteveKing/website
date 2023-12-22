---
title: Adventures in PHP - PHP URI Builder
pubDate: 2020-10-13
image: adventures-in-php-php-uri-builder.png
description: Introducing the 'uri-builder' package; a versatile PHP tool offering a fluent interface for effortless URI string creation, simplifying API calls and enhancing URL manipulation.
---

I would like to announce my latest package *uri-builder* which is a fluent
interface for building a URI string. Now, it might sound simple - and you
might wonder why did I build this. So without further ado, let me explain:


A lot of us have been there before; we need to build a URI to call a 3rd party API but juggling things like query parameters and paths can be a pain. In php we have `parse_url` which is *almost* really good for parsing a url. The main problem I have with this function is that you cannot guarantee it's outcome, also there is no reverse of it!


This was the deciding factor for me to build a package to handle this for me. I build quite a few Software Development Kits for clients and for open source, and it is always a bit of a pain not having a clean way to build and pass URLs through to methods, and not having this aspect of our code as testable as it could be.


Anytime I start a new package, it is usually because I am trying to solve a problem I had encountered or one that I know I will encounter before too long. Unlike when building an application or an api, where you start with domain modelling and move onto testing then implementation, building a package I always take a very specific route;


* Design the package API: How do I want to work with this package, what makes sense, and how many hoops do I have to jump through for simple and more complex functionality.

* Write tests around the functionality I have planned: This is usually where I take a second pass at how complicated the packages API is.

* Write implementation code: This is where I put code into action, and where I worry less about how the package API works and more about writing good code that is property Type Hinted.

* Build a test implementation, aside from code tests: I find this step extremely helpful, I typically have an `examples/test.php` file that I use locally (never commited) where I play with the code I have created. This is aside from any programatic tests I write and any design that I have done. This is usually where I notice potential bugs, and anywhere I feel the package could be improved.

* Write a well documented README so that I can explain how to install and use the package I am creating.

* Run static analysis and code checker tools, to make sure that everything is to a quality I am happy to publish.

* Publish to github and make sure the tests run on more than just my local machine.

* Submit my package to packagist, and hook up things like Scrutinizer (which even to this day I struggle with consistency).


Every package I build takes this approach, and it takes it for a reason.


Enough of that segway, back to the URI Builder package.


So, using the built in `parse_url` you are returned with an array, and you then also have to pass arguments after running if you want additional parts to the URI you just passed it. You also may get an array back, you may get false, oh and the array could \_also\_ be empty.


You can feel the frustration right there in that sentence. In 2020, where we have AI reminding us that we have an appointment at our doctors and that there is light traffic so may need to leave a little earlier than usual - parse_url can't guarantee what it is going to give us.


My first thought on this package, was that I need to guarantee a minimum that can be passed to the class that will alow it to run, otherwise if there is an issue, or we aren't going to get the return we would hope for, or for anything else: throw a `RuntimeException` - halt the process and deal with this issue, because this URL is malformed or missing parts, so a future part of your application that may require this URI is *not* going to function properly.


I added 2 ways to use this package, you can either build this up programatically:


```php
use JustSteveKing\UriBuilder\Uri;

// Creates a URI for https://www.juststeveking.uk
$uri = Uri::build()
  ->addScheme('https') // https
  ->addHost('www.juststeveking.uk') // https://www.juststeveking.uk
  ->addPath('php-online-the-story-so-far') // https://www.juststeveking.uk/php-online-the-story-so-far
  ->addFragment('top'); // https://www.juststeveking.uk/php-online-the-story-so-far#top

// Use a magic method to output the URI
echo (string) $uri; // https://www.juststeveking.uk/php-online-the-story-so-far#top

// Use the internal function to output the URI
echo $uri->toString(); // https://www.juststeveking.uk/php-online-the-story-so-far#top
```


Alternatively, you can build the object from a string as an alternative to `parse_url`:


```php
use JustSteveKing\UriBuilder\Uri;

$uri = Uri::fromString("https://www.juststeveking.uk/php-online-the-story-so-far#top");

$uri->scheme(); // https
$uri->host(); // www.juststeveking.uk
$uri->path(); // php-online-the-story-so-far
$uri->fragment(); // top
$uri->addPath('my-first-go-module-go-api-problem');

echo $uri->toString(); // https://www.juststeveking.uk/my-first-go-module-go-api-problem#top
```

As you can see these pieces that make up our URI are very easily mutated and changed as needed. There is no need for immutable behaviour here - the purpose of this library is to allow you to build and change URIs as and when you need - even if it is the same instance.