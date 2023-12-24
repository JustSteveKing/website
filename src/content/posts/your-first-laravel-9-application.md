---
title: Your first Laravel 9 Application
pubDate: 2022-11-22
image: your-first-laravel-9-application.png
source: https://laravel-news.com/your-first-laravel-9-application
partner: Laravel News
description: If you have never built a Laravel application, let me take a walk-through with you from scratch - with no perceived knowledge. Follow along to learn Laravel.
---

If you have never built a Laravel application, let me take a walk-through with you from scratch - with no perceived knowledge. In this tutorial, I am going to walk through creating a new Laravel application, something of a refresh of [this article](https://laravel-news.com/your-first-laravel-application), which was posted mid-2021.

Laravel has grown at an incredible rate since it was first released and recently added two new full-time staff members to help develop its ecosystem. It is not going anywhere soon, so we might as well try to learn it, right? If you haven't already, that is. Laravel has always been developer focused, with a focus on developer experience and performance and customization. If you ask any Laravel developer why they like Laravel - almost all the time, they will say the developer experience. So the question is, why to write anything else when Laravel is so nice to write?!

This tutorial is aimed at those who are just starting to learn Laravel. Maybe they know what it is or have tried installing it once or twice and stopped because they felt a little overwhelmed. We are going to walk through creating a new Laravel application from the very beginning, and the only thing you will need is:

- A Terminal
- PHP 8 installed
- Composer installed and available in your path
- NPM installed and available in your path

So what are we going to build? We are going to make a bookmark collector, a way for you to grab links that you find interesting and store them. Alongside this, we will also allow you to add tags to your bookmarks to categorize them for when you return them.

How do we get started with Laravel? The first thing we need to do, of course, is create a new project, and to do that are a few ways you can do it; the Laravel installer, Laravel Sail Build, or just by using composer create project. For this tutorial, I will use the composer create-project approach: as I want this to be as minimal in requirements as possible. So choose a directory where you want your application to live, and run the following composer command:

```bash
composer create-project laravel/laravel bookmarker
```

Now open the new `bookmarker` directory in your code editor of choice so that we can get started. This is a blank Laravel project, the starting point. I will not make any assumptions about how you wish to view this project locally, as there are many different options. Instead, we will use artisan to serve the application. Run the following artisan command:

```bash
php artisan serve
```

This will give you a URL to view, so click on it and open it in your browser. This should be the default Laravel screen. Congratulations, you have taken your first step with Laravel! Next, we can move on to how our application works.

Laravel will load all of your web routes from `routes/web.php`, and you have a few options when it comes to routing. You can load a view directly by using `Route::view()` when you don't need to pass data to the view. You can use a callable|Closure|function by calling `Route::get('route', fn () => view('home'))` where `get` is the HTTP verb. you want to use. You can also use controllers so that you can isolate the logic inside a single class `Route::get('route', App\Http\Controllers\SomeRouteController::class)`. 

Regarding loading routes through controllers, there are also options. You can declare them as strings and point to specific methods `Route::get('route', 'App\Http\Controllers\SomeController@methodName')`. You can declare route resources, where Laravel will assume a standard `Route::resource('route', 'App\Http\Controllers\SomeController')`, which will give you `index`, `create`, `store`,`show`, `edit`, `update`, `destroy` methods. These are explained very well [in the documentation](https://laravel.com/docs/9.x/controllers#actions-handled-by-resource-controller). You can also use invokable controllers, which is a single class with an `__invoke()` method which is treated like a Closure `Route::get('route', App\Http\Controllers\SomeController::clas)`.

For this tutorial, I will use invokable controllers, as they are what I like using - so feel free to follow along. I like using these because it keeps my routes clean, are friendly for my IDE to click through, and encapsulate each route in a single class. 

When starting any new project, you must consider what you want it to do. As we already said, we are building a bookmarking application, so we can assume what we want this application to do. Let's write a couple of requirements:

- As a user, I want to be able to create new bookmarks.
- As a user, I want to view all of my bookmarks.
- As a user, I want to be able to update or delete my bookmarks.
- As a user, I want to be able to click through one of my bookmarks and view the website.
- As a user, I want to be able to view bookmarks that are tagged in a certain way.

These requirements are almost user stories, so we can work through them and understand the areas we might want to touch. Our first step is designing the data we need to store in the database. We will use SQLite to store the data for this application to keep our requirements low.

To get started with SQLite in your Laravel application, first, we need to create the SQLite file by running the following command in our terminal (or in your IDE if you are more comfortable there):

```bash
touch database/database.sqlite
```

Then we need to open our `.env` file and modify our database block, so our application knows about it. Laravel uses an `env` file to configure your local environment, which will then be loaded through the various configuration files within `config/*.php`. Each file configures specific parts of your application, so feel free to spend a little time exploring these files, and see how the configuration works.

Currently you will have a block in your `env` that looks like the following:

```env
DB_CONNECTION=mysql  
DB_HOST=127.0.0.1  
DB_PORT=3306  
DB_DATABASE=laravel  
DB_USERNAME=root  
DB_PASSWORD=
```

What you need to do now is replace this block with the following, replacing the `DB_DATABASE` path up to `/database/database.sqlite` with wherever you created your project (you can use `pwd` bash command to get the current working directory if it helps):

```env
DB_CONNECTION=sqlite
DB_DATABASE=/Users/steve/code/sites/bookmarker/database/database.sqlite
DB_FOREIGN_KEYS=true
```

Here we are setting the database connection to `SQLite`. The database is being pointed to our newly created database file, and we want SQLite to enable foreign keys.

Now that we have a database set up and configured, we can run the default database migrations to get our application started. In Laravel, database migrations are used to update the state of your applications' database. Each time you want to change your database in terms of structure, you create a new migration to create a table, add columns or drop columns or even drop a table altogether. The [documentation on database migrations](https://laravel.com/docs/9.x/migrations#main-content) is excellent and explains all of the options available to you, so when you get time, make sure you read it. Laravel comes with a few migrations by default for Users, Password Resets, Failed Jobs, and Personal Access Tokens. These are useful in 99% of applications, so we will leave them as they are.

Luckily, Laravel has a User model ready to go, so we do not need to edit or change anything there. We collect the users' names, email addresses, and passwords and store when the user was created and last updated. So we have a data model already sorted. Next, we need to think about how this user might gain access to our application. We need them to be able to log in or register for a new account. Laravel has a few packages available for this, or you are welcome to build your own authentication. However, the standard packages are excellent and customizable, so we will use them.

For this application, we will use a Laravel package called `Breeze`, which is a basic authentication scaffold, but there are other options such as `Jetstream`, which allows 2FA and a teams model where multiple people can collaborate. There is even one called `Socialite`, which enables you to configure and set up social logins from many different providers. We do not need these, though, so install Laravel Breeze using the following command:

```bash
composer require laravel/breeze --dev
```

This makes Laravel Breeze a development dependency to your application, and it is a development dependency because it needs to be installed. Once installed, the package will copy files to your application for routing, views, controllers, and more. So let's install the package using the following artisan command:

```bash
php artisan breeze:install
```

Finally, we need to install and build the front-end assets using npm:

```bash
npm install && npm run dev
```

This might take a moment, as it needs to download all of the JavaScript or CSS packages, then run a build process for you. Once this is done, you will see the script stop executing.

Now all of that is installed and ready for us. We need to run the database migrations so that our database is at a specific state for us to start working with. You can do this by running the following artisan command:

```bash
php artisan migrate
```

This will run through each migration you have in your `database/migrations` directory and apply them to your database. So your database state can be tied directly to your version control, making your application smarter and more resilient.

Let's take a moment to think about how we want our bookmarks to be stored. Each bookmark needs to belong to a user, have a unique identifier, a URL that can be visited, and an optional description in case you want to write a note on what it is for when you return to it.

We can now generate a new eloquent model and migration using the artisan command line, so run the following in your terminal:

```bash
php artisan make:model Bookmark -m
```

We are asking Laravel to make a new eloquent model called `Bookmark`, and the `-m' flag tells the command also to generate a migration. If you ever need to make a new model and migration, this is the recommended approach as it does both simultaneously. You can apply other flags to this command to generate model factories, seeders, and more - but we will not be using them in this intro tutorial.

This will have created a new migration for you inside `database/migrations` it will have a timestamp name followed by `create_bookmarks_table`. Open this up in your IDE so we can structure the data. In the `up` method replace the contents with the following code block:

```php
Schema::create('bookmarks', static function (Blueprint $table): void {
    $table->id();

    $table->string('name');
    $table->string('url');
    $table->text('description')->nullable();

    $table->foreignId('user_id')
        ->index()->constrained()->cascadeOnDelete();

    $table->timestamps();
});
```

From the code above, you can see the descriptive nature of database migrations, how we are going through to create a new table, and describing how we want this to be built. Now we can apply these changes to our database by running our migrate artisan command again:

```bash
php artisan migrate
```

Next, let us go to our Eloquent Model and add some code so that it knows about the database columns and any relationships they might have. Open up `app/Models/Bookmark.php` in your editor, and replace the contents with the code below:

```php
declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Bookmark extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'url',
        'description',
        'user_id'
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(
            related: User::class,
            foreignKey: 'user_id',
        );
    }
}
```

We have set our `fillable` attributes to match the columns available in the database. This will stop any issues with mass assigning attributes. We then add the user method, which is a relationship. A Bookmark `BelongsTo` a User using the `user_id` foreign key. We can add this relationship to our User model, too, so inside that Models directory, open the `User.php` file and replace the contents with the code below:

```php
declare(strict_types=1);

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use Notifiable;
    use HasFactory;
    use HasApiTokens;

    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
    ];

    public function bookmarks(): HasMany
    {
        return $this->hasMany(
            related: Bookmark::class,
            foreignKey: 'user_id',
        );
    }
}
```

Our user now knows about the relation to bookmarks as a User `HasMany` Bookmarks. We will use these relationships a little later when we start building the logic in our application.

Finally, we can create a Topic model. We want each bookmark to have many topics associated with it. Let's take Laravel News as an example. We might want to tag this with the following:

- Laravel
- News
- Tutorials
- Jobs

So anytime we want to look at bookmarks about any of those tags, Laravel News should appear. Like before, we are going to run an artisan command to create a Tag model:

```bash
php artisan make:model Tag -m
```

Now, open the migration file in your editor and replace the contents of the `up` method again:

```php
Schema::create('tags', static function (Blueprint $table): void {
    $table->id();
    $table->string('name');
    $table->string('slug')->unique();
});
```

Our tags have a name and a slug, but we do not want timestamps this time - as it is not important information. I call this a meta-model, used for categorization and mainly by the system, the user will create these, but they aren't the focus.

So let's work on our Eloquent model now:

```php
declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Tag extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
    ];

    public $timestamps = false;
}
```

So far, we do not have any relations, as we will need a pivot table to associate these tags with bookmarks. Run the following command in your terminal to just generate a migration:

```bash
php artisan make:migration create_bookmark_tag_table
```

Laravel has a convention where for pivot tables, you name it alphabetically and singularly with the two tables. So we want to join the bookmarks and tags, so we call it `bookmark_tag` as tags can belong to many different bookmarks, and bookmarks can have many other tags.

Let's fill this migration in to see how it is different, again focusing on the `up` method:

```php
Schema::create('bookmark_tag', static function (Blueprint $table): void {
    $table->foreignId('bookmark_id')->index()->constrained()->cascadeOnDelete();
    $table->foreignId('tag_id')->index()->constrained()->cascadeOnDelete(); 
});
```

This table must contain foreign keys for the bookmarks and tag primary keys. We now have an Eloquent Model for this table, so we add our relations to the Tag and Bookmark model instead.

Your Tag Model should now look like the following:

```php
declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Tag extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
    ];

    public $timestamps = false;

    public function bookmarks(): BelongsToMany
    {
        return $this->belongsToMany(
            related: Bookmark::class,
            table: 'bookmark_tag',
        );
    }
}
```

Your Bookmark Model should now also look like this:

```php
declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Bookmark extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'url',
        'description',
        'user_id'
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(
            related   : User::class,
            foreignKey: 'user_id',
        );
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(
            related: Tag::class,
            table: 'bookmark_tag',
        );
    }
}
```

Finally, run the migrate command so that our database state can change:

```bash
php artisan migrate
```

Now that our Bookmark and Tag models know each other, we can start building our user interface! We won't be focusing on a polished user interface for this tutorial, so feel free to be as creative as you want. However, we will be using [tailwindcss](https://tailwindcss.com/).

We are going to do most of our work for bookmarks in the dashboard route that Laravel Breeze created, so if you look in `routes/web.php` you should see the following:

```php
declare(strict_types=1);

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/dashboard', function () {
    return view('dashboard');
})->middleware(['auth'])->name('dashboard');

