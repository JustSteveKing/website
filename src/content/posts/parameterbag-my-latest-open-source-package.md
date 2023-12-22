---
title: ParameterBag - My latest open source package
pubDate: 2020-05-23
image: parameterbag-my-latest-open-source-package.png
description: Discover ParameterBag, a PHP package that simplifies data handling by replacing arrays on objects, making code cleaner and more efficient.
---

Every now and then you find youself writing the same bit of code in many
places, sometimes it's a simple trait or even an interface. For me it is a way
to replace standard arrays on PHP classes. In many of my projects and packages
I typically have something I would call a container object, something that's
main purpose is to hold items passed to it and allow easy interaction with
those items. An array would allow for this, but it always feel combersome
having to dive into the `array_` functions when writing PHP. One of my more
recent projects was an API SDK builder called [SuitcasePHP
Builder](https://packagist.org/packages/suitcasephp/builder) which I built
because I found myeslf writing the same code over and over again for APIs that
either didn't have a PHP SDK, or their SDK was nont a quality I would like to
use (aka not updated in over 3 years).

While building this package, I had to find a nice way to handle query string parameters being passed through and store them before appending them onto the end of the endpoint we would be calliing. Those who have been in this situation before have probably reached for the trusty PHP [http_build_query](https://www.php.net/manual/en/function.http-build-query.php) before, most likely on more than one occasion. The main problem that I had with this native function, and a lot of the native PHP functions is that, well the documentation is not good. A lot of the more helpful parts are typically from comments and suggestions about how other people have used it - not a great way to figure out what all the different options are. So I decided instead I would build my own mechanism of achieving something of a similar nature.

I introduce [ParameterBag](https://packagist.org/packages/juststeveking/parameterbag) which does what it says on the tin, it is a flexible class that is aimed at replacing arrays on objects. After using this several times in projects and packages, including a new one I am building to work with [neo4j in PHP](https://neo4j.com/), I decided it was about time to promote this to a first party package in itself. The concept of the package is relatively straight forward, instead of paying `protected array $items` when adding a class attribute you type cast `protected ParameterBag $items` instead.

From here you can add a class method to simply return the items, and away you go. While it may not be the most ground breaking package to be released I have already found it very useful. Below is a simple example of using the package:

```php
namespace App\Support;

use JustSteveKing\ParameterBag\ParameterBag;

class Config
{
  protected ParameterBag $items;

  private function __construct(array $items)
  {
    $this->items = new ParameterBag($items);
  }

  public static function create(array $items)
  {
    return new self($items);
  }

  public function getItems() : ParameterBag
  {
    return $this->items;
  }
}
```

Now we have a simple config class we can start to work with it:

```php
$settings = require __DIR__ . '/../config/settings.php';

$config = App\Support\Config::create($settings);

if ($config->getItems()->has('database')) {
  // do something with our database here .....
}
// We can even accept some information through a HTTP request to change our config settings
// although not 100% recommended due to security implications
$queryParameters = $request->getQuery();

if (in_array($queryParameters, 'tenant_id')) {
  $config->getItems()->set('tenant_id', $queryParameters['tenant_id']);
}
```

In the example of an SDK builder we could even create a something like the following:

```php
namespace Acme\SDK;

use JustSteveKing\ParameterBag\ParameterBag;

class QueryParameters
{
  protected ParameterBag $parameters;

  public function __construct(string $queryString)
  {
    $this->parameters = ParameterBag::fromString($queryString);
  }
}
```

What the `ParameterBag::fromString()` allows us to do is pass in a string for example: `foo=bar&a=b` and turn this into an associative array in our bag. The fromString method allows for a seecond optional parameter to define the delimiter. What this meant while building my SDK package is that I could follow JSON:API spec nicely with a little extra processing and allow a string like `filter[name]=Jim&include=posts,profile&sort=-id` and not have to worry about the string encoding while building up my query at all.

As I said, this isn't the most ground breaking package to be published - but it has already proven itself useful in my day to day - and it has already saved me time in writing this logic in any project again. Hooray for open source!