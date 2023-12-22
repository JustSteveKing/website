---
title: Fun with Refactoring
pubDate: 2022-11-24
image: fun-with-refactoring.png
source: https://laravel-news.com/fun-with-refactoring
partner: Laravel News
description: Master the art of Laravel refactoring with Laravel Shift Blueprint, optimizing code for improved performance and management in a real-world Laravel project.
---

Refactoring isn't a dirty word, quite the opposite. Refactoring is something that you do when you have leveled up or generally improved. It is impossible to refactor something if you have not improved unless you didn't try the first time, of course!

This tutorial will discuss refactoring, what we could do, and how we might approach a few real-world examples. We will use a real-life project that is open source on GitHub and do a refactoring exercise in stages. The project we will use is [Laravel Shift Blueprint](https://blueprint.laravelshift.com/), a popular way to bootstrap your Laravel applications.

Let's dive in. I have created a new repository fork to build things in isolation - running GitHub actions in my account so that the core library is not flooded. Now that I have done that, I can clone my fork and start working locally.

The first thing I noticed when opening the project is that composer needs to set a required PHP level. This isn't a huge problem - however, being me, I would put this to the minimum supported PHP version. PHP 8.0 is the only version with enough support to feel comfortable writing this. Let's make our first change.

```json
"require": {
    "doctrine/dbal": "^3.3",
    "illuminate/console": "^9.0",
    "illuminate/filesystem": "^9.0",
    "illuminate/support": "^9.0",
    "laravel-shift/faker-registry": "^0.2.0",
    "symfony/yaml": "^6.0"
},
```

After updating our dependencies and adding the language constraint, it now looks like the following:

```json
"require": {
    "php": "^8.0",
    "doctrine/dbal": "^3.5",
    "illuminate/console": "^9.39",
    "illuminate/filesystem": "^9.39",
    "illuminate/support": "^v9.39",
    "laravel-shift/faker-registry": "^0.2.0",
    "symfony/yaml": "^6.1"
},
```

We need to run tests before and after each change to ensure that the latest change has not broken anything. We either need to revert or refactor the broken part if it has. This is a crucial step in the refactoring process, as you always want to ensure you are refactoring for the betterment of the project - not just because you have a different opinion.

```bash
OK (430 tests, 2056 assertions)
```

So far, so good! Let's now move on and look at the code specifically. I noticed it was not taking advantage of type hinting or return types when opening a random file in the codebase. Also, as we have now set the minimum PHP version, we can update how we use the PHP language. Let's look at a quick example:

```php
class Tree
{
    private $tree;

    public function __construct(array $tree)
    {
        $this->tree = $tree;

        $this->registerModels();
    }

    private function registerModels()
    {
        $this->models = array_merge($this->tree['cache'] ?? [], $this->tree['models'] ?? []);
    }

    // More code was there, but let's simplify
}
```

Looking at this code, we know we can make some quick wins in refactoring - just to the language level we now want to set at the minimum. First, let us fix that constructor and remove the property.

```php
class Tree
{
    public function __construct(
        private array $tree,
    ) {
        $this->registerModels();
    }

    // ...
}
```

Moving over to using constructor property promotion allows us to simplify our code. Let's run our tests.

```bash
OK (430 tests, 2056 assertions)
```

Still good. We made an easy refactor of this code and can move on to the next part. Let's look at the method called in the constructor. We have a dynamic property on the class - which is being dropped in future versions of PHP support. While it may not be a problem right now - we know that in the future, it will be. So we can refactor this in advance.

```php
class Tree
{
    public function __construct(
        private array $tree,
        private array $models = [],
    ) {
        $this->registerModels();
    }

    private function registerModels(): void
    {
        $this->models = [
            ...$this->tree['cache'] ?? [],
            ...$this->tree['models'] ?? []
        ];
    }

    // ...
}
```

We have now set the property for the class in the constructor - and refactored the array merge to use array destructuring. This makes our code much easier to read. Let's rerun those tests!

```bash
OK (430 tests, 2056 assertions)
```

Let us look at the following method: a getter to get the controllers from the Tree class. We currently have no return type and need to know what this may contain. Doing a quick look through the code base using "Find Usages" I see that elsewhere we are dynamically setting this to an instance of `Controller`. Let's have a look at this method:

```php
public function controllers()
{
    return $this->tree['controllers'];
}
```

Firstly, we want to add the return type, which will be an array.

```php
public function controllers(): array
{
    return $this->tree['controllers'];
}
```

So far, so good. All tests are still passing. But is this enough? Should we add a dynamic type setting in our project when we can let our project know about this in one place? Let's update this.

```php
/**
 * @return array<int,Controller>
 */
public function controllers(): array
{
    return $this->tree['controllers'];
}
```

We know this will return a `Controller`, so why not set this type in our docblock as generic so we can make the most of modern PHP? Now to rerun our tests.

```bash
OK (430 tests, 2056 assertions)
```

So far, our refactors have been successful. Let's move on to another example.

Next, let's look at the `ServiceProvider` for this package. Like the other example, there aren't any return types - so I will quickly get them added and not worry about those examples here. Let's have a look at how the register method could be improved.

```php
public function register(): void
{
    $this->mergeConfigFrom(
        __DIR__ . '/../config/blueprint.php',
        'blueprint'
    );

    File::mixin(new FileMixins());

    $this->app->bind('command.blueprint.build', fn ($app) => new BuildCommand($app['files'], app(Builder::class)));
    $this->app->bind('command.blueprint.erase', fn ($app) => new EraseCommand($app['files']));
    $this->app->bind('command.blueprint.trace', fn ($app) => new TraceCommand($app['files'], app(Tracer::class)));
    $this->app->bind('command.blueprint.new', fn ($app) => new NewCommand($app['files']));
    $this->app->bind('command.blueprint.init', fn ($app) => new InitCommand());
    $this->app->bind('command.blueprint.stubs', fn ($app) => new PublishStubsCommand());

    $this->app->singleton(Blueprint::class, function ($app) {
        $blueprint = new Blueprint();
        $blueprint->registerLexer(new \Blueprint\Lexers\ConfigLexer($app));
        $blueprint->registerLexer(new \Blueprint\Lexers\ModelLexer());
        $blueprint->registerLexer(new \Blueprint\Lexers\SeederLexer());
        $blueprint->registerLexer(new \Blueprint\Lexers\ControllerLexer(new \Blueprint\Lexers\StatementLexer()));

        foreach (config('blueprint.generators') as $generator) {
            $blueprint->registerGenerator(new $generator($app['files']));
        }

        return $blueprint;
    });

    $this->app->make('events')->listen(CommandFinished::class, function ($event) {
        if ($event->command == 'stub:publish') {
            $this->app->make(Kernel::class)->queue('blueprint:stubs');
        }
    });

    $this->commands([
        'command.blueprint.build',
        'command.blueprint.erase',
        'command.blueprint.trace',
        'command.blueprint.new',
        'command.blueprint.init',
        'command.blueprint.stubs',
    ]);
}
```

First up, we are binding quite a bit to the container and using string constants, which is ok - but we could quickly improve this.

```php
$this->app->bind(BuildCommand::class, fn ($app) => new BuildCommand($app['files'], app(Builder::class)));
$this->app->bind(EraseCommand::class, fn ($app) => new EraseCommand($app['files']));
$this->app->bind(TraceCommand::class, fn ($app) => new TraceCommand($app['files'], app(Tracer::class)));
$this->app->bind(NewCommand::class, fn ($app) => new NewCommand($app['files']));
$this->app->bind(InitCommand::class, fn ($app) => new InitCommand());
$this->app->bind(PublishStubsCommand::class, fn ($app) => new PublishStubsCommand());
```

This is the first step; next, let us add named arguments to make this look cleaner.

```php
$this->app->bind(
    abstract: BuildCommand::class,
    concrete: fn (Application $app): BuildCommand => new BuildCommand(
        filesystem: $app['files'],
        builder: $app->make(
            abstract: Builder::class,
        ),
    ),
);
$this->app->bind(
    abstract: EraseCommand::class,
    concrete: fn (Application $app): EraseCommand => new EraseCommand(
        filesystem: $app['files'],
    ),
);
$this->app->bind(
    abstract: TraceCommand::class,
    concrete: fn (Application $app): TraceCommand => new TraceCommand(
        filesystem: $app['files'],
        tracer: $app->make(
            abstract: Tracer::class,
        ),
    ),
);
$this->app->bind(
    abstract: NewCommand::class,
    concrete: fn (Application $app): NewCommand => new NewCommand(
        filesystem: $app['files'],
    ),
);
$this->app->bind(
    abstract: InitCommand::class,
    concrete: fn (): InitCommand => new InitCommand(),
);
$this->app->bind(
    abstract: PublishStubsCommand::class,
    concrete: fn () => new PublishStubsCommand(),
);
```

Things, at least to me, now look a lot cleaner. We have more type hinting added and return types added for clarity. Not everyone will agree with the named arguments, but this makes the code nicer to read.

The purpose of refactoring is to make the code more manageable, performant, or both. What we have done above displays how we can make the code more type-safe and easier to manage moving forward. Blueprint is quite a complicated project. It has a lot of moving parts to make sure it works. Without spending a long time diving into the specifics of the project and its future goals, it is hard to see what improvements could be made.

My typical approach to refactoring is to hit those quick wins first, the supported language level and package version, then type hinting and return types, then move on to modernizing parts of the code. It is crucial to make sure, as you step through it, that you ensure tests are still running.
