---
title: Event Sourcing in Laravel
pubDate: 2022-08-19
image: event-sourcing-in-laravel.png
source: https://laravel-news.com/event-sourcing-in-laravel
partner: Laravel News
description: Master Event Sourcing in Laravel with this comprehensive guide, perfect for enhancing PHP projects with advanced data tracking and state management techniques.
---

Event Sourcing is a term that has been getting more popular in the PHP community over the last few years, but it still remains a mystery to many developers. The questions are always how and why, and it is understandable. This tutorial is designed to help you understand not only what Event Sourcing is, in a practical way, but know when you might want to use it. 

In a traditional application, our application state is directly represented in the database we are connected to. We do not fully understand how it got there. All we know is that it is. There are ways in which we might understand this a little more, using tools for auditing model changes so that we can see what was changed and by who. This, again, is a step in the right direction. However, we still don't understand the critical question. 

Why? Why did this model change? What is the purpose of this change?

This is where Event Sourcing holds its own, by keeping a historical view of what happened to the application state but also why it changed. Event Sourcing allows you to make a decision based on the past, enabling you to generate reports. But at its basic level, it lets you know why the application state changed. This is done through events.

I will build a basic Laravel project to walk you through how this works. The application we will make is relatively simple so that you can understand the Event Sourcing logic instead of getting lost in application logic. We are building an application where we can celebrate team members. That is it. Simple and easy to understand. We have teams with users, and we want to be able to celebrate something publically in the team.

We will start with a new Laravel project, but I will use Jetstream as I want to bootstrap the authentication and team structure and functionality. Once you have this project set up, open it in your IDE of choice (the correct answer here is PHPStorm, of course), and we are ready to dive into some Event Sourcing in Laravel.

We will want to create an additional model for our application, one of our only ones. This will be a `Celebration` model, and you can create this using the following artisan command:

```bash
php artisan make:model Celebration -m
```

Modify your migrations up method to look like the following:

```php
public function up(): void
{
    Schema::create('celebrations', static function (Blueprint $table): void {
        $table->id();

        $table->string('reason');
        $table->text('message')->nullable();

        $table
            ->foreignId('user_id')
            ->index()
            ->constrained()
            ->cascadeOnDelete();

        $table
            ->foreignId('sender_id')
            ->index()
            ->constrained('users')
            ->cascadeOnDelete();

        $table
            ->foreignId('team_id')
            ->index()
            ->constrained()
            ->cascadeOnDelete();

        $table->timestamps();
    });
}
```

We have a celebration `reason`, a simple sentence, then an optional `message` that we might want to send across with the celebration. Alongside this, we have three relations, the user who is being celebrated, the user that is sending the celebration, and what team they are on. With Jetstream, a user can belong to multiple teams, and there could be a situation where both users are in the same team, and we want to make sure we celebrate them publically in the correct team.

Once we have this setup, let us look at the model itself:

```php
declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class Celebration extends Model
{
    use HasFactory;

    protected $fillable = [
        'reason',
        'message',
        'user_id',
        'sender_id',
        'team_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(
            related: User::class,
            foreignKey: 'user_id',
        );
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(
            related: User::class,
            foreignKey: 'sender_id',
        );
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(
            related: Team::class,
            foreignKey: 'team_id',
        );
    }
}
```

We can mirror the relationships onto the other models as they are relevant. Still, by default, I add the other side of the relationship to every model to clarify the binding between the models, no matter if it is strictly needed. This is a habit I have gotten into to help others understand the data model itself.