require __DIR__.'/auth.php';
```

The dashboard route is currently a closure, where we probably want to refactor this to a controller. So let's make a new controller to keep the logic for the dashboard in, run the following artisan command:

```bash
php artisan make:controller DashboardController --invokable
```

Now let's refactor this routes file, so it is a little cleaner:

```php
declare(strict_types=1);  
  
use Illuminate\Support\Facades\Route;  
  
Route::view('/', 'welcome')->name('home');  
  
Route::get(  
    '/dashboard',  
    App\Http\Controllers\DashboardController::class  
)->middleware(['auth'])->name('dashboard');  
  
require __DIR__.'/auth.php';
```

We have simplified the home route to a `view` route, and the dashboard route is now pointing to a controller. Open this controller inside your editor so that we can replicate the logic from before:

```php
declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Bookmark;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __invoke(Request $request): View
    {
        return view('dashboard', [  
    		'bookmarks' => Bookmark::query()  
        		->where('user_id', auth()->id())  
        		->get()  
		]);
    }
}
```

Like before, all we need to do is return a view right now. Now let's test it out, run the following artisan command to serve your application again:

```bash
php artisan serve
```

Now, if you open this up in your browser, up the top right, you should see two links for "Login" and "Register". Try registering for an account, and wait for it to redirect you to the dashboard. You should see a message "You're logged in!".

Fantastic work keeping up so far! You now have a Laravel application that handles authentication and has data models in the background that we can use to create and manage bookmarks.

When it comes to the front end, it can be hard to figure out how you want it to work, there are millions of JavaScript libraries out there, or there is plain PHP and blade you can use. For this tutorial, we will focus on using Laravel blade as we don't want to start adding too many complications or packages this early in our learning.

When we installed Laravel Breeze, we got a few extra view files, which is great as it has already been set up for success. For the new bookmark form, I will create a new [Blade component](https://laravel.com/docs/9.x/blade#components), which is a separate view that we can pull in and have in multiple places.

Create a new Blade component, an anonymous one that is just a view file, run the following artisan command:

```bash
php artisan make:component bookmarks.form --view
```

Then inside of our `resources/views/dashboard.blade.php` we can refactor it to look like the following:

```html
<x-app-layout>
    <x-slot name="header">
        <h2 class="font-heading font-semibold text-xl text-gray-800 leading-tight">
            {{ __('Dashboard') }}
        </h2>
    </x-slot>

    <div class="py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                <x-bookmarks.form :bookmarks="$bookmarks" />
            </div>
        </div>
    </div>
