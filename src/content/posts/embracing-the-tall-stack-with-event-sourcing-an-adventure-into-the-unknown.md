---
title: Embracing The Tall Stack with Event Sourcing, an adventure into the unknown
pubDate: 2020-06-04
image: embracing-the-tall-stack-with-event-sourcing-an-adventure-into-the-unknown.png
description: Dive into blending Laravel's TALL stack with event sourcing, learning to create efficient and reactive PHP applications with modern web development techniques.
---

TALL stack is growing in popularity in the Laravel community, and rightly so.
The way in which you can write beautiful code split into reactive components
without ever having to leave PHP is a no brainer. Recently the TALL stack
preset was released, which on its own is fantastic - but I wanted to take it
one step further.

A few days ago I read some absolutely fantstic articles by the people over at [Spatie](https://spatie.be/), specifically [Freek Van Der Herten](https://freek.dev/) and [Brent Roose](https://stitcher.io/) - but I am sure more of the team were involved.

To summarise these two articles ([one written by Brent](https://stitcher.io/blog/combining-event-sourcing-and-stateful-systems))([one written by Freek](https://freek.dev/1634-mixing-event-sourcing-in-a-traditional-laravel-app)), using a fully event sourced system will add complexities that can get difficult to manage very quickly - especially when not everything really ***needs*** to be event sourced. Using a fully stateful application has been the standard for a lot of the industry for many years, and is your typical go to system. Most people want some level of CRUD (create read update delete) behaviour on a set of resources, and the application will just be a database wrapper allowing for manipulation and aggregation of these resources. I would like to stress here, **there is nothing wrong with this approach at all**. In short terms, this article poses the question: Why can these approaches be mixed in the same system?

It sounds obvious right? Why has nobody asked this before? As soon as I read these articles it clicked with me, this is an obvious approach to the event sourcing problem while adding extra business intelligence to a traditional stateful application. So with that in mind I decided to combine the awesome power of the TALL stack with a simple Event Sourced application, so far it doesn't do much - simple user registration and password reset functionality that comes as standard in a Laravel application, but also in the tall stack preset. The purpose of this exercise was to see how well these approaches would work combined.

As with all Laravel projects, the first step is installing, I highly recommend using the Laravel Installer when creating a Laravel project - it gives a nice easy way to bootstrap the application with the auth scaffolding preloaded.

```bash
laravel new project-name --auth
```

This will give you the default structure you need for any Laravel based project, from here we can start applying changes to the structure to align with the Spatie article - defining our application [Contexts](https://martinfowler.com/bliki/BoundedContext.html). For this application I have 1 context: a User context. Any behaviour to do with users at all will be stored within here. The architecture itself is still a work in progress, and I will most likely expand on this at some point soon.

The next step after installing is to follow the instructions over at the [GitHub repo for the TALL stack preset](https://github.com/laravel-frontend-presets/tall). These are simple enough, just make sure you **follow the setup instructions for with auth.**

Our next step is to refactor the application to use these contexts, if you are using [PHPStorm](https://www.jetbrains.com/phpstorm/) then this is relatively easy to do, right click the class name -> refactor -> move class. The first step is to refactor the User Model to sit under `app/Context/User/Models/User.php` and make a few recommended changes:

```php
namespace App\Context\User\Models;

use Ramsey\Uuid\Uuid;
use App\Context\User\Events\UserCreated;
use Illuminate\Notifications\Notifiable;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable
{
  use Notifiable;

  protected $guarded = [];

  protected $hidden = [
    'password', 'remember_token',
  ];

  protected $casts = [
    'email_verified_at' => 'datetime',
  ];

  public static function createWithAttributes(array $attributes): User
  {
    $attributes['uuid'] = (string) Uuid::uuid4();
    event(new UserCreated($attributes));

    return static::uuid($attributes['uuid']);
  }

  public static function uuid(string $uuid): ?User
  {
    return static::where('uuid', $uuid)->first();
  }
}
```

Now we have our User model updated in the right place, we need to make some changes in a few places:

* `app/config/auth.php` make sure to change the providers model to the new model context
* next we will have a new set of LiveWire components available under `app/Http/Livewire/Auth` which we will be working on next.

Once you have hooked up the auth correctly, feel free to test from this point to ensure it is working and all function ality works as it is. Our next step is to install the [spatie/laravel-event-sourcing package](https://docs.spatie.be/laravel-event-sourcing/v3/installation-setup/) - I would highly recommend have a thorough read through the documentation and watching the introductory videos, they explain things very well.

Once we have the Spatie package installed, we need to start using it! The first step is to create an Event that is going to be triggered and stored. So, let's create our UserCreated event in `app/Context/User/Events/UserCreated.php` it should look like this:

```php
namespace App\Context\User\Events;

use Spatie\EventSourcing\ShouldBeStored;

class UserCreated implements ShouldBeStored
{
  /**
  * @var string
  */
  public string $name;

  /**
  * @var string
  */
  public string $email;

  /**
  * @var string
  */
  public string $password;

  /**
  * User Created Constructor
  * 
  * @param string $name
  * @param string $email
  * @param string $password
  * 
  * @return void
  */
  public function __construct(
    string $name,
    string $email,
    string $password
  ) {
    $this->name = $name;
    $this->email = $email;
    $this->password = $password;
  }
}
```

What we are doing here is simple creating the event class with the attributes we would use to create a user normally, nothing out of the ordinary! So we have an event we can use, what we would typically do here is tie this into an [Aggregate](https://martinfowler.com/bliki/DDD_Aggregate.html). So let us create an aggregate in `app/Context/User/Aggregates/UserAggregate.php` that should look something like the below:

```php
namespace App\Context\User\Aggregates;

use Spatie\EventSourcing\AggregateRoot;
use App\Context\User\Events\UserCreated;

class UserAggregate extends AggregateRoot
{
  public function createUser(
    string $name,
    string $email,
    string $password
  ) {
    $this->recordThat(new UserCreated($name, $email, $password));

    return $this;
  }
}
```

What this Aggregate will do is record the fact that an event was triggered - the event sourcing part. For our user to actually be persisted into the database however we need to create a Projection - the part that will write data into a database. All we have at the moment is an event being fired and an aggregate that will store an event saying this event was triggered with the attatched properties.

The next part we need to do is not only create a projection, but also we are going to want to have reactors so that we can react when events happen. Let's start with our projection which wil be stored at `app/Context/User/Projectors/UserProjector.php` and look something like this:

```php
namespace App\Context\User\Projectors;

use App\Context\User\Models\User;
use App\Context\User\Events\UserCreated;
use Spatie\EventSourcing\Projectors\Projector;
use Spatie\EventSourcing\Projectors\ProjectsEvents;

class UserProjector implements Projector
{
  use ProjectsEvents;

  /**
  * Creates a new user
  * 
  * @param UserCreated $event
  * @param string $aggregateUuid
  * 
  * @return void
  */
  public function onUserCreated(UserCreated $event, string $aggregateUuid)
  {
    User::create([
      'uuid' => $aggregateUuid,
      'name' => $event->name,
      'email' => $event->email,
      'password' => $event->password
    ]);
  }
}
```

What this Projector is doing as you can probably see, is using an Eloquent model writing our user into the database, using the attributes that we attached onto our UserCreated Event. Simple right? We ask our aggreate to send an event with some data, this data is then projected into the database while we store the fact that we just did something. So we have a user, we could stop here and implement the TALL stack element, but I would rather do that after we have set everything up.

Next, our reactor. Typically when a user is created on a system we want to send them an email welcoming them or ask them to confirm their email or anything like that. In this example we are going to ask them to verify their email using a reactor, this will be stored at `app/Context/User/Reactors/UserCreatedReactor.php` and look like the below:

```php
namespace App\Context\User\Reactors;

use App\Context\User\Models\User;
use App\Context\User\Events\UserCreated;
use Spatie\EventSourcing\EventHandlers\EventHandler;
use Spatie\EventSourcing\EventHandlers\HandlesEvents;

class UserCreatedReactor implements EventHandler
{
  use HandlesEvents;

  public function onUserCreated(UserCreated $event)
  {
    $user = User::where('email', $event->email)->first();
    $user->sendEmailVerificationNotification();
  }
}
```

Using default Laravel behaviour we can now send an email notification over to the user that was just created asking them to verify their email. We have now come full circle! We will need to create a ServiceProvider in Laravel to tell the framework to listen and how to route these events and aggregates but that is relatively simple, you could either add this to your AppServiceProvider or create a specific service provider - I lean towards the latter:

```php
namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Spatie\EventSourcing\Projectionist;
use App\Context\User\Projectors\UserProjector;
use App\Context\User\Reactors\UserRegisteredReactor;

class EventSourcingServiceProvider extends ServiceProvider
{
  /**
  * Register services.
  *
  * @return void
  */
  public function register()
  {
    //
  }

  /**
  * Bootstrap services.
  *
  * @return void
  */
  public function boot()
  {
    Projectionist::addProjector(UserProjector::class);
    Projectionist::addReactor(UserCreatedReactor::class);
  }
}
```

Make sure you add this to the application config file at `config/app.php` under the providers array.

Now we have all of the main event sourcing aspects put together, it is time to hook up the LiveWire components to actually start triggering these events. Now this part is not perfect, and is only an example, but as a system scales this is where we may start seeing issues. What we do in our LiveWire component is ask our UserAggregate to trigger an event and persist the event however, if our system comes under heavy load this write may take awhile so our user will not be available to be logged in - one option here it to notify the user to verify their email before they can log in (probably a good idea), but what this demo does is simply trigger and log in because I am working locally so there is no load - these events and writes as fast!

So all of the livewire set up would have been done for you by installing and using the TALL preset, which is great, the next step to take is to change the default behaviour in this component found here `app/Http/Livewire/Auth/Register.php` and update the register method to the following code:

```php
namespace App\Http\Livewire\Auth;

use Ramsey\Uuid\Uuid;
use Livewire\Component;
use Illuminate\Support\Str;
use App\Context\User\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Providers\RouteServiceProvider;
use App\Context\User\Aggregates\UserAggregate;

class Register extends Component
{
  /* .. rest of the component lives here */
  public function register()
  {
    $this->validate([
      'name' => ['required'],
      'email' => ['required', 'email', 'unique:users'],
      'password' => ['required', 'min:8', 'same:passwordConfirmation'],
    ]);

    $uuid = Str::uuid()->toString();

    UserAggregate::retrieve($uuid)
    ->createUser(
      $this->name,
      $this->email,
      Hash::make($this->password)
    )->persist();

    $user = User::uuid($uuid);
    Auth::login($user, true);
    redirect(route('home'));
  }
}
```

So what we are doing here, when we ask the LiveWire component to register through our front end it will send a request to our back end using the native `fetch()` API, the library will take care of routing this request to the right place. Our first step of course is to validate the "request" as if it were a typical HTTP request (unfortunately no FormRequets here, which would be amazing), then we need to create a UUID for our aggregate, and we also assign this to our user (I am not sure on this part, if it is a good practice or not - I will let the community decide that one). Once we have our UUId we can tell our Aggregate to (using to UUID we just created) record the fact that we are trigger the UserCreated event we made earlier. We pass through all the data required, **please note that we send over the hashed version of the password!** The last thing we want to do is send over the unencrpyted password to be stored as plain text in out events - it is just as bad as storing a plain text password normally, you wuoldn't do it - so don't do it here! We then persist this aggregate to the database, so we have a rollback point, and an event to replay should we need to. We then fetch the user using their UUID, which is a static method you will remeber adding to your User model. We log this user in and redirect back to our home route.

It is that simple. Now I will be the first to say that this isn't perfect, it is mainly an experiment that I wanted to try after being inspired by a Spatie article and loving the TALL stack. Curiosity is a powerful tool, if you wonder if something should or could be done, try it! Experimentation is what makes technology moving forward. You never know something you try for fun could turn out to be a really good idea, never be scared to try things even if they may not work.

To expand on the above approach, my eventual aim is to have this working across multiple contexts: some stateful and others not so much. Beyond the code you see above, I also managed to get this approach working for password resets, so that we can have rollback points if a users password changes and they dispute it not being them, but also email verification - this last one was more for fun. The code I used for this example is currently in a [GitHub repo](https://github.com/JustSteveKing/laravel-tall-eventsourcing-example) should you want to have a look over that instead.

Thanks for reading! Why not drop me a tweet with your thoughts?