---
title: Running PHPStan on max with Laravel
pubDate: 2022-06-20
image: running-phpstan-on-max-with-laravel.png
source: https://laravel-news.com/running-phpstan-on-max-with-laravel
partner: Laravel News
description: Discover how to enhance your Laravel project with static analysis using Larastan. Add confidence and type safety to your code.
---

Over the last few years static analysis in PHP, and more specifically Laravel, has become more and more popular. With more people adopting it into their Software Delivery Lifecycle, I thought it would be a good time to write a tutorial on how you can add this to your Laravel project.

Back in 2019 [Nuno Maduro](https://twitter.com/enunomaduro) released a package called [Larastan](https://github.com/nunomaduro/larastan) which was a set of PHPStan rules that work well for Laravel applications, and I was extremely excited. Up until this point I had struggled getting a good static analysis coverage in Laravel using [PHPStan](https://phpstan.org/) or [Psalm](https://psalm.dev/). Larastans rules allowed me to start applying more static analysis to my code base, and in turn having a lot more confidence in my code. Fast forward to today with PHP 8.1 and Laravel 9 - I have never felt more confident in the code I write thanks to the amount of amazing tools that are available to me.

In this tutorial I will walk through adding Larastan to a new Laravel project, set the level up to max, and see what we need to resolve. Then we will start to add some logic to our application, and see what is needed to allow us to keep confidence in our code as we go.

Like all things, you need somewhere to start - so create a new Laravel project called `larastan-test` in whichever way you would usually do it, I use the laravel installer personally but I know not everyone does:

```bash
laravel new larastan-test
```

Open this project in your code editor of choice, and we can get started. The first thing we will do is install Larastan, by running the following composer command:

```bash
composer require nunomaduro/larastan --dev
```

Once we have this dependency installed as a dev dependency, we can set up the configuration. The reason we want this as a dev dependency is because in production we should never be running any static analysis - it is for development purposes only to ensure your code is as type safe as possible. PHPStan uses a configuration format called `neon`, which is similar to yaml in a way. So we will create a new file in the root directory of out application called `./phpstan.neon` - if you are building a package, the recommended approach is to add `.dist` to the end of these configuration files, but for local app development this is fine. Inside this file we will start to define the configuration we need for phpstan to run and what rules we might want to impose, add the following code to the config file and we can walk through what it means:

```yaml
includes:
    - ./vendor/nunomaduro/larastan/extension.neon
parameters:
    paths:
        - app
    level: 9
    ignoreErrors:
    excludePaths:
```

We start with `includes` these are typically rules from packages that we want to include in our base phpstan ruleset. Then we move onto parameters, the first option `paths` allows us to define where we want phpstan to check - in our case we are only interested in our `app` directory where our Application code lives. You can extend this to cover over areas if you like, but be careful what you include as things are about to get strict! Next our `level` PHPStan has various levels it can check at, 0 being the lowest and 9 currently being the highest. As you can see we have set our level to 9, I would suggest this on an existing application as ideally you would want to work up to this level - but as this is a brand new project we can be pretty comfortable at 9. Next we have `ignoreErrors` and `excludePaths` these 2 are options that allow us to basically tell PHPStan to ignore files or specific errors that either we aren’t interested in, or we cannot control or fix right now. Perhaps you are in the middle of refactoring a few things and you are getting errors, you might be refactoring this code in a way that static analysis will be fine later on and you want to ignore the errors until you are done.

So let’s run phpstan against a default Laravel application and see what errors we are getting, if any. Run the following command in your terminal:

```bash
./vendor/bin/phpstan analyse
```

The output we are getting from a default Laravel application is shown below:

```markdown
Note: Using configuration file /Users/steve/code/sites/larastan-test/phpstan.neon.
 18/18 [▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓] 100%

 ------ ---------------------------------------------------------------------------------------------------------------------------- 
  Line   Providers/RouteServiceProvider.php                                                                                          
 ------ ---------------------------------------------------------------------------------------------------------------------------- 
  49     Parameter #1 $key of method Illuminate\Cache\RateLimiting\Limit::by() expects string, int<min, -1>|int<1, max>|string|null  
         given.                                                                                                                      
 ------ ---------------------------------------------------------------------------------------------------------------------------- 
                                                                                                       
 [ERROR] Found 1 error 
```

As you can see we only get one error with the default Laravel application, even when our strictness is set as high as it can go. That is pretty good going right? Of course you might see different results if you are adding this to an existing project, but following this tutorial you will learn how to approach these issues so you have a nice workflow to follow.

You can add a script to your composer file to run this if you would prefer to have a handy way of running it, so let us add that now so that we can run this command a little easier, add the following code block to your `composer.json` file:

```json
"scripts": {
  "phpstan": [
    "./vendor/bin/phpstan analyse"
  ]
},
"scripts-descriptions": {
  "phpstan": "Run PHPStan static analysis against your application."
},
```

You should already have some records under `scripts` in your composer file - just append the `phpstan` script to the end of the block. Now we can run PHPStan again, but this time using composer, which is a little easier to type:

```bash
composer phpstan
```

So we have 1 error, let’s have a look at that specific line, and see what it currently looks like:

```php
protected function configureRateLimiting()
{
    RateLimiter::for('api', function (Request $request) {
        return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
    });
}
```

The specific part that our static analysis is complaining about is this section:

```php
$request->user()?->id ?: $request->ip()
```

So we want to get the request user, if there is one and return the ID, or we want to return the IP address if the first part is null. So there is no real way to ensure that this is ever going to be a string, the user could be null and the request IP could also be null. This is a situation where you want to quiet the error, because there is no way you can enforce this as it is vendor code. The best thing you can do in this specific situation is tell PHPStan to ignore the error, but not globally. What we want to do here is add a command block instead of setting a rule, to tell PHPStan while it is analysing this code, to ignore this specific line. Refactor this method to look like the following:

```php
protected function configureRateLimiting(): void
{
    RateLimiter::for('api', static function (Request $request): Limit {
        /** @phpstan-ignore-next-line  */
        return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
    });
}
```

We have added a return type to the method, made the callback a static closure - and type hinted the return. But then we add the command block above the return telling PHPStan that we want to ignore the next line. If we now run PHPStan in the command line again you will see the following output:

```markdown
Note: Using configuration file /Users/steve/code/sites/larastan-test/phpstan.neon.
 18/18 [▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓] 100%
                                                                                                            
 [OK] No errors
```

So we have the default Laravel application running on PHPStan at max, now we need to start adding some actual logic to our application so that we can ensure type safety as we add features and logic. For this we are going to create a simple application that stores bookmarks, nothing fancy.

Let’s get started by adding a Model using artisan, and using the CLI flags to create the migration and factory at the same time:

```bash
php artisan make:model Bookmark -mf
```

We want to make our migration up method look like the following:

```php
Schema::create('bookmarks', static function (Blueprint $table): void {
    $table->id();
            
    $table->string('name');
    $table->string('url');
            
    $table->boolean('starred')->default(false);
            
    $table->foreignId('user_id')->index()->constrained()->cascadeOnDelete();
            
    $table->timestamps();
});
```

Now we can add this to our model:

```php
class Bookmark extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'url',
        'starred',
        'user_id',
    ];

    protected $casts = [
        'starred' => 'boolean',
    ];

    /**
     * @return BelongsTo
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(
            related: User::class,
            foreignKey: 'user_id',
        );
    }
}
```

As you can see from the above, the only thing we care about here is a name, url, if the user wants to star/favourite a bookmark and that the bookmark belongs to a user. Now we can leave that here, but personally I like to add type definitions to my model properties - as currently in Laravel 9 I cannot type hint them. So refactor your model to look like the following:

```php
class Bookmark extends Model
{
    use HasFactory;

    /**
     * @var array<int,string>
     */
    protected $fillable = [
        'name',
        'url',
        'starred',
        'user_id',
    ];

    /**
     * @var array<string,string>
     */
    protected $casts = [
        'starred' => 'boolean',
    ];

    /**
     * @return BelongsTo
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(
            related: User::class,
            foreignKey: 'user_id',
        );
    }
}
```

All we are doing here is telling PHP and our IDE that the fillable array is an array of strings with no keys - which means it will default to integers. Then our casts array is a keyed array of strings, where the keys are also strings. Now this will not fail static analysis when you run it even without the type definitions - but it is a good practice to get into so that your IDE has as much information as possible while you are working.

Let’s move onto our routes and controllers so that we can keep running static analysis checks as we go. Now I am a big fan of invokable controllers - I find they work well for my code style, however you may not like them or have a different preference, so the next part feel free to stray away from following me line by line if you are more comfortable.

We will create a controller now, so run the following artisan command to create the index controller for bookmarks:

```bash
php artisan make:controller Bookmarks/IndexController --invokable
```

That is our index controller that we will need for our routing, so we can go and add a new route block to `routes/web.php` so we can start using it:

```php
Route::middleware(['auth'])->prefix('bookmarks')->as('bookmarks:')->group(static function (): void {
    Route::get('/', App\Http\Controllers\Bookmarks\IndexController::class)->name('index');
});
```

We want this block to be wrapped in our auth middleware so that we control access to bookmarks by the author, we also want to prefix all of the routes under `bookmarks` and set the naming strategy for this group to `bookmarks:*`. If we now run our static analysis on our code base we will see some errors, but this is mostly because we have no content inside our controller:

```bash
composer phpstan
```

```markdown
Note: Using configuration file /Users/steve/code/sites/larastan-test/phpstan.neon.
 20/20 [▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓] 100%

 ------ ------------------------------------------------------------------------------------------------- 
  Line   Http/Controllers/Bookmarks/IndexController.php                                                   
 ------ ------------------------------------------------------------------------------------------------- 
  15     Method App\Http\Controllers\Bookmarks\IndexController::__invoke() has no return type specified.  
 ------ ------------------------------------------------------------------------------------------------- 

 ------ ----------------------------------------------------------------------------------------------------------------------------- 
  Line   Models/Bookmark.php                                                                                                          
 ------ ----------------------------------------------------------------------------------------------------------------------------- 
  33     Method App\Models\Bookmark::user() return type with generic class Illuminate\Database\Eloquent\Relations\BelongsTo does not  
         specify its types: TRelatedModel, TChildModel                                                                                
         💡 You can turn this off by setting checkGenericClassInNonGenericObjectType: false in your                                   
         phpstan.neon.                                                                                                                
 ------ ----------------------------------------------------------------------------------------------------------------------------- 

 ------ ---------------------------------------------------------------------------------------------------------------------------- 
  Line   Models/User.php                                                                                                             
 ------ ---------------------------------------------------------------------------------------------------------------------------- 
  49     Method App\Models\User::bookmarks() return type with generic class Illuminate\Database\Eloquent\Relations\HasMany does not  
         specify its types: TRelatedModel                                                                                            
         💡 You can turn this off by setting checkGenericClassInNonGenericObjectType: false in your                                  
         phpstan.neon.                                                                                                               
 ------ ---------------------------------------------------------------------------------------------------------------------------- 
                                                                                                                        
 [ERROR] Found 3 errors   
```

The first thing standing out to me is the `Method App\Models\User::bookmarks() return type with generic class` error, now I don’t want to have a huge reliance on generics for this application. The error actually tells us what we can do, so let’s add `checkGenericClassInNonGenericObjectType: false` to our `phpstan.neon` file:

```yaml
includes:
    - ./vendor/nunomaduro/larastan/extension.neon
parameters:
    paths:
        - app
    level: 9
    ignoreErrors:
    excludePaths:
    checkGenericClassInNonGenericObjectType: false
```

Now if we run the analysis again, there will be only 5 errors and these are all to do with our controllers - let us start with our `IndexController` and see what we can do. Refactor your index controller to look like the following:

```php
class IndexController extends Controller
{
    public function __invoke(Request $request)
    {
        return View::make(
            view: 'bookmarks.list',
            data: [
                'bookmarks' => Bookmark::query()
                    ->where('user_id', $request->user()->id)
                    ->paginate(),
            ]
        );
    }
}
```

If we run static analysis against our code now, and pay attention only to the controller we are working on, we will see the following issues:

```markdown
------ ------------------------------------------------------------------------------------------------- 
  Line   Http/Controllers/Bookmarks/IndexController.php                                                   
 ------ ------------------------------------------------------------------------------------------------- 
  15     Method App\Http\Controllers\Bookmarks\IndexController::__invoke() has no return type specified.  
  21     Cannot access property $id on App\Models\User|null.                                              
 ------ ------------------------------------------------------------------------------------------------- 
```

So what can we do about these 2 errors? The first one is relatively simple to fix, we can add a return type:

```php
public function __invoke(Request $request): \Illuminate\Contracts\View\View
```

We can alias this contract to make it a little nicer on the eyes:

```php
public function __invoke(Request $request): ViewContract
```

The next one however, `Cannot access property $id on App\Models\User|null.` this is similar to what we had in our default Laravel application where the ID from a request user could be null. So the way I like to fix this is to use the Auth helper function to get the ID directly from our Auth guard. Refactor to query to look like the following:

```php
Bookmark::query()
    ->where('user_id', auth()->id())
    ->paginate()
```

Using the Auth ID method, we are getting an ID directly from the authentication guard instead of the request, where it has the potential to be null. The one thing to bear in mind while doing this is that if the route is not wrapped in authentication middleware then the id method will complain that you are trying to get the property ID of null. So make sure you have set the middleware for this route.

Now if we run static analysis again, we should have gotten rid of those errors:

```bash
composer phpstan
```

```markdown
Note: Using configuration file /Users/steve/code/sites/larastan-test/phpstan.neon.
 20/20 [▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓] 100%

                                                                                                                        
 [OK] No errors
```

Now that we have no errors coming from our `IndexController` anymore. What we do next is iterate through our application, making sure that we run our static analysis checks at important points. The last thing that we want to do is wait until the end of a sprint, or the end of adding a new feature to run it to find we have to spend countless hours fixing static analysis issues. However, at the end of it all - you will have code that you trust, and that is one of my favourite benefits of using static analysis in general. If you can pair static analysis with a good test suite, then there is no reason you should ever not have confidence in your code.

Are you using Larastan in your project? Have you been brave enough to turn the strictness to max? Let us know on twitter, or let us know your horror stories!