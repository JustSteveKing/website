---
title: Building your own Laravel Packages
pubDate: 2022-08-05
image: building-your-own-laravel-packages.png
source: https://laravel-news.com/building-your-own-laravel-packages
partner: Laravel News
description: Master the art of building Laravel packages with our step-by-step guide. Discover package design, artisan commands, DTOs, and quality assurance for a robust Laravel package.
---

Sharing code has never been more accessible, and installing PHP packages has become convenient; building packages however? In this tutorial, I will walk through how to start and publish a new Laravel package. Going through the setup and tools you can use to ensure your package quality and that if you build and publish something, you do it well.

So what are we going to build? What package could we create that is simple enough that you find it easy to learn the process but has enough parts to understand it. We will build a package with an artisan command that will allow us to create Data Transfer Objects in Laravel and PHP 8.1, hoping to upgrade to PHP 8.2 as soon as it is available. Alongside this, we will also have a Facade for hydrating Data Transfer Objects, herein referred to as DTOs.

So, where do we begin when building a new package? What should be our first step? Firstly, what I like to do when I am about to create a package is search packagist to make sure I am not building something already available or feature-rich enough that I will waste my time. We do not want to recreate the wheel after all.

Once I am sure I am building something useful that doesn't exist, I think about what my package needs. In our case, our requirements are relatively simple. We will have 3-4 main classes that we want to create, and that is it. Deciding the structure of your package is usually one of the first steps you must overcome. How can you create this code to share it with others in a way that people are used to? Luckily the Laravel community has you covered on this. Template repositories are available for package skeletons; you only need to search for them. Companies such as Spatie and Beyond Code have some of the best package skeletons that come fully featured and will save you a great deal of time.

However, in this tutorial, I will not use a skeleton package, as I feel it is essential to learn how to do a task before using a tool to do the job for you. So we will start with a blank slate. Firstly you will need to think of a name for your package. I am going to call mine "Laravel Data Object Tools" as eventually, I would like to build up a toolset to be able to work with DTOs in my application easier. It tells people what the purpose of my package is and allows me the scope to expand it as time goes on.

Create a new directory with your package name and open this in your code editor of choice so we can start the setup. The first thing I do with any new package is initialized it as a git repository, so run the following git command:

```bash
git init
```

Now that we have a repo to work with, we know that we will be able to commit things to source control and allow us to version our package when it is time. Creating a PHP package requires one thing straight away, a `composer.json` file that will tell Packagist what this package is and what it needs to run. You can use the command line composer tool or create the composer file by hand. I usually use the command line `composer init` as it is an interactive way to set this up; however, I will show the output of the start of my composer file so you can see the result:

```json
{
  "name": "juststeveking/laravel-data-object-tools",
  "description": "A set of tools to make working with Data Transfer Objects easier in Laravel",
  "type": "library",
  "license": "MIT",
  "authors": [
    {
      "role": "Developer",
      "name": "Steve McDougall",
      "email": "juststevemcd@gmail.com",
      "homepage": "https://www.juststeveking.uk/"
    }
  ],
  "autoload": {
    "psr-4": {
      "JustSteveKing\\DataObjects\\": "src/"
    }
  },
  "autoload-dev": {
    "psr-4": {
      "JustSteveKing\\DataObjects\\Tests\\": "tests/"
    }
  },
  "require": {
    "php": "^8.1"
  },
  "require-dev": {},
  "minimum-stability": "dev",
  "prefer-stable": true,
  "config": {
    "sort-packages": true,
    "preferred-install": "dist",
    "optimize-autoloader": true
  }
}
```

This is the basis of most of my packages, and whether that be a Laravel or plain PHP package, it sets me up in a way that I know that I will have consistency. We will need to add a few supporting files to our package to get started. Firstly we need to add our `.gitignore` file so that we can tell version control what files and directories we do not want to commit:

```
/vendor/
/.idea
composer.lock
```