</x-app-layout>
```

We load our blade component by calling `<x-bookmarks.form />`, and the way this works is; that all blade components can be loaded by prefixing the name with `x-`. Then, if it is embedded within directories, we denote each directory with a `.`, so looking at `x-bookmarks.form`, we can assume that this is stored in `resources/views/components/bookmarks/form.blade.php`. Inside here, we are going to create a simple way for us to add new bookmarks. Add the following (massive) code snippet inside the component:

```html
@props(['bookmarks'])

<div>  
    <div x-data="{ open: true }" class="overflow-hidden">
        <div class="px-4 py-5 border-b border-gray-200 sm:px-6">
            <div class="-ml-4 -mt-2 flex items-center justify-between flex-wrap sm:flex-nowrap">
                <div class="ml-4 mt-2">
                    <h3 class="text-lg leading-6 font-medium text-gray-900">
                        Your Bookmarks
                    </h3>
                </div>
                <div class="ml-4 mt-2 flex-shrink-0">
                    <a x-on:click.prevent="open = ! open" class="relative inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        <span x-show="! open" x-cloak>Show Form</span>
                        <span x-show="open" x-cloak>Hide Form</span>
                    </a>
                </div>
            </div>
        </div>

        <div x-show="open" x-cloak class="divide-y divide-gray-200 py-4 px-4">
            <div class="pt-8">
                <div>
                    <h3 class="text-lg leading-6 font-medium text-gray-900">
                        Create a new bookmark.
                    </h3>
                    <p class="mt-1 text-sm text-gray-500">
                        Add information about the bookmark to make it easier to understand later.
                    </p>
                </div>
                <form id="bookmark_form" method="POST" action="{{ route('bookmarks.store') }}" class="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    @csrf

                    <div class="sm:col-span-3">
                        <label for="name" class="block text-sm font-medium text-gray-700">
                            Name
                        </label>
                        <div class="mt-1">
                            <input type="text" name="name" id="name" class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md">
                        </div>
                        @error('name')
                        <p class="mt-2 text-sm text-red-500">
                            {{ $message }}
                        </p>
                        @enderror
                    </div>

                    <div class="sm:col-span-3">
                        <label for="url" class="block text-sm font-medium text-gray-700">
                            URL
                        </label>
                        <div class="mt-1">
                            <input type="text" name="url" id="url" class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md">
                        </div>
                        @error('url')
                        <p class="mt-2 text-sm text-red-500">
                            {{ $message }}
                        </p>
                        @enderror
                    </div>

                    <div class="sm:col-span-6">
                        <label for="description" class="block text-sm font-medium text-gray-700">
                            Description
                        </label>
                        <div class="mt-1">
                            <textarea id="description" name="description" rows="3" class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-md"></textarea>
                        </div>
                        <p class="mt-2 text-sm text-gray-500">
                            Write any notes about this bookmark.
                        </p>
                        @error('description')
                        <p class="mt-2 text-sm text-red-500">
                            {{ $message }}
                        </p>
                        @enderror
                    </div>

                    <div class="sm:col-span-6">
                        <label for="tags" class="block text-sm font-medium text-gray-700">
                            Tags
                        </label>
                        <div class="mt-1">
                            <input
                                type="text"
                                name="tags"
                                id="tags"
                                class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                            <p class="mt-2 text-sm text-gray-500">
                                Add a comma separated list of tags.
                            </p>
                            @error('tag')
                            <p class="mt-2 text-sm text-red-500">
                                {{ $message }}
                            </p>
                            @enderror
                        </div>
                    </div>

                    <div class="sm:col-span-6">
                        <div class="pt-5">
                            <div class="flex justify-end">
                                <a x-on:click.prevent="document.getElementById('bookmark_form').reset();" class="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">  
                                    Cancel
                                </a>
                                <button type="submit" class="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>

    @forelse ($bookmarks as $bookmark)
        <div>
            <a href="#" class="block hover:bg-gray-50">
                <div class="px-4 py-4 sm:px-6">
                    <div class="flex items-center justify-between">
                        <p class="text-sm font-medium text-indigo-600 truncate">
                            {{ $bookmark->name }}
                        </p>
                    </div>
                    <div class="mt-2 sm:flex sm:justify-between">
                        <div class="flex space-x-4">
                            @foreach ($bookmark->tags as $tag)
                                <p class="flex items-center text-sm text-gray-500">
                                    {{ $tag->name }}
                                </p>
                            @endforeach
                        </div>
                    </div>
                </div>
            </a>
        </div>
    @empty
        <a href="#" class="relative block w-full border-2 border-gray-300 border-dashed rounded-lg p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
            <span class="mt-2 block text-sm font-medium text-gray-900">
                Create a new bookmark
            </span>
        </a>
    @endforelse