Now we have the basis of our application created from a modeling perspective. We need to think about installing some packages that will help us. For my application, I used [Laravel Livewire](https://laravel-livewire.com/) to control the UI. However, I will not go into detail for this tutorial as I want to ensure that I focus on the Event Sourcing aspect.

Like with most projects I build, no matter the size, I have adopted a modular layout for the application - a Domain Driven Design approach. This is just something I do, do not feel that you have to follow this yourself, as it is very subjective.

My next step was to set up my domains, and for this demo, I only had one Domain: Culture. Within Culture, I created the namespaces for everything I might need. But I will go through it, so you understand the process.

The first step was to install a package that would enable me to use Event Sourcing in Laravel. For this, I used a [Spatie package](https://github.com/spatie/laravel-event-sourcing) that does a lot of the background work for me. Let's install this package using composer:

```bash
composer require spatie/laravel-event-sourcing
```

Once this is installed, ensure that you follow the install instructions for the package - as configuration and migrations need publishing. Once this is installed correctly, run your migrations so your database can be in the right state.

```bash
php artisan migrate
```

Now we can start thinking about how we want to implement Event Sourcing. You can implement this in a couple of ways: projectors to project your state or aggregates.

A Projector is a class that sits within your application and handles events you dispatch. These will then change the state of your application. It is a step beyond simply updating your database. It sits in the middle, catches an event, stores it, and then makes the changes it needs to - which then "projects" the new state for the application.

The other approach, my preferred method, aggregates - these are classes that, like projectors, handle the application state for you. Instead of firing events ourselves in our application, we leave that for the aggregate to do for us. Think of it like a relay, you ask the relay to do something, and it handles it for you.

Before we can create our first aggregate, there is some work to do in the background. I am a big fan of creating an event store per aggregate so that querying is quicker and that store will not fill up super quickly. This is explained in the package documentation, but I will walk you through it myself as it wasn't the clearest in the docs.

The first step is to create a model and migration, as you will need a way to query it in the future for reporting etc. Run the following artisan command to create these:

```bash
php artisan make:model CelebrationStoredEvent -m
```
The following code is what you will need in your up method for the migration:

```php
public function up(): void
{
    Schema::create('celebration_stored_events', static function (Blueprint $table): void {
        $table->id();
        $table->uuid('aggregate_uuid')->nullable()->unique();
        $table
		->unsignedBigInteger('aggregate_version')
		->nullable()
		->unique();
        $table->integer('event_version')->default(1);
        $table->string('event_class');

        $table->json('event_properties');

        $table->json('meta_data');

        $table->timestamp('created_at');

        $table->index('event_class');
        $table->index('aggregate_uuid');
    });
}
```

As you can see, we collect quite a bit of data for our events. Now the model is a lot simpler. It should look like this:

```php
declare(strict_types=1);

namespace App\Models;


use Spatie\EventSourcing\StoredEvents\Models\EloquentStoredEvent;

final class CelebrationStoredEvent extends EloquentStoredEvent
{
    public $table = 'celebration_stored_events';
}
```

As we are extending the `EloquentStoredEvent` model, all we need to do is change the table it is looking at. The rest of the functionality for the model is already in place on the parent.

To use these models, you must create a repository to query the events. It is quite a simple repository - however, it is an important step. I added mine to my Domain code under `src/Domains/Culture/Repositories/` but feel free to add your where it makes the most sense to you:

```php
declare(strict_types=1);

namespace Domains\Culture\Repositories;

use App\Models\CelebrationStoredEvent;
use Spatie\EventSourcing\StoredEvents\Repositories\EloquentStoredEventRepository;

final class CelebrationStoredEventsRepository extends EloquentStoredEventRepository
{
    public function __construct(
        protected string $storedEventModel = CelebrationStoredEvent::class,
    ) {
        parent::__construct();
    }
}
```

Now that we have a way to store the events and query them, we can move on to our aggregate itself. Again, I stored mine within my domain but feel free to keep yours within your application context.

```php
declare(strict_types=1);

namespace Domains\Culture\Aggregates;

use Domains\Culture\Repositories\CelebrationStoredEventsRepository;
use Spatie\EventSourcing\AggregateRoots\AggregateRoot;
use Spatie\EventSourcing\StoredEvents\Repositories\StoredEventRepository;

final class CelebrationAggregateRoot extends AggregateRoot
{
    protected function getStoredEventRepository(): StoredEventRepository
    {
        return app()->make(
            abstract: CelebrationStoredEventsRepository::class,
        );
    }
}
```

This aggregate so far will not do anything other than connect to the right event store for us. To get it to start tracking events, we need first to create them. But before we do that, we need to stop and think for a moment. What data do we want to store in the event? Do we want to store every property that we need? Or do we want to store an array as if it were coming from a form? I use neither approach because why keep it simple? I use Data Transfer Objects in all of my events to ensure context is always maintained and type safety is always provided.

I built a package to allow me to do this easier. Feel free to use it by installing it with the following composer command:

```bash
composer require juststeveking/laravel-data-object-tools
```

As before, I keep my Data Objects within my Domain by default but add where it makes the most sense for you. I created a Data Object called `Celebration` that I could pass through to events and aggregates:

```php
declare(strict_types=1);

namespace Domains\Culture\DataObjects;

use JustSteveKing\DataObjects\Contracts\DataObjectContract;

final class Celebration implements DataObjectContract
{
    public function __construct(
        private readonly string $reason,
        private readonly string $message,
        private readonly int $user,
        private readonly int $sender,
        private readonly int $team,
    ) {}

    public function userID(): int
    {
        return $this->user;
    }

    public function senderID(): int
    {
        return $this->sender;
    }

    public function teamUD(): int
    {
        return $this->team;
    }

    public function toArray(): array
    {
        return [
            'reason' => $this->reason,
            'message' => $this->message,
            'user_id' => $this->user,
            'sender_id' => $this->sender,
            'team_id' => $this->team,
        ];
    }
}
```

When I upgrade to PHP 8.2 this will be a lot easier, as I can then create readonly classes - and yes, my package already supports them.

Now we have our Data Object. We can get back to the event we want to store. I have called mine `CelebrationWasCreated` because event names should always be in the past tense. Let's have a look at this event:

```php
declare(strict_types=1);

namespace Domains\Culture\Events;

use Domains\Culture\DataObjects\Celebration;
use Spatie\EventSourcing\StoredEvents\ShouldBeStored;

final class CelebrationWasCreated extends ShouldBeStored
{
    public function __construct(
        public readonly Celebration $celebration,
    ) {}
}
```

Because we are using Data Objects, our class remains clean. So, now that we have an event - and a Data Object we can send around, we need to think about how to trigger this. This brings us back to our Aggregate itself, so let us create a method on our aggregate that we can use for this:

```php
declare(strict_types=1);

namespace Domains\Culture\Aggregates;

use Domains\Culture\DataObjects\Celebration;
use Domains\Culture\Events\CelebrationWasCreated;
use Domains\Culture\Repositories\CelebrationStoredEventsRepository;
use Spatie\EventSourcing\AggregateRoots\AggregateRoot;
use Spatie\EventSourcing\StoredEvents\Repositories\StoredEventRepository;

final class CelebrationAggregateRoot extends AggregateRoot
{
    protected function getStoredEventRepository(): StoredEventRepository
    {
        return app()->make(
            abstract: CelebrationStoredEventsRepository::class,
        );
    }

    public function createCelebration(Celebration $celebration): CelebrationAggregateRoot
    {
        $this->recordThat(
            domainEvent: new CelebrationWasCreated(
                celebration: $celebration,
            ),
        );

        return $this;
    }
}
```

At this point, we have a way to ask a class to record an event. However, this event will not yet be persisted - that comes later. Also, we aren't mutating our applications' state in any way. So how do we do this event sourcing bit? This part is down to the implementation within Livewire for me, which I will walk you through now.

I like to approach this by dispatching an event that will manage this process, as it is more efficient. If you think about how you might interact with an application, you can visit it from the web, send a request through an API endpoint, or event a CLI command might run - maybe it's a CRON job. In all of these methods, typically, you want an instant response, or at least you don't want to be waiting around. I will show you the method on my Livewire component that I have used for this:

```php
public function celebrate(): void
{
    $this->validate();

    dispatch(new TeamMemberCelebration(
        celebration: Hydrator::fill(
            class: Celebration::class,
            properties: [
                'reason' => $this->reason,
                'message' => $this->content,
                'user' => $this->identifier,
                'sender' => auth()->id(),
                'team' => auth()->user()->current_team_id,
            ]
        ),
    ));

    $this->closeModal();
}
```

I validate the users' input from the component, dispatch a new Job that can be handled, and close the modal. I pass a new Data Object into the job using my package. It has a facade that allows me to hydrate classes with an array of properties - and it works pretty well so far. So what does this job do? Let's take a look.

```php
declare(strict_types=1);

namespace App\Jobs\Team;

use Domains\Culture\Aggregates\CelebrationAggregateRoot;
use Domains\Culture\DataObjects\Celebration;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;

final class TeamMemberCelebration implements ShouldQueue
{
    use Queueable;
    use Dispatchable;
    use SerializesModels;
    use InteractsWithQueue;

    public function __construct(
        public readonly Celebration $celebration,
    ) {}

    public function handle(): void
    {
        CelebrationAggregateRoot::retrieve(
            uuid: Str::uuid()->toString(),
        )->createCelebration(
            celebration: $this->celebration,
        )->persist();
    }
}
```

Our job accepts the Data Object into its constructor and then stores this for when it is being processed. When the job is processed, it uses the `CelebrationAggregateRoot` to retrieve an aggregate by UUID and then calls the `createCelebration` method we created earlier. After it has called this method - it calls `persist` on the aggregate itself. This is what will store the event for us. But, again, we haven't mutated our applications state yet. All we have managed to do is store an unrelated event and not create the celebration we want to be creating? So what are we missing?

Our events also need to be handled. In the other method, we use a Projector to handle our events, but we have to call them manually. It is a similar process here, but instead our aggregate is triggering the event, we still need a projector to handle the event and mutate our applications state.

Let's create our Projector, which I call Handlers - as they handle the events. But I will leave it up to you how you wish to name yours.

```php
declare(strict_types=1);

namespace Domains\Culture\Handlers;

use Domains\Culture\Events\CelebrationWasCreated;
use Spatie\EventSourcing\EventHandlers\Projectors\Projector;
use Infrastructure\Culture\Actions\CreateNewCelebrationContract;

final class CelebrationHandler extends Projector
{
    public function __construct(
        public readonly CreateNewCelebrationContract $action,
    ) {}

    public function onCelebrationWasCreated(CelebrationWasCreated $event): void
    {
        $this->action->handle(
            celebration: $event->celebration,
        );
    }
}
```

Our Projector/Handler, whatever you might choose to call it, will be resolved from the container for us - and then it will look for a method prefixed with `on` followed by the Event name itself. So in our case, `onCelebrationWasCreated`. In my example, I use an action to perform the actual logic from the event - single classes doing one job that can be faked or replaced easily. So yet again, we chase the tree down to the next class. The action, this is what it looks like for me:

```php
declare(strict_types=1);

namespace Domains\Culture\Actions;

use App\Models\Celebration;
use Domains\Culture\DataObjects\Celebration as CelebrationObject;
use Illuminate\Database\Eloquent\Model;
use Infrastructure\Culture\Actions\CreateNewCelebrationContract;

final class CreateNewCelebration implements CreateNewCelebrationContract
{
    public function handle(CelebrationObject $celebration): Model|Celebration
    {
        return Celebration::query()->create(
            attributes: $celebration->toArray(),
        );
    }
}
```

This is the current implementation of the action. As you can see, my action class itself implements a contract/interface. This means I bind the interface to a specific implementation in my Service Provider. This allows me to easily create test doubles/mocks/alternative approaches without having a knock-on effect on the actual action that needs to be performed. This isn't strictly an event sourcing thing but a general programming thing. The one benefit that we do have is that our projector can be replayed. So if for some reason, we moved away from Laravel Eloquent, and maybe we used something else, we can create a new action - bind the implementation in our container, replay our events, and it should all just work.

At this stage, we are storing our events and have a way to mutate the state of our application - but do we? We need to tell the Event Sourcing library that we have registered this Projector/Handler so that it knows to trigger it on an event. Typically I would create an `EventSourcingServiceProvider` per domain so that I can register all the handlers in one place. Mine looks like the following:

```php
declare(strict_types=1);

namespace Domains\Culture\Providers;

use Domains\Culture\Handlers\CelebrationHandler;
use Illuminate\Support\ServiceProvider;
use Spatie\EventSourcing\Facades\Projectionist;

final class EventSourcingServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        Projectionist::addProjector(
            projector: CelebrationHandler::class,
        );
    }
}
```

All that is left is to ensure that this Service Provider is registered again. I create a Service Provider per domain to register child service providers - but that is another story and tutorial.

Now when we put it all together. We can ask our aggregate to create a celebration, which will record the event and persist it in the database, and as a side effect, our handler will be triggered, mutating the applications state with the new changes.

This seems a little long-winded, right? Is there a better way? Possibly, but at this point, we know when changes to our application state are made. We understand why they were made. Also, thanks to our Data Object, we know who made the changes and when. So it might not be the most straightforward approach, but it allows us to understand more about our application.

You can go into this as much as you need or dip your toe into Event Sourcing, where it makes the most sense. Hopefully, this tutorial has shown you a clear and practical path to start with event sourcing today.

If it hasn't shown you enough, Spatie have been kind enough to give you a coupon worth 30% off their Event Sourcing in Laravel course, which is pretty darn good! Visit the [Course website](https://event-sourcing-laravel.com/) and use coupon code `LARAVEL-NEWS-EVENT-SOURCING`.

Have you used Event Sourcing in your applications? How did you approach it? Let us know on Twitter!