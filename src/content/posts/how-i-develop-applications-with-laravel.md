---
title: How I develop applications with Laravel
pubDate: 2022-08-11
image: how-i-develop-applications-with-laravel.png
source: https://laravel-news.com/how-i-develop-applications-with-laravel
partner: Laravel News
description: Learn a unique Laravel development workflow; Build a to-do API with a step-by-step guide, leveraging Laravel's versatile tools like Livewire, and a systematic approach from data modeling to API creation."
---

I get asked a lot about how you work with Laravel. So in this tutorial, I will walk through my typical approach to building a Laravel application. We will create an API because it is something I love doing.

The API we are building is a basic to-do style application, where we can add tasks and move them between to do and done. I am choosing such a simple example because I would like you to focus on the process more than the implementation itself. So let us get started.

For me, it always begins with a simple command: 

```bash
laravel new todo-api --jet --git
```

For this, I would typically choose Livewire, as I am most comfortable with it. If I am honest - this application's web functionality will be just for user management and API token creation. However, feel free to use Inertia if you are more comfortable and want to follow along.

Once this command has run and everything is set up and ready for me, I open this project in PHPStorm. PHPStorm is my go-to IDE as it provides a robust set of tools for PHP development that help me with my workflow. Once this is in my IDE, I can start the work process.

The first step for me in every new application is to open the README file and start documenting what I want to achieve. This includes:
A general description of what I want to build.
Any data models that I know I will need
A rough design of the API endpoints I will need to create.

Let's explore the data models that I need to create first. I typically document these as YAML code blocks, as it allows me to describe the model in a friendly and easy way.

The Task Model will be relatively straightforward:

```yaml
Task:
  attributes:
    id: int
    title: string
    description: text (nullable)
    status: string
    due_at: datetime (nullable)
    completed_at: datetime
  relationships:
    user: BelongTo
    tags: BelongsToMany
```

Then we have the Tags Model, which will be a way for me to add a sort of taxonomy system to my tasks for easy sorting and filtering.

```yaml
Tag:
  attributes:
    id: int
    name: string
  relationships:
    tasks: BelongsToMany
```

Once I understand my data models, I start going through the dependencies I know I will need or want to use for this application. For this project, I will be using:

[Laravel Sail](https://laravel-news.com/laravel-sail)
[Laravel Pint](https://laravel-news.com/laravel-pint)
[Larastan](https://laravel-news.com/running-phpstan-on-max-with-laravel)
[JSON-API Resources](https://github.com/timacdonald/json-api)
[Laravel Query Builder](https://laravel-news.com/laravel-query-builder)
[Fast Paginate](https://laravel-news.com/laravel-fast-paginate)
[Data Object Tools](https://github.com/JustSteveKing/laravel-data-object-tools)

These packages set me up for building an API in a very friendly and easy-to-build way. From here, I can start building exactly what I need.

Now that my base Laravel application is set up for success, I can start publishing stubs that I commonly use and customize them to save me time during the development process. I tend to delete the stubs I know I will not use here and modify only the ones I know I will use. This saves me a lot of time going through the stubs that I don't need to change.

The changes that I typically add to these stubs are:

Adding `declare(strict_types=1);` to each file.
Making all generated class `final` by default.
Ensure that response types are always there.
Ensure that parameters are type hinted.
Ensure that any Traits are loaded one per use case.

Once this process has been completed, I work through all of the files currently in the Laravel application - and make similar changes as I did to the stubs. Now, this might take a little bit of time, but I find it is worth it, and I have a thing for strict, consistent code.

Once I have finally gotten through all of the above, I can start adding my Eloquent Models!

```bash
php artisan make:model Task -mf
```

My typical workflow with the data modeling is to start with the database migrations, move onto factories, and finally, the Eloquent Models. I like to organize my data migrations in a specific way - so I will show you the example for the Tasks migration:

```php
public function up(): void
{
    Schema::create('tasks', static function (Blueprint $table): void {
        $table->id();

        $table->string('name');
        $table->text('description')->nullable();

        $table->string('status');

        $table
		->foreignId('user_id')
		->index()
		->constrained()
		->cascadeOnDelete();

        $table->dateTime('due_at')->nullable();
        $table->dateTime('completed_at')->nullable();
        $table->timestamps();
    });
}
```

The way this structure works is:

Identifiers
Text content
Castable properties
Foreign Keys
Timestamps

This allows me to look at any database table and know roughly where a column might be located without searching the entire table. This is something I would call a micro-optimization. Not something you will get substantial time benefits from - but it will start forcing you to have a standard and know where things are straight away.

One thing I know I will want for this API, especially regarding tasks, is a status Enum that I can use. However, the way I work with Laravel is very similar to Domain Driven Design, so there is a little setup I will need to do beforehand.

Inside my `composer.json` file, I create a few new namespaces that have different purposes:

`Domains` - Where my Domain-specific implementation code lives.
`Infrastructure` - Where my Domain specific interfaces live.
`ProjectName` - Where code specific to overriding specific Laravel code lives; in this case, it is called `Todo`.

Eventually, you will have the following namespaces available:

```json
"autoload": {
    "psr-4": {
        "App\\": "app/",
        "Domains\\": "src/Domains/",
        "Infrastructure\\": "src/Infrastructure/",
        "Todo\\": "src/Todo/",
        "Database\\Factories\\": "database/factories/",
        "Database\\Seeders\\": "database/seeders/"
    }
},
```

Now that it is done, I can start thinking about the domains I want to use for this relatively simple app. Some would say that using something like this for such a simple application is overkill, but it means if I add to it, I do not have to do large refactors. The added benefit is that my code is always organized the way I expect it to be, no matter the application size.

The domains which we will want to use for this project can be designed like the following:

Workflow; anything to do with tasks and units of work.
Taxonomy; anything to do with categorization.

The first thing I need to do in my project is to create an Enum for the Task status attribute. I will create this under the `Workflow` domain, as this is directly related to the tasks and workflows.

```php
declare(strict_types=1);

namespace Domains\Workflow\Enums;

enum TaskStatus: string
{
    case OPEN = 'open';
    case CLOSED = 'closed';
}
```

As you can see, it is quite a simple Enum, but a valuable one if I ever want to extend the capabilities of the to-do app. From here, I can set up the Model Factory and Model itself, using `Arr::random` to select a random state for the Task itself.

Now we have started our data modeling. We understand the relations between authenticated users and the initial resources they have available to them. It is time to start thinking about the API design.

This API will have a handful of endpoints focused on tasks and perhaps a search endpoint to allow us to filter based on tags, which is our taxonomy. This is usually where I jot down the API I want and figure out if it going to work:

```md
`[GET] /api/v1/tasks` - Get all Tasks for the authenticated user.
`[POST] /api/v1/tasks` - Create a new Task for the authenticated user.
`[PUT] /api/v1/tasks/{task}` - Update a Task owned by the authenticated user.
`[DELETE] /api/v1/tasks/{task}` - Delete a Task owned by the authenticated user.

`[GET] /api/v1/search` - Search for specific tasks or tags.
```

Now that I understand the routing structure I want to use for my API - I can start implementing [Route Registrars](https://laravel-news.com/route-registrars). In my last article about Route Registrars, I talked about how to add them to the default Laravel Structure. However, this is not a standard Laravel application, so I have to route things differently. In this application, this is what my `Todo` namespace is for. This is what I would classify as system code, which is required for the application to run - but not something the application cares about too much.

After I have added the Trait and Interface required to use Route Registrars, I can start looking to register domains so each one can register its routes. I like to create a Domain Service Provider within the App namespace so that I do not flood my application config with loads of service providers. This provider looks like the following:

```php
declare(strict_types=1);

namespace App\Providers;

use Domains\Taxonomy\Providers\TaxonomyServiceProvider;
use Domains\Workflow\Providers\WorkflowServiceProvider;
use Illuminate\Support\ServiceProvider;

final class DomainServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->register(
            provider: WorkflowServiceProvider::class,
        );

        $this->app->register(
            provider: TaxonomyServiceProvider::class,
        );
    }
}
```

Then all I need to do is add this one provider to my `config/app.php`, so that I don't have to bust the config cache each time I want to make a change. I made the changes required to the `app/Providers/RouteServiceProvider.php` so I can register domain-specific route registrars, which allows me to control routing from my domain, but the application is still in control of loading these.

Let's take a look at the `TaskRouteRegistrar` that is under the Workflow domain:

```php
declare(strict_types=1);

namespace Domains\Workflow\Routing\Registrars;

use App\Http\Controllers\Api\V1\Workflow\Tasks\DeleteController;
use App\Http\Controllers\Api\V1\Workflow\Tasks\IndexController;
use App\Http\Controllers\Api\V1\Workflow\Tasks\StoreController;
use App\Http\Controllers\Api\V1\Workflow\Tasks\UpdateController;
use Illuminate\Contracts\Routing\Registrar;
use Todo\Routing\Contracts\RouteRegistrar;

final class TaskRouteRegistrar implements RouteRegistrar
{
    public function map(Registrar $registrar): void
    {
        $registrar->group(
            attributes: [
                'middleware' => ['api', 'auth:sanctum', 'throttle:6,1',],
                'prefix' => 'api/v1/tasks',
                'as' => 'api:v1:tasks:',
            ],
            routes: static function (Registrar $router): void {
                $router->get(
                    '/',
                    IndexController::class,
                )->name('index');
                $router->post(
                    '/',
                    StoreController::class,
                )->name('store');
                $router->put(
                    '{task}',
                    UpdateController::class,
                )->name('update');
                $router->delete(
                    '{task}',
                    DeleteController::class,
                )->name('delete');
            },
        );
    }
}
```

Registering my routes like this allows me to keep things clean and contained with the domain I need them in. My Controllers are still living within the application but separated through a namespace linking back to the domain.

Now that I have some routes I can use, I can start thinking about the actions I want to be able to handle within the tasks domain itself and what Data Objects I might need to use to make sure context is kept in between classes.

Firstly, I will need to create a TaskObject that I can use in the controller to pass through to an action or background job that needs access to the basic properties of a Task but not the entire model itself. I typically keep my data object within the domain, as they are a domain class.

```php
declare(strict_types=1);

namespace Domains\Workflow\DataObjects;

use Domains\Workflow\Enums\TaskStatus;
use Illuminate\Support\Carbon;
use JustSteveKing\DataObjects\Contracts\DataObjectContract;

final class TaskObject implements DataObjectContract
{
    public function __construct(
        public readonly string $name,
        public readonly string $description,
        public readonly TaskStatus $status,
        public readonly null|Carbon $due,
        public readonly null|Carbon $completed,
    ) {}

    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'description' => $this->description,
            'status' => $this->status,
            'due_at' => $this->due,
            'completed_at' => $this->completed,
        ];
    }
}
```

We want to ensure we still keep a level of casting opportunities for the Data Object, as we want it to behave similarly to the Eloquent model. We want to strip the behavior from it to have a clear purpose. Now let's look at how we might use this.

Let's take creating a new task API endpoint as an example here. We want to accept the request and send the processing to a background job so that we have relatively instantaneous responses from our API. The purpose of an API is to speed up the response so that you can chain actions together and create more complicated workflows than you can through the web interface. Firstly we will want to perform some validation on the incoming request, so we will use a FormRequest for this:

```php
declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Workflow\Tasks;

use Illuminate\Foundation\Http\FormRequest;

final class StoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'min:2',
                'max:255',
            ],
        ];
    }
}
```

We will eventually inject this request into our controller, but before we get to that point - we need to create the action we want to inject into our controller. However, with the way I write Laravel applications, I will need to create an Interface/Contract to use and bind into the container so that I can resolve the action from Laravel DI Container. Let's look at what our Interface/Contract looks like:

```php
declare(strict_types=1);

namespace Infrastructure\Workflow\Actions;

use App\Models\Task;
use Illuminate\Database\Eloquent\Model;
use JustSteveKing\DataObjects\Contracts\DataObjectContract;

interface CreateNewTaskContract
{
    public function handle(DataObjectContract $task, int $user): Task|Model;
}
```

This controller creates a solid contract for us to follow in our implementation. We want to accept the TaskObject we just designed but also the ID of the user we are creating this task for. We then return a Task Model, or an Eloquent Model, which allows us a little flexibility in our approach. Now let us look at an implementation:

```php
declare(strict_types=1);

namespace Domains\Workflow\Actions;

use App\Models\Task;
use Illuminate\Database\Eloquent\Model;
use Infrastructure\Workflow\Actions\CreateNewTaskContract;
use JustSteveKing\DataObjects\Contracts\DataObjectContract;

final class CreateNewTask implements CreateNewTaskContract
{
    public function handle(DataObjectContract $task, int $user): Task|Model
    {
        return Task::query()->create(
            attributes: array_merge(
                $task->toArray(),
                ['user_id' => $user],
            ),
        );
    }
}
```

We use the Task Eloquent Model, open up an instance of the Eloquent Query Builder, and ask it to create a new instance. We then merge the TaskObject as an array and the user ID within an array to create a task in a format Eloquent expects.

Now that we have our implementation, we want to bind this into the container. The way I like to do this is to stay within the Domain so that if we deregister a domain - the container is cleared of any domain-specific bindings that exist. I will create a new Service Provider within my Domain and add the bindings there, then ask my Domain Service Provider to register the additional service provider for me.

```php
declare(strict_types=1);

namespace Domains\Workflow\Providers;

use Domains\Workflow\Actions\CreateNewTask;
use Illuminate\Support\ServiceProvider;
use Infrastructure\Workflow\Actions\CreateNewTaskContract;

final class ActionsServiceProvider extends ServiceProvider
{
    public array $bindings = [
        CreateNewTaskContract::class => CreateNewTask::class,
    ];
}
```

All we need to do here is bind the interface/contract we created with the implementation and allow the Laravel container to handle the rest. Next, we register this inside our domain service provider for the workflow domain:

```php
declare(strict_types=1);

namespace Domains\Workflow\Providers;

use Illuminate\Support\ServiceProvider;

final class WorkflowServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->register(
            provider: ActionsServiceProvider::class,
        );
    }
}
```

Finally, we can look at the Store Controller to see how we want to achieve our goal.

```php
declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Workflow\Tasks;

use App\Http\Requests\Api\V1\Workflow\Tasks\StoreRequest;
use Domains\Workflow\DataObjects\TaskObject;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Infrastructure\Workflow\Actions\CreateNewTaskContract;
use JustSteveKing\DataObjects\Facades\Hydrator;
use JustSteveKing\StatusCode\Http;

final class StoreController
{
    public function __construct(
        private readonly CreateNewTaskContract $action
    ) {}

    public function __invoke(StoreRequest $request): JsonResponse
    {
        $task = $this->action->handle(
            task: Hydrator::fill(
                class: TaskObject::class,
                properties: [
                    'name' => $request->get('name'),
                    'description' => $request->get('description'),
                    'status' => strval($request->get('status', 'open')),
                    'due' => $request->get('due') ? Carbon::parse(
                        time: strval($request->get('due')),
                    ) : null,
                    'completed' => $request->get('completed') ? Carbon::parse(
                        time: strval($request->get('completed')),
                    ) : null,
                ],
            ),
            user: intval($request->user()->id),
        );

        return new JsonResponse(
            data: $task,
            status: Http::CREATED(),
        );
    }
}
```

Here we use Laravel DI Container to resolve the action we want to run from the container we just registered, and then we invoke our controller. Using the action, we build the new Task Model by passing in a new instance of TaskObject, which we hydrate using a handy package I created. This uses reflection to make the class based on its properties and a payload. This is an acceptable solution for creating a new task; however, what bugs me is that it is all done synchronously. Let's now refactor this to a background job.

Jobs in Laravel I tend to keep within the main App namespace. The reason for this is because it is something deeply tied into my application itself. However, the logic Jobs can run live within our actions, which live within our domain code. Let's create a new Job:

```bash
php artisan make:job Workflow/Tasks/CreateTask
```

Then we simply move the logic from the controller to the job. The job, however, wants to accept the Task Object, not the request - so we will need to pass the hydrates object through to this.

```php
declare(strict_types=1);

namespace App\Jobs\Workflow\Tasks;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Infrastructure\Workflow\Actions\CreateNewTaskContract;
use JustSteveKing\DataObjects\Contracts\DataObjectContract;

final class CreateTask implements ShouldQueue
{
    use Queueable;
    use Dispatchable;
    use SerializesModels;
    use InteractsWithQueue;

    public function __construct(
        public readonly DataObjectContract $task,
        public readonly int $user,
    ) {}

    public function handle(CreateNewTaskContract $action): void
    {
        $action->handle(
            task: $this->task,
            user: $this->user,
        );
    }
}
```

Finally, we can refactor our controller to strip out the synchronous action - and in return, we get a quicker response time and jobs that can be retried, which gives us better redundancy.

```php
declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Workflow\Tasks;

use App\Http\Requests\Api\V1\Workflow\Tasks\StoreRequest;
use App\Jobs\Workflow\Tasks\CreateTask;
use Domains\Workflow\DataObjects\TaskObject;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use JustSteveKing\DataObjects\Facades\Hydrator;
use JustSteveKing\StatusCode\Http;

final class StoreController
{
    public function __invoke(StoreRequest $request): JsonResponse
    {
        dispatch(new CreateTask(
            task: Hydrator::fill(
                class: TaskObject::class,
                properties: [
                    'name' => $request->get('name'),
                    'description' => $request->get('description'),
                    'status' => strval($request->get('status', 'open')),
                    'due' => $request->get('due') ? Carbon::parse(
                        time: strval($request->get('due')),
                    ) : null,
                    'completed' => $request->get('completed') ? Carbon::parse(
                        time: strval($request->get('completed')),
                    ) : null,
                ],
            ),
            user: intval($request->user()->id)
        ));

        return new JsonResponse(
            data: null,
            status: Http::ACCEPTED(),
        );
    }
}
```

The whole purpose of my workflow when it comes to Laravel is to create a more reliable, safe, and replicable approach to building my applications. This has allowed me to write code that is not only easy to understand but code that keeps context as it moves through the lifecycle of any business operation.

How do you work with Laravel? Do you do something similar? Let us know your favorite way to work with Laravel code on Twitter!
