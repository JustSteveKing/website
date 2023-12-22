---
title: Setting up your Data Model in Laravel
pubDate: 2022-09-20
image: setting-up-your-data-model-in-laravel.png
source: https://laravel-news.com/data-model
partner: Laravel News
description: Master the art of Laravel data modeling and build a meeting room booking system with this comprehensive tutorial from Laravel News.
---

The data model is one of the most important parts of any Laravel application. Many systems will be designed around this data model, so it is typically one of the first things we approach during development. Some of us have been doing this for years and have a good idea of how to approach this - while others may not be used to it yet. I learned about data modeling before I knew there was such thing as a framework, designing my data model in `CREATE TABLE` statements.

In this tutorial, I will walk through how you can approach data modeling in your Laravel application - and some tips on what I find helpful.

This tutorial is part one of an ongoing series where we should have built an entire working production-ready system together from start to finish by the end. In other words, from IDE to a server.

What are we going to build? I am glad you asked. I could do something straightforward here, like a ToDo application or a blog - but you won't learn anything useful from that. Instead, we are going to be building something unique and exciting with quite a few moving parts, which by the end of it all, should be something worthwhile. Recently I went on the hunt for a meeting room booking system, and in all honesty I struggled to find one. So we will be building an open source one in Laravel. The purpose here is to build something in a way that we would expect in a production environment while at the same time offering something for free.

What is going to be included within this meeting room management platform? This isn't going to be a SaaS style application where anyone can sign up and use it, this will be something you download and run yourself. It is crucial at this stage to think about these decisions as it informs much of our data model. 

The way we want our application to work is, at first, a configuration process happens where important setup instructions can be gone through. An overall system admin can be invited onto the platform to allow them to invite users and set up the system as required.

Let's first look at our User model, which is not quite the same as the typical Laravel user model. Eventually, we will be refactoring our User model to a package that controls the authentication for us - but for now, we will keep it simple.

Our user model will need an additional column called type, which will be an Enum. We will keep the email verification column to validate users more efficiently in an API-based environment.

The user migration should now look like the following:

```php
public function up(): void
{
    Schema::create('users', function (Blueprint $table): void {
        $table->id();
        $table->string('name');
        $table->string('email')->unique();
        $table->timestamp('email_verified_at')->nullable();
        $table->string('password');

        $table->string('type')->default(Type::ADMIN->value);

        $table->timestamps();
    });
}
```

As you can see, it is relatively standard for a Laravel application other than the additional column we want to add. From here, we can start looking at the Model Factory we need to create for our users.

```php
final class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->name(),
            'email' => $this->faker->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => Hash::make(
                value: 'password',
            ),
            'type' => Type::ADMIN,
        ];
    }
    
    public function unverified(): UserFactory
    {
        return $this->state(
            state: fn (array $attributes) => ['email_verified_at' => null],
        );
    }

    public function type(Type $type): UserFactory
    {
        return $this->state(
            state: fn (array $attributes) => ['type' => $type],
        );
    }
}
```

We add a default type we want to apply to any user created. However, we also create a helper method so that we can customize the type of user we want to create.

This leads us to the model and the changes we want to apply to it. There are minimal changes to the Eloquent Model, other than an additional fillable column and ensuring that we can cast the type property to our Enum.

```php
final class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens;
    use HasFactory;
    use Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'type',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'type' => Type::class,
        'email_verified_at' => 'datetime',
    ];
}
```
Before we go into more detail, you are probably wondering about the Enum itself and its available options.

```php
enum Type: string
{
    case ADMIN = 'admin';
    case OFFICE_MANAGER = 'office manager';
    case STAFF = 'staff';
}
```

Our application is going to be made up of the following:

- Admins; are people who are in charge of configuring the system and managing the system.
- Office Managers; are people who have the authority to override bookings on the system.
- Staff; are people on the system who have the ability to book the meeting rooms.

The workflow for this is that Admins will invite Office Managers, who can then start onboarding staff members onto the platform.

Alongside modeling the database representation of the data, we also need a way to understand the data inside the application. We can achieve this by using a Domain Transfer Object, a DTO for short.

We start by going through what the database contains for this data model and then figuring out what is needed across the application. However, we need to be able to create these objects before they exist in the database, too, at times.

```php
final class User implements DataObjectContract
{
    public function __construct(
        private readonly string $name,
        private readonly string $email,
        private readonly Type $type,
    ) {}

    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'email' => $this->email,
            'type' => $this->type,
        ];
    }
}
```

For us to create or invite a potential user or know anything about a user, we need access to their name, email, and type. This covers most use cases, as resources are mostly identified through route model binding.

We now have a way to understand the data through the database and the application. This is a process I repeat, in this order, as I build out any Laravel application. It gives me an abstraction from the model to pass around without it being a simple array while forcing a level of type safety on the properties. Sometimes I need access to the properties directly, but not that often, and when I do, I would create an accessor instead of changing the properties' visibility.