This is the start of the files we want to ignore. I am using PHPStorm, which will add a meta-directory called `.idea` that will contain all the information my IDE needs to understand my project - something I do not want to commit to version control. Next, we need to add some git attributes, so that version control knows how to process our repository. This is called `.gitattributes`:

```
* text=auto

*.md diff=markdown
*.php diff=php

/.github export-ignore
/tests export-ignore
.editorconfig export-ignore
.gitattributes export-ignore
.gitignore export-ignore
CHANGELOG.md export-ignore
phpunit.xml export-ignore
```

When creating a release, we tell our source control provider what files we want to ignore and how to handle diffs. Finally, our last supporting file will be our `.editorconfig` which is a file that tells our code editor how to handle the files we are writing:

```
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 4
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false

[*.{yml,yaml,json}]
indent_size = 2
```

Now that we have the supporting files for version control and our editor, we can start thinking about what our package needs regarding dependencies. What dependencies will our package rely on, and which versions are we using? Let's get started.

As we are building a Laravel package, the first thing we will need is Laravels Support package, so install that using the following composer command:

```bash
composer require illuminate/support
```

Now that we have something to start with let's look at the first important part of the code that our package will need; the Service Provider. The service provider is a crucial part of any Laravel package, as it tells Laravel how to load the package and what is available. To begin with, we want to let Laravel know that we have a console command that we can use once installed. I have called my service provider `PackageServiceProvider` as I have no imagination, and naming things is hard. Feel free to change the naming of your own should you wish. I add my service provider under `src/Providers` as it is familiar with a Laravel application.

```php
declare(strict_types=1);

namespace JustSteveKing\DataObjects\Providers;

use Illuminate\Support\ServiceProvider;
use JustSteveKing\DataObjects\Console\Commands\DataTransferObjectMakeCommand;

final class PackageServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        if ($this->app->runningInConsole()) {
            $this->commands(
                commands: [
                    DataTransferObjectMakeCommand::class,
                ],
            );
        }
    }
}
```

I typically make classes I know do not wish to be extended final, as doing so would change how I want the package to operate. You do not need to do this. It is a judgment call you need to make for yourself. So we now have a command registered. We should think about creating this. As you can tell from the naming, it is a command that will generate other classes for us - a little different from your typical artisan command.

I have created a class called `DataTransferObjectMakeCommand`, which is very wordy but explains what it does inside of `src/Console/Commands`. As you can see, when creating these classes, I try to reflect a directory structure familiar to Laravel developers. Doing this makes working with the package a lot easier. Let's take a look at the code for this command:

```php
declare(strict_types=1);

namespace JustSteveKing\DataObjects\Console\Commands;

use Illuminate\Console\GeneratorCommand;
use Illuminate\Support\Str;

final class DataTransferObjectMakeCommand extends GeneratorCommand
{
    protected $signature = "make:dto {name : The DTO Name}";

    protected $description = "Create a new DTO";

    protected $type = 'Data Transfer Object';

    protected function getStub(): string
    {
        $readonly = Str::contains(
            haystack: PHP_VERSION,
            needles: '8.2',
        );

        $file = $readonly ? 'dto-82.stub' : 'dto.stub';

        return __DIR__ . "/../../../stubs/{$file}";
    }

    protected function getDefaultNamespace($rootNamespace): string
    {
        return "{$rootNamespace}\\DataObjects";
    }
}
``` 

Let's walk through this command to understand what we are creating. Our command wants to extend the `GeneratorCommand` as we want to generate a new file. This is useful to understand, as there is little documentation on how to do this. The only thing we need for this command is a method called `getStub` - which is what the command needs to know how to load the location of the stub file to aid in the generation of the file. I have created a directory in the root of my package called `stubs`, a familiar place for Laravel applications. You will see here that I am checking the installed PHP version to see if we are on PHP 8.2, and if we are - we want to load in the correct stub version to take advantage of read-only classes. The chances of this right now are pretty low - however, we are not that far away. This approach helps generate files for specific PHP versions, so you can ensure support for each version you wish to support.