</div>
```

We have a pretty big component that will handle all of the logic we need to create a bookmark on the front end. To begin with, our component declares that it expects props to be sent to it, which are properties that the component can use. These are just variables we pass in so that our component is aware of them. Then we have a section at the top which is the control section. It has a title and an action button. We are using [Alpine.js](https://alpinejs.dev/) for the basic JavaScript we need - toggling visibility of the form. Our form is a standard HTML form, but we are posting this to a route we have yet to create, so soon, we will handle that. We then add a new blade directive to the form, this directive, `@csrf` will add a Cross-Site Request Forgery input to our form to prevent any CSFR issues we could face with other sites trying to hijack our form and interfere. The rest of the code is just markup for visuals, so feel free to customize this how you like it. A point to note is that currently, we are adding tags using a comma-separated list. We might approach this a little differently if we were to use more JavaScript or a UI library. Then we have a cancel and save button. Our cancel button will reset the form using JavaScript, and our submit button, as you can imagine, submits our form.

So now we have to save this, the chances are your page will not load because the route is not defined yet - and that is fine. We are about to create it. First, however, we will need to create the controller where we are going to save this data, so using the following artisan command, create a new controller:

```bash
php artisan make:controller Bookmarks/StoreController --invokable
```

Then add the following to your routes file:

```php
Route::post(
    'bookmarks',
    App\Http\Controllers\Bookmarks\StoreController::class,
)->middleware(['auth'])->name('bookmarks.store');
```

Now inside the controller, we will need to do a few things. Firstly, we will want to validate the request so that we can pass any information back with validation messages. Then we will want to perform an action to create a new bookmark, and finally, we will redirect back to the dashboard, where we will see the newly created bookmark.

Inside your `app/Http/Controllers/Bookmarks/StoreController.php` we will add the following code:

```php
declare(strict_types=1);

