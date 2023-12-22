---
title: Sauber PHP
pubDate: 2022-05-30
image: sauber-php.png
description: Explore Sauber PHP, a clean and simple micro-framework for small APIs. Learn about its routing, dependency injection, and custom Command Bus in this informative article.
---

I have used a lot of different frameworks in my career, from Zend(Laminas) to Yii, Cake to Codeignitor, SlimPHP to Laravel and more. They all have their own way of doing things, and their own selling points and benefits. Some are strict on their PSR (PHP Standards Recommendation) implementation, while others are a little looser. I have also always wanted to dabble with creating my own micro-framework, one that I can use for small APIs that just need something fast thrown together.

I have always been a fan of SlimPHP, but in version 4 I felt a little disconnected. It turned from a micro-framework to what I felt was just a collection of connecting replaceable components. There is nothing wrong with this, but it made me miss the Slim 2 and 3 days, when the framework came with a little more and I didn't have to reach for additional dependencies. While I see the benefits of what the framework has done to create more iteroperability - it felt like it went from a micro-framework to something where it didn't want to make decisions for you. This made me look a little further into what I could create if I were to make a framework.

I have created a micro-framework, mostly for educational purposes, called Sauber PHP. If you know German, then you know Sauber means 'clean' and what I wanted it to be was a clean and simple micro-framework that did what I needed. It will spin up and work, and follow what I believe to be clean programming principles.

It is currently an idea, that has been implemented, but it isn't really something I would ship to production yet. It is more something for me to play with and inject some programming creativity into, and to see what I can do. So let me do a quick walk through.

## Routing

There is a very simple routing element to Sauber, it uses `league/route` behind the scenes - which is a friendly abstraction around FastRoute. It has a few components; a `Router`, a `Request` class, and a `HttpKernel`.

The Router simply sets up the `league/route` router and builds the base for http traffic, such as creating a Response Factory and the Routing strategy.

The Request class created a new `ServerRequest` using `laminas/diactoros` and returns it, a helper class if anything.

The `HttpKernel` will accept a Request Handler, and then run this through another `laminas` package and run it for us. Clean and simple to use.

I didn't want to reinvent the wheel with this component, I wanted to use some reliable packages and an abstraction around them so that I could use them in a way I felt comfortable. 

## Container

Much like the router, the Container is an abstraction around another PHP League package - this time it is `league/container`. The only thing this package does it set some predefined rules of how we want our container to actually work. It works off of `injectors` which are invokable classes that return bindings. So for example, we have a `RepositoryInjector` it would look like the following:

```php
class RepositoryInjector
{
    /**
     * @return array<class-string,class-string>
     */
    public function __invoke(): array
    {
        return [
            UserRepositoryContract::class => UserRepository::class,
        ];
    }
}
```

So in our application we can create these injectors to define how we want to build up our container. Each module, domain, feature - whatever you want to define your logic in, will have its own injector which you are then able to add the the container as we boot up the application.


## Command Bus

The Command Bus is a custom implementation of the idea, it contains nothing about storage and focuses only on mapping command and queries to their respective handlers, then getting these from the container and diaptching them. It is a simple class, that I find to be useful for how I want to use a command bus in small applications. You can use it like the following:

```php
$bus = new CommandBus();

$bus->command(
    command: CreateUser::class,
    handler: CreateUserHandler::class,
);

$bus->dispatch(
    event: new CreateUser(
        name: 'test user',
    ),
);
```

The repo has a little more information on how this works, and if people are interested I might spend some time working on more extensive documentation for most of the components in the framework.

## Framework

The Framework itself, is one class - but built in a way I build Go APIs. So we have an `Application` class that contains our Router, HttpKernel and Container - and allows us to access each one. It can be booted, which will build our application to a default and allow us to then map routes and finally run the application, or simply dispatch a request. It comes with an `ApplicationContract` so if you want to build up the framework differently by leaning on a DI container you are able to do so - or you can create your own implementation of the Application and it should work in a similar way.

As I have said a few times, this is more of an experiment than anything else, and it is a set of components/packages that I will refactor and chip away at to improve when I find inspiration. This isn't something I expect will replace SlimPHP or Laravel or anything else, it is simply something I built for fun.

An example application would look like the following:

```php
require __DIR__ . '/vendor/autoload.php';

use Sauber\Container\Container;
use Sauber\Framework\Application;

$app = Application::boot(
    container: new Container(),
);

$app->get(
    path: '/',
    handler: function (ServerRequestInterface $request): array {
        return [
            'message' => 'Service Online',
        ];
    },
);

$app->run();
```

As you can see it is simple and callables are the required approach, however this can also be an invokable class:

```php
class RootHandler
{
    /**
     * @param Psr\Http\Message\ServerRequestInterface $request
     * @return array<string,string>
     */
    public function __invoke(ServerRequestInterface $request): array
    {
        return [
            'message' => 'Root Handler.'
        ];
    }
}

$app = Application::boot(
    container: new Container(),
);

$app->get(
    path: '/',
    handler: RootHandler::class,
);

$app->run();
```

It is aimed at being PSR compliant, clean and simple to use. There are sensible default for how I like to write code - and beyond that it is entirely up to you how you use it. There is a template repo that will allow you to `composer create-project` with - but there is no requirement to use it.

I am not expecting people to use this on a day to day basis, but if you fancy giving it a try you can [find the repo here](https://github.com/sauber-php) - let me know on twitter your thoughts, or if you think of a way this could be improved!