Finally, I have set the default namespace for my DTOs, so I know where I want these to live. I do not want to overpopulate the root namespace after all.

Let's take a quick look at these stub files firstly, the default stub:

```php
<?php

declare(strict_types=1);

namespace {{ namespace }};

use JustSteveKing\DataObjects\Contracts\DataObjectContract;

final class {{ class }} implements DataObjectContract
{
    public function __construct(
        //
    ) {}

    public function toArray(): array
    {
        return [];
    }
}
```

Our DTO will implement a contract to guarantee consistency - something I like to do with as many classes as possible. Also, our DTO class is final. We will not likely want to extend this class, so making this final by default is a sensible approach. Now let's have a look at the PHP 8.2 version:

```php
<?php

declare(strict_types=1);

namespace {{ namespace }};

use JustSteveKing\DataObjects\Contracts\DataObjectContract;

readonly class {{ class }} implements DataObjectContract
{
    public function __construct(
        //
    ) {}

    public function toArray(): array
    {
        return [];
    }
}
```

The only difference here is that we are making our DTO class read-only to take advantage of the newer features of the language.

How can we test this? Firstly, we want to install a testing package to allow us to make sure that we can write tests for running this command - I will be using [pestPHP](https://pestphp.com/) for this, but using PHPUnit will work in a very similar way.

```bash
composer require pestphp/pest --dev --with-all-dependencies
```

This command will ask you to allow pest to use composer plugins, so make sure you say yes to this if you need pest plugins for your tests, such as parallel testing. Next, we will need a package that allows us to use Laravel in our tests to ensure our package is working effectively. This package is called Testbench and is one I swear by when building Laravel packages.

```bash
composer require --dev orchestra/testbench
```

The easiest way to initialize a test suite in our package is to use pestPHP to initialize it for us. Run the following console command:

```bash
./vendor/bin/pest --init
```

This will generate the `phpunit.xml` file and a `tests/Pest.php` file that we use to control and extend pest itself. Firstly, I like to make a few changes to the PHPUnit configuration file that pest will use. I like to add the following options to make my testing easier:

`stopOnFailure` I set to true
`cacheResults` I set to false

I do this because if a test fails, I want to know about it immediately. Early returns and failures are things that help us build something that we have more confidence in. Caching Results speeds up the testing of your package. However, I like to ensure that I run my test suite from scratch each time to ensure it works how I expect.

Let us draw our attention now to a default test case that we need our package tests to run off of. Create a new file under `tests/PackageTestCase.php` so we can control our tests more easily.

```php
declare(strict_types=1);

namespace JustSteveKing\DataObjects\Tests;

use JustSteveKing\DataObjects\Providers\PackageServiceProvider;
use Orchestra\Testbench\TestCase;

class PackageTestCase extends TestCase
{
    protected function getPackageProviders($app): array
    {
        return [
            PackageServiceProvider::class,
        ];
    }
}
```

Our `PackageTestCase` extends the test bench `TestCase` so we can borrow behavior from the package for building our test suite. Then we register our package service provider to ensure that our package is loaded into the test application.

Now let us look at how we might test this. Before we write our tests, we want to ensure that what we test covers the current behavior of the package. So far, all our test does is provide a command that can be run to create a new file. Our tests directory structure will mirror our package structure, so make our first test file under `tests/Console/Commands/DataTransferObjectMakeCommandTest.php` and let's start our first test.

Before we write our first test, we need to edit the `tests/Pest.php` file to ensure that our test suite uses our `PackageTestCase` properly.

```php
declare(strict_types=1);

use JustSteveKing\DataObjects\Tests\PackageTestCase;

uses(PackageTestCase::class)->in(__DIR__);
```

To start with, we want to ensure that we can run our command and that it runs successfully. So add the following test:

```php
declare(strict_types=1);

use JustSteveKing\DataObjects\Console\Commands\DataTransferObjectMakeCommand;

use function PHPUnit\Framework\assertTrue;

it('can run the command successfully', function () {
    $this
        ->artisan(DataTransferObjectMakeCommand::class, ['name' => 'Test'])
        ->assertSuccessful();
});
```

We are testing that when we call this command, it runs without error. One of the most critical tests if you ask me, if it errors, then it means something went wrong.

Now that we know that our test can run, we also want to ensure that the classes are created. So let us write this test next:

```php
declare(strict_types=1);

use Illuminate\Support\Facades\File;
use JustSteveKing\DataObjects\Console\Commands\DataTransferObjectMakeCommand;

use function PHPUnit\Framework\assertTrue;

it('create the data transfer object when called', function (string $class) {
    $this->artisan(
        DataTransferObjectMakeCommand::class,
        ['name' => $class],
    )->assertSuccessful();

    assertTrue(
        File::exists(
            path: app_path("DataObjects/$class.php"),
        ),
    );
})->with('classes');
```

Here we are using a Pest Dataset to run through some options, a little like a PHPUnit Data Provider. We loop through each option and call our command, asserting that the file exists. We now know that we can pass a name to our artisan command and create a DTO for us to use in our application.

Lastly, we want to build a facade for our package to allow easy hydration of our DTOs. Having a DTO often is only half the battle, and yes, we could add a method to our DTO itself to call statically - but we can simplify this process quite a lot. We will facilitate this by using a really useful package by [Frank de Jonge](https://twitter.com/frankdejonge) in his [Eventsauce package](https://github.com/EventSaucePHP/ObjectHydrator), called "object hydrator". To install this run the following composer command:

```bash
composer require eventsauce/object-hydrator
```

It is time to build a wrapper around this package so we can use it nicely, so let's create a new class under `src/Hydrator/Hydrate.php`, and we will also create a contract alongside this should we want to swap implementation at any point. This will be `src/Contracts/HydratorContract.php`. Let us start with the contract to understand what we want this to do.

```php
declare(strict_types=1);

namespace JustSteveKing\DataObjects\Contracts;

interface HydratorContract
{
    /**
     * @param class-string<DataObjectContract> $class
     * @param array $properties
     * @return DataObjectContract
     */
    public function fill(string $class, array $properties): DataObjectContract;
}
```

All we need is a way to hydrate an object, so we take the class name of the object and an array of properties to return a data object. Let us now have a look at the implementation:

```php
declare(strict_types=1);

namespace JustSteveKing\DataObjects\Hydrator;

use EventSauce\ObjectHydrator\ObjectMapperUsingReflection;
use JustSteveKing\DataObjects\Contracts\DataObjectContract;
use JustSteveKing\DataObjects\Contracts\HydratorContract;

class Hydrate implements HydratorContract
{
    public function __construct(
        private readonly ObjectMapperUsingReflection $mapper = new ObjectMapperUsingReflection(),
    ) {}

    public function fill(string $class, array $properties): DataObjectContract
    {
        return $this->mapper->hydrateObject(
            className: $class,
            payload: $properties,
        );
    }
}
```

We have an object mapper passed into the constructor or created in the constructor - which we then use inside the fill method. The fill method then uses the mapper to hydrate an object. It is simple and clean to use and can be replicated easily should we choose to use a different hydrator in the future. Using this, however, we want to bind the hydrator into the container to allow us to resolve it using dependency injection. Add the following to the top of your `PackageServiceProvider`:

```php
public array $bindings = [
    HydratorContract::class => Hydrate::class,
];
```

Now that we have our hydrator, we need to create a facade so we can call it nicely in our applications. Let's create that now under `src/Facades/Hydrator.php`

```php
declare(strict_types=1);

namespace JustSteveKing\DataObjects\Facades;

use Illuminate\Support\Facades\Facade;
use JustSteveKing\DataObjects\Contracts\DataObjectContract;
use JustSteveKing\DataObjects\Hydrator\Hydrate;

/**
 * @method static DataObjectContract fill(string $class, array $properties)
 *
 * @see \JustSteveKing\DataObjects\Hydrator\Hydrate;
 */
final class Hydrator extends Facade
{
    /**
     * @return class-string
     */
    protected static function getFacadeAccessor(): string
    {
        return Hydrate::class;
    }
}
```

So our Facade is currently returning the event sauce implementation of the hydrator - which means that we cannot resolve this from the container, so if we switched implementation, we would need to change the facade. This isn't a massive deal for now though. Next, we need to add this alias to our `composer.json` file so that Laravel knows about it when we install the package.

```json
"extra": {
  "laravel": {
    "providers": [
      "JustSteveKing\\DataObjects\\Providers\\PackageServiceProvider"
    ],
    "aliases": [
      "JustSteveKing\\DataObjects\\Facades\\Hydrator"
    ]
  }
},
```

Now that we have registered our Facade, we need to test that it works as expected. Let us walk through how we can test this. Create a new test file under `tests/Facades/HydratorTest.php`, and let's start:

```php
declare(strict_types=1);

use JustSteveKing\DataObjects\Facades\Hydrator;
use JustSteveKing\DataObjects\Tests\Stubs\Test;

it('can create a data transfer object', function (string $string) {
    expect(
        Hydrator::fill(
            class: Test::class,
            properties: ['name' => $string],
        ),
    )->toBeInstanceOf(Test::class)->toArray()->toEqual(['name' => $string]);
})->with('strings');
```

We have created a new dataset called strings, which returns an array of random strings for us to use. We pass this into our test and try to call the fill method on our facade. Passing in a test class, we can create an array of properties to hydrate. We then test that the instance is created and that it matches our expectation when we call the `toArray` method on the DTO. We can use the reflection API to ensure that our DTO is created as expected for our final test.

```php
it('creates our data transfer object as we would expect', function (string $string) {
    $test = Hydrator::fill(
        class: Test::class,
        properties: ['name' => $string],
    );

    $reflection = new ReflectionClass(
        objectOrClass: $test,
    );

    expect(
        $reflection->getProperty(
            name: 'name',
        )->isReadOnly()
    )->toBeTrue()->and(
        $reflection->getProperty(
            name: 'name',
        )->isPrivate(),
    )->toBeTrue()->and(
        $reflection->getMethod(
            name: 'toArray',
        )->hasReturnType(),
    )->toBeTrue();
})->with('strings');
```

We can now be sure that our package works as expected. The final thing we need to do is focus on the quality of our code. In most of my packages, I like to ensure that both coding style and static analysis are running so that I have a reliable package I can trust. Let's start with code styling. To do this, we will install a package called [Laravel Pint](https://laravel-news.com/laravel-pint) which is relatively new:

```bash
composer require --dev laravel/pint
```

I like to use PSR-12 for my code style, so let us create a `pint.json` in the root of our package to make sure that we configure pint to run the standard we want to run:

```json
{
  "preset": "psr12"
}
```

Now run the pint command to fix any code styling issues that aren't meeting PSR-12:

```bash
./vendor/bin/pint
```

Finally, we can install [PHPStan](https://phpstan.org/) so that we can check the static analysis of our code base to make sure that we are as strict and consistent with our types as possible:

```bash
composer require --dev phpstan/phpstan
```

To configure PHPStan, we will need to create a `phpstan.neon` in the root of our package to know the configuration being used.

```yaml
parameters:
    level: 9

    paths:
        - src
```

Finally, we can run PHPStan to ensure that we look good from a type perspective.

```bash
./vendor/bin/phpstan analyse
```

If all went well, we should now see a message saying "[OK] No errors".

The final steps I like to follow for any package build are to write my README and add any specific GitHub actions that I might want to run on the package. I won't add them here because they are long and full of YAML. You can however have a look at the [repository](https://github.com/JustSteveKing/laravel-data-object-tools) yourself to see how these were created.

Have you built any Laravel or PHP packages you want us to know about? How do you approach your package development? Let us know on Twitter!