namespace App\Http\Controllers\Bookmarks;

use App\Http\Controllers\Controller;
use App\Models\Tag;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;

class StoreController extends Controller
{
    public function __invoke(Request $request): RedirectResponse
    {
        $this->validate($request, [
            'name' => [
                'required',
                'string',
                'min:1',
                'max:255',
            ],
            'url' => [
                'required',
                'url',
            ],
            'description' => [
                'nullable',
                'string',
            ],
            'tags' => [
                'nullable',
                'array',
            ]
        ]);

        $bookmark = auth()->user()->bookmarks()->create([
            'name' => $request->get('name'),
            'url' => $request->get('url'),
            'description' => $request->get('description'),
        ]);

        foreach (explode(',', $request->get('tags')) as $tag) {
            $tag = Tag::query()->firstOrCreate(
                ['name' => trim(strtolower($tag))],
            );
  
            $bookmark->tags()->attach($tag->id);
        }

        return redirect()->route('dashboard');
    }
}
```

We have an `__invoke` method that will accept the current request. This is handled by Laravels DI container, so you don't have to worry. Then the reason we can call `$this->validate` is because we are extending the main Controller for our Laravel application. We set out our validation rules. The first argument passed to validate is the data we wish to validate. Then we pass an array of validation rules we want to follow. I have set the rules up to what I would consider sensible defaults, have a look through them, and feel free to look at the available validation options in Laravel in the [documentation](https://laravel.com/docs/9.x/validation#available-validation-rules).

We then move on to creating our bookmark. We aren't using a model here, though, as we can save time by getting the authenticated user, getting the bookmarks relation method and calling create - this means that we do not have to pass in a user_id as it is coming directly from the user. Then we cycle over the request tags and either get the first matching one or create a new one by the name input (which we are trimming white space from and setting to a lower case string for consistency). Then we are attaching this new tag to the bookmark. Finally, we return a redirect to see the newly created bookmark.

This code is all well and good and does exactly what we need it to, but could we do better? I think so.

Our first step in refactoring this code is to pull the validation out of our controller. There is nothing wrong with keeping it in our controller. However, we can save a little time by not instantiating the controller if validation fails. To do this, we can create a new form request using the following artisan command:

```bash
php artisan make:request Bookmarks/StoreRequest
```

This will have created a new class in `app/Http/Requests/Bookmarks/StoreRequest.php`, so let's open it up, add some code and walk through it:

```php
declare(strict_types=1);

