---
title: Laravel Command Bus
pubDate: 2022-05-13
image: laravel-command-bus.png
description: Implement Command Bus in Laravel for efficient code management. Learn to create command handlers and integrate them seamlessly into your projects.
---
In Laravel 5.1 the Command Bus was replaced with Dispatchable Jobs, we can still use them but let us also look at how to add a Command Bus.

To start using a command bus in Laravel, first we need an interface to bind to, because let's be honest this is just good practice. For now we are going to stick to adding all our custom code inside of our `App` namespace, although in reality I would usually have this sort of code inside a `src` directory.

Create a directory called `app/CommandBus/Contracts` and we will start here by creating a `CommandContract` which should look like the following:

```php
delcare(strict_types=1);

namespace App\CommandBus\Contracts;

interface CommandContract
{
    // nothing is needed in here as most of what we need is constructor properties
}
```

This will be the interface/contract for our `Commands` within our application, next we need to think about how we want to handle these. Commands are handled by `CommandHandlers` which is a little like the `handle` method on a Dispatchable Job in Laravel. However the key difference is that the only purpose of this class is to handle a command event. Next we will create `app/CommandBus/Contracts/CommandHandlerContract` which should look like the below:

```php
declare(strict_types=1);

namespace App\CommandBus\Contracts;

interface CommandHandlerContract
{
    public function handle(CommandContract $command): mixed;
}
```

What we are doing here is accepting a command that implements the `CommandContract` and we return `mixed`. THe reason we are returning mixed over anything else is because not all commands need to return anything, and we can't guarantee the return response of the command. We could take it a step further and create a custom `CommandResponse` class - but that for now would be overkill.

Our final interface/contract that we need to create is for the Command Bus itself, so let us create `app/CommandBus/CommandBusContract.php` and make it look like the following example:

```php
declare(strict_types=1);

namespace App\CommandBus\Contracts;

interface CommandBusContract
{
    public function dispatch(CommandContract $command): mixed;

    /**
     * @param array<class-string<CommandContract>,class-string<CommandHandlerContract>> $map
     * @return void
     */
    public function map(array $map): void;
}
```

From the above you can see that we have a dispatch method and a map method, the map is to map new command and handlers into our bus and dispatch handles dispatching the command itself.

So now we are at a point where we have an interface/contract for the major components for our application, our next step is to design the implementation for how we want to build out command bus for Laravel.

Our command bus will need to accept the Laravels bus Dispatcher to dispatch these commands nicely, so let us create `app/CommandBus/Adapters/Laravel/LaravelCommandBus.php` and make it look like the following:

```php
declare(strict_types=1);

namespace App\CommandBus\Adapters\Laravel;

use App\CommandBus\Contracts\CommandBusContract;
use App\CommandBus\Contracts\CommandBusContract;
use Illuminate\Bus\Dispatcher;

final class LaravelCommandBus implements CommandBusContract
{
    public function __construct() {
        private Dispatcher $bus,
    }

    public function dispatch(CommandContract $command): mixed
    {
        return $this->bus->dispatch($command);
    }

    public function map(array $map): void
    {
        $this->bus->map($map);
    }
}
```

Now that we have a command bus implementation, we need to bind this into our container so that we can inject the correct implementation inside our code when we need it. Let us create a new service provider called `CommandBusServiceProvider` using artisan:

```bash
php artisan make:provider CommandBusServiceProvider
```

This will generate the scaffold of the class, and now we need to create the actual service provider:

```php
declare(strict_types=1);

namespace App\Providers;

use App\CommandBus\Adapters\Laravel\LaravelCommandBus;
use App\CommandBus\Contracts\CommandBus;
use Illuminate\Support\ServiceProvider;

final class CommandBusServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(
            abstract: CommandBus::class,
            concrete: LaravelCommandBus::class,
        );
    }
}
```

We now have a way to tell Laravel *which* command bus we want to use within our application, our next step is to register this inside `config/app.php` under the `providers` array. Once we have done this we need to find ways to register the commands we want to use. This is where things can take a turn, as there are many ways in which you might want to be able to do this. This will mostly depend on your application architecture, so for this example I will use a modular architecture, where we have a `src/Modules` directory where we register our modules.

Let us imagine this is a Customer Relationship Management system, and we will register a few command into the command bus. Create a new service provider called `src/Modules/Clients/Providers/ClientCommandBusServiceProvider.php` and add the following code:

```php
declare(strict_types=1);

namespace Modules\Clients\Providers;

use App\CommandBus\Contracts\CommandBusContract;
use Illuminate\Support\ServiceProvider;

final class ClientCommandBusServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        /**
         * @var CommandBusContract $commandBus
         */
        $commandBus = resolve(CommandBusContract::class);

        $commandBus->map([
            CreateClientCommand::class => CreateClientCommandHandler::class,
        ]);
    }
}
```

We can register this service provider in whichever way we need to, my personal way would be to create a service provider per module and have that register additional providers. Either way, you will need to make sure that this service provider is registered with our application in one way or another.

We can now look at creating these two classes, firstly let us look at our command itself. It is called `CreateClientCommand` which is pretty self explainitory, it needs all the data required to create a new client. Typically I would create a Data Transfer Object here so that I can standardise the input and have type validation handle part of the work for me. Create a new class `src/Modules/Clients/Commands/CreateClientCommand.php` with the following code:

```php
declare(strict_types);

namespace Modules\Clients\Commands;

use App\CommandBus\Contracts\CommandContract;
use Modules\Clients\DataObjects\NewClientDataObject;

final class CreateClientCommand implements CommandContract
{
    public function __construct(
        public readonly NewClientDataObject $client,
    ) {}
}
```

What we have is a command that implements the correct interface/contract and the constructor accepts a data transfer object for us to get data from. This data object is set as `readonly` using PHP 8.1 to ensure that the object is immutable, this is something we want to ensure in the command.

Next we should look at how we want to handle this command itself, before we worry about implementing this command bus. So let us create a new class `src/Modules/Clients/CommandHandlers/CreateClientCommandHandler.php` and add the following code to it:

```php
declare(strict_types=1);

namespace Modules\Clients\CommandHandlers;

use App\Models\Client;
use App\CommandBus\Contracts\CommandContract;
use App\CommandBus\Contracts\CommandHandlerContract;

final class CreateClientCommandHandler implements CommandHandlerContract
{
    public function handle(CommandContract $command): mixed
    {
        return Client::query()->create(
            attributes: $command->client->toArray(),
        );
    }
}
```

As you can see the only thing we are doing within this handler is interacting with Eloquent to create a new Client, using to data transfer object to cast the properties to an array so eloquent will accept it. This could be using something like the repository pattern or a service class if that is how you would like to do it, but the end result should be the same.

Finally we get to the point where we want to implement running our command. So create a new controller/handler to handle an incoming request, for this example I will use it as if it were an API to make things simpler. Create a new class `app/Http/Controllers/API/V1/Clients/StoreController.php` and add the following code:

```php
declare(strict_types=1);

namespace App\Http\Controllers\API\V1\Clients;

use App\CommandBus\Contracts\CommandBusContract;
use App\CommandBus\Contracts\CreateClientCommand;
use App\Http\Resources\API\V1\ClientResource;
use App\Http\Requests\API\V1\Clients\StoreRequest;
use Illuminate\Http\JsonResponse;
use Modules\Clients\DataObjects\ClientDataObject;

final class StoreController
{
    public function __construct(
        private readonly CommandBusContract $bus,
    ) {}

    public function __invoke(StoreRequest $request)
    {
        $client = $this->bus->dispatch(
            command: new CreateClientCommand(
                client: new ClientDataObject(
                    attributes: array_merge(
                        $request->validated(),
                        ['user_id' => auth()->id()]
                    ),
                )
            ),
        );

        return new JsonResponse(
            data: new ClientResource(
                resource: $client,
            ),
            status: 201
        );
    }
}
```

As you can see above, we accept the `CommandBusContract` into the constructor which will allow the Laravel container to resolve the correctly bound implementation. The when our request is being handled we pass in a `StoreRequest` which handled the validation of the request, allowing us to trust the data being passed to our request handler. We then tell the command bus to dispatch the correct command, passing in a data object which we build up by passing in the validated data and the currently authenticated users ID. Once we have our eloquent model back we pass this over to a `JsonResponse` using a `ClientResource` to trasform the models data into what our API should return. Finally we pass back a Http status code `201` which signals that the resource was infact created.

As you can see from this relatively simple implementation and usage, using a command bus is quite simple in Laravel. It isn't the only option we have available in our application, but it is a sounds and proven approach to application architecture. In future blog posts I will investigate other ways in which we can architect our application. The benefits are fantastic to these approaches as each class has a single responsibility and as we are leaning heavily on our DI container, we can create mock instances of these classes in our tests very simply.

Did you like this article? Let me know on twitter! I love feedback, and if you think I could achieve the same result in a different way let me know!
