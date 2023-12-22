---
title: Adventures in PHP - PHP SDK Builder
pubDate: 2020-10-26
image: adventures-in-php-php-sdk-builder.png
description: Explore the world of PHP SDKs and learn how to build efficient, interoperable APIs using Laravel Forge and PSR-18 with this guide on creating adaptable PHP SDKs.
---

I have been working with 3rd party APIs for a very long time. Each time I
usually either pull in their SDK, if there is one available, or I build a
wrapper around their API and work from there. This has been useful and a
relatively standard way to do this. I have also built a handful of PHP SDKs
for APIs that do not have SDKs in PHP, or the ones provided were somewhat sub
par - or I simple wanted to do it my way.

One thing that I have noticed supporting SDKs that I have built, is that there is a tendency to pull in a dependency to handle the Http transport layer. This is common across most SDKs that you will use in PHP.

Herein lies the problem. Let's take an example of building an SDK, and you pull in Guzzle at a specific version. You build the package, release, and install within an application. The application you are building is also using the same version of Guzzle - great! A few months go by, and you need to upgrade your application to the latest version. Suddenly the updated application is using a new version of guzzle, meaning to run your application requires 2 different versions of Guzzle to run. Not cool.

This is where PSR-18 comes in, if you have followed my blog before you would have seen my [article on using PSR-18](https://www.juststeveking.uk/embracing-ps-rs-to-build-an-interoperable-http-client/) which explains how you can avoid this situation by following a newer PSR and adding the interoperability. How can we apply this to an SDK? It sounds like there is a lot to juggle. What if we could just use the one dependency that handles the bootstrapping of an SDK, and just focus on adding the implementation we actually care about?

This was my motivation behind my latest open source package, quite simply called **php-sdk,** which aims to handle the underlaying components that you will find in most PHP SDKs. I am not saying this is a one size fits all, I am saying that this is lycra, it will stretch and fit to a point and if you can't quite make it fit perhaps you need something else.

To illustrate how this package works, I am going to walk through building an SDK for the popular Laravel service called [Laravel Forge](https://forge.laravel.com/). To start with you need to sign up for an account, go to the account part of the site, and create an API Key - take note of this as it will not be displayed again.

Next we want to create our initial Forge Client:

```php
namespace Demo;

use DI\Container;
use Demo\Resources\Server;
use JustSteveKing\PhpSdk\Client;
use JustSteveKing\UriBuilder\Uri;
use JustSteveKing\HttpSlim\HttpClient;
use JustSteveKing\PhpSdk\ClientBuilder;
use Symfony\Component\HttpClient\Psr18Client;
use JustSteveKing\HttpAuth\Strategies\BasicStrategy;

class Forge extends Client
{
    /**
     * Forge constructor.
     * @param string $apikey
     */
    public function __construct(string $apikey)
    {
        parent::__construct(new ClientBuilder(
            Uri::fromString('https://forge.laravel.com'),
            HttpClient::build(
                new Psr18Client(), // http client (psr-18)
                new Psr18Client(), // request factory (psr-17)
                new Psr18Client() // stream factory (psr-17)
            ),
            new BasicStrategy(
                $apikey
            ),
            new Container()
        ));
    }

    /**
     * @param string $apikey
     * @return static
     */
    public static function illuminate(string $apikey): self
    {
        $client = new self($apikey);

        // Add Resources
        $client->addResource('servers', new Server());

        return $client;
    }
}
```

Let's walk through what we are doing here. Firstly we are extending `Client` which is part of the php-sdk package. What this does is bootstrap the vast majority of the components required in our SDK, it will also handle the communication between these components. If we have a look at the constructor for `Forge` we see that we are simply passing an API Key, which is the authentication mechanism for the[ Laravel Forge API](https://forge.laravel.com/api-documentation). From here we will simple construct our parent class, but passing in a [Builder Object](https://en.wikipedia.org/wiki/Builder_pattern) (BO) called `ClientBuilder`. The purpose of this BO is to build a configuration object that can be validated and reduce the cognitive load of passing in loads of parameters into a constructor.

The ClientBuilder expects a certain amount of parameters, so we will pass through a built Uri using my own [Uri builder package](https://packagist.org/packages/juststeveking/uri-builder), meaning that formatting and manipulating this Uri isn't a worry at all, and we can focus on domain code. We then pass through my own [HttpClient](https://packagist.org/packages/juststeveking/http-slim) which is a PSR-18 wrapper, allowing the simple approach to adopting the PSR. Then we pass through something new. I have recently built a new package called [http-auth-strategies](https://github.com/JustSteveKing/http-auth-strategies) which is simple and tested way to build authentication headers for API calls. This currently has 2 options of BasicStrategy which is a simple Authorization header, and NullStrategy which is an empty header for those scenrios where authenorization is not required. This package doesn't care about your implementation, how you want to encode this header, the form of it beyond how to build a correct Http header as per specifications.  Lastly we pass through a container, this container **must** follow PSR-11, so that again we can obtain a level of interoperability. Then we have a client. From here we can do a multitude of things. Our static `illuminate` method is a shortcut to the underlying code allowing us to build and register our SDK client all in one, and it also feels familiar from a Laravel perspective.

You will probably notice I am adding a resource in the `illuminate` method, for servers. Here is the code for the server object:

```php
namespace Demo\Resources;

use JustSteveKing\PhpSdk\Resources\AbstractResource;

class Server extends AbstractResource
{
    /**
     * @var string
     */
    protected string $path = 'api/v1/servers';

    /**
     * @param null $identifier
     * @return $this
     */
    public function databases($identifier = null): self
    {
        $this->with = ['databases'];

        if (!is_null($identifier)) {
            $this->load = $identifier;
        }

        return $this;
    }
}
```

As you can see again we are extending an `AbstractResource`. What this means is that if we did not need to add any other relations or anything to this resource, all we have to do is reference the URI part that this resource related to, and we can start working with them. As you can also see the path for this resource is versioned to a specific part of the API, meaning you can start to version your SDK using namespaces going forward should you wish to. The `databases method`, is a way to build up sub-resources allowing you to select a specific or all databases on a server resource. What this will do under the hood is set the parameters on the resource and allow you to carry on the chain to fullfill your request.

So how do we actually use this code? Here is a simple example:

```php
use Demo\Forge;

$key = "api-key-here";

$forge = Forge::illuminate($key);

// Get all Servers
$servers = $forge->servers->get();

// Get a sinle server with an ID of 1234
$server = $forge->servers->find(1234);

// Create a new server
$newServer = $forge->servers->create([/* array of data */]);

// Update a server, an optional 3rd parameter to send the Http Method, defaults to PATCH
$updated = $forge->servers->update(1234, [/* array of data*/]);

// Delete a server
$deleted = $forge->servers->delete(1234);

// Fetch databases from a server
$databases = $forge->servers->databases()->find(1234);

// Fetch a single database
$database = $forge->servers->databases(4321)->find(1234);
```

So as you can see, we create a new Forge instance using an API key which would usually be loaded through environment variables. We can then access all methods from the AbstractResource allowing us to fluently build our API calls, in a structured and clean way. All of these methods will return a PSR-7 response meaning that there is consistency.

The key takeaway from this library that I am building, is standards and interoperability. When building a library that will allow others to integrate with your API or service, you do not want to enforce anything beyond what you absolitely have to. The only requirements for using this package is PHP7.4, then PSR implementation libraries. Meaning that if you use this library to create your own SDK, you can either define what implementations you want to use or allow the person using your SDK to provide their own.