namespace App\Http\Requests\Bookmarks;

use Illuminate\Foundation\Http\FormRequest;

class StoreRequest extends FormRequest
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
                'min:1',
                'max:255',
            ],
            'url' => [
                'required',
                'url',
            ],
            'description' => [
                'nullable',
                'string',
            ],
            'tags' => [
                'nullable',
                'array',
            ]
        ];
    }
}
```

We use an authorize method to say if this is an authorized request. For now, this is fine, but if you add in a roles and permissions layer, later on, you can ensure the authenticated user is allowed to perform the store action on bookmarks. Then we have the rules method, an array of validation rules like the one we had in our controller. What Laravel will do now is, using the DI container, when the request comes in - before it instantiates the new controller, it will try to build the form request. Doing so will validate the request. If the validation fails, an exception will be thrown, which Laravel will catch, convert to an ErrorBag for you, and return to the previous view with that error bag available to display any validation errors. A very nifty feature of Laravel. But before that can happen, we need to tell our controller to use this new form request, so change the signature of the `__invoke()` method to look like the following:

```php
public function __invoke(StoreRequest $request): RedirectResponse
```

Not the validation will happen for us. So we can remove the requirement to extend the base controller from Laravel and remove the manual validation:

```php
declare(strict_types=1);  
  
namespace App\Http\Controllers\Bookmarks;  
   
use App\Http\Requests\Bookmarks\StoreRequest;  
use App\Models\Tag;  
use Illuminate\Http\RedirectResponse;  
  
class StoreController
{  
    public function __invoke(StoreRequest $request): RedirectResponse  
    {  
        $bookmark = auth()->user()->bookmarks()->create([  
            'name' => $request->get('name'),  
            'url' => $request->get('url'),  
            'description' => $request->get('description'),  
        ]);  
  
        foreach (explode(',', $request->get('tags')) as $tag) {  
            $tag = Tag::query()->firstOrCreate(  
                ['name' => trim(strtolower($tag))],  
            );  
  
            $bookmark->tags()->attach($tag->id);  
        }  
  
        return redirect()->route('dashboard');  
    }  
}
```

Suddenly our controller is a lot smaller and a lot easier to understand. If you need to add a note in the comments to remind you that validation is being handled, feel free until you get into a workflow where you remember this is happening.

We could leave this here, as it is reasonable, but a standard in Laravel is to move this creation logic to a new class called an action on its own. There isn't an artisan command to create an action, so this will have to be done manually. Create a new file here `app/Actions/Bookmarks/CreateBookmarkAndTags`:

Then open this file in the editor so that we can add the following code block:

```php
declare(strict_types=1);

namespace App\Actions\Bookmarks;

use App\Models\Bookmark;  
use App\Models\Tag;

class CreateBookmarkAndTags
{
    public function handle(array $request, int $id): void
    {
		$bookmark = Bookmark::query()->create([  
			'name' => $request['name'],  
			'url' => $request['url'],  
			'description' => $request['description'],  
			'user_id' => $id,  
		]);

		if ($request['tags'] !== null) {
			foreach (explode(',', $request['tags']) as $tag) {
				$tag = Tag::query()->firstOrCreate(
					['name' => trim(strtolower($tag))],
				);

				$bookmark->tags()->attach($tag->id);
			}
		}
    }
}
```

We have a single `handle` method that accepts the request data and an ID that we will use for the User ID, which we then copy the logic from the controller into making a few minor adjustments. We can use this action anywhere in our application, from the UI, CLI, or even API, if needed. We created a modular action that can be called easily, tested, and have predictable results.

So now we can refactor our controller even further:

```php
declare(strict_types=1);  
  
namespace App\Http\Controllers\Bookmarks;  
  
use App\Actions\Bookmarks\CreateBookmarkAndTags;  
use App\Http\Requests\Bookmarks\StoreRequest;  
use Illuminate\Http\RedirectResponse;  
  
class StoreController
{  
    public function __invoke(StoreRequest $request): RedirectResponse  
    {  
        (new CreateBookmarkAndTags())->handle(  
            request: $request->all(),  
            id: auth()->id(),  
        );  
  
        return redirect()->route('dashboard');  
    }  
}
```

Now we have a single action that we call inside our controller and then return a redirect. Much cleaner, and it is named well. We can, of course, take this further should we want to, by using the Laravel container to inject the action in the constructor - allowing us to call the action. This would look like the following:

```php
declare(strict_types=1);  
  
namespace App\Http\Controllers\Bookmarks;  
  
use App\Actions\Bookmarks\CreateBookmarkAndTags;  
use App\Http\Requests\Bookmarks\StoreRequest;  
use Illuminate\Http\RedirectResponse;  
  
class StoreController 
{  
    public function __construct(  
        protected CreateBookmarkAndTags $action,  
    ) {}  
  
    public function __invoke(StoreRequest $request): RedirectResponse  
    {  
        $this->action->handle(  
            request: $request->all(),  
            id: auth()->id(),  
        );  
  
        return redirect()->route('dashboard');  
    }  
}
```

This last method is useful if your action has requirements for its constructor. Say you are using the repository pattern or another pattern - you can add that to the constructor of your action, and laravel will resolve this automatically for you if it can.

So we can list and create our bookmarks now, and we can add simple buttons to our bookmark listing to delete them now, too - no point creating something too big, right?

Create a new controller using the artisan command:

```bash
php artisan make:controller Bookmarks/DeleteController --invokable
```

Now we do not need an action for this as it is a one-liner, but if you want to provide multiple ways to delete a bookmark, follow the same steps as above, but this time to delete the bookmark instead of creating one. Add the following code to your controller:

```php
declare(strict_types=1);  
  
namespace App\Http\Controllers\Bookmarks;  
  
use App\Models\Bookmark;  
use Illuminate\Http\RedirectResponse;  
use Illuminate\Http\Request;  
  
class DeleteController  
{  
    public function __invoke(Request $request, Bookmark $bookmark): RedirectResponse  
    {  
        $bookmark->delete();  
  
        return redirect()->route('dashboard');  
    }  
}
```

Here we accept the Bookmark model as an argument so that we can enable route model binding, where Laravel will look up the record for you and inject it into your method - if it fails it will throw a 404 exception. All we then need to do is call delete on the model and return a redirect. Add the route next:

```php
Route::delete(  
    'bookmarks/{bookmark}',  
    App\Http\Controllers\Bookmarks\DeleteController::class,  
)->middleware(['auth'])->name('bookmarks.delete');
```

Finally we can go back to our component, and add a button:

```html
@forelse ($bookmarks as $bookmark)  
    <div>  
        <a href="#" class="block hover:bg-gray-50">  
            <div class="px-4 py-4 sm:px-6">  
                <div class="flex items-center justify-between">  
                    <p class="text-sm font-medium text-indigo-600 truncate">  
                        {{ $bookmark->name }}  
                    </p>  
                    <div class="ml-2 flex-shrink-0 flex">  
                        <form method="DELETE" action="{{ route('bookmarks.delete', $bookmark->id) }}">  
                            @csrf  
  
                            <button type="submit" class="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-red-500 bg-gray-100 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">  
                                Delete  
                            </button>  
                        </form>  
                    </div>  
                </div>  
                <div class="mt-2 sm:flex sm:justify-between">  
                    <div class="flex space-x-4">  
                        @foreach ($bookmark->tags as $tag)  
                            <p class="flex items-center text-sm text-gray-500">  
                                {{ $tag->name }}  
                            </p>  
                        @endforeach  
                    </div>  
                </div>  
            </div>  
        </a>  
    </div>  
@empty  
    <a href="#" class="relative block w-full border-2 border-gray-300 border-dashed rounded-lg p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">  
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>  
        <span class="mt-2 block text-sm font-medium text-gray-900">  
            Create a new bookmark  
        </span>  
    </a>  
@endforelse
```

We are now all connected. We can list create and delete. The final thing I will do is add a way for you to view the bookmark. A simple way to do this would be to add a button that allows you to open the link in a new tab, but that would be boring ...

Instead, I will redirect to the bookmark with a referrer so people can track where it is coming from. To do this, let's create a new controller again using the artisan console command:

```bash
php artisan make:controller Bookmarks/RedirectController --invokable
```

Now add this GET route:

```php
Route::get(  
    'bookmarks/{bookmark}',  
    App\Http\Controllers\Bookmarks\RedirectController::class  
)->middleware(['auth'])->name('bookmarks.redirect');
```

To manage building this URL, we could write it manually. However, I have previously created a library for these situations called `juststeveking/uri-builder`, which will let me build a URI and add extra parts fluently.

```php
declare(strict_types=1);  
  
namespace App\Http\Controllers\Bookmarks;  
  
use App\Http\Controllers\Controller;  
use App\Models\Bookmark;  
use Illuminate\Http\Request;  
use JustSteveKing\UriBuilder\Uri;  
  
class RedirectController extends Controller  
{  
    public function __invoke(Request $request, Bookmark $bookmark)  
    {  
        $url = Uri::fromString(  
            uri: $bookmark->url,  
        )->addQueryParam(  
            key: 'utm_campaign',  
            value: 'bookmarker_' . auth()->id(), 
        )->addQueryParam(  
            key: 'utm_source',  
            value: 'Bookmarker App'  
        )->addQueryParam(  
            key: 'utm_medium',  
            value: 'website',  
        );  
  
        return redirect(  
            $url->toString(),  
        );  
    }  
}
```

You do not need to go as in-depth as I have here - that part is up to you. Finally, we can just add a link to the UI, and away we go.

```html
<div class="flex items-center justify-between">  
    <p class="text-sm font-medium text-indigo-600 truncate">  
        {{ $bookmark->name }}  
    </p>  
    <div class="ml-2 flex-shrink-0 flex">  
        <a  
            href="{{ route('bookmarks.redirect', $bookmark->id) }}"  
            target="__blank"  
            rel="nofollow noopener"  
            class="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-indigo-600 bg-gray-100 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"  
        >Visit</a>  
        <form method="POST" action="{{ route('bookmarks.delete', $bookmark->id) }}">  
            @csrf  
            @method('DELETE')  
  
            <button type="submit" class="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-red-500 bg-gray-100 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">  
                Delete  
            </button>  
        </form>  
    </div>  
</div>
```

You could take this further by collecting stats of which bookmarks you viewed the most or anything else. You could even allow you to click on tags to view all of a certain tag - but I think this tutorial is enough to take in at once. 

How did you find this? Writing tutorials for people unfamiliar with Laravel can be tricky, and I hope I managed to explain it well enough and in enough detail for you to follow along. Let me know your thoughts on Twitter!
