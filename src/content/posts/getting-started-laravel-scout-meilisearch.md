---
title: Running PHPStan on max with Laravel
pubDate: 2022-06-21
image: getting-started-laravel-scout-meilisearch.png
source: https://laravel-news.com/getting-started-laravel-scout-meilisearch
partner: Laravel News
description: Boost your Laravel app's search experience with Laravel Scout and Meilisearch, offering powerful and efficient search capabilities that enhance user interaction.
---

We have all needed to add some sort of search to our applications before, and a lot of the time we leaned towards Algolia and Laravel Scout - because it worked out the box and achieved great results. But there is a (relatively) new kid on the block now, meilisearch. Meilisearch is very similar to Algolia in terms of functionality, however it is an open source project build using the Rust programming language. So you can run this locally at no cost, or in production using something like Laravel Forge to spin up a server.

This tutorial is going to walk through getting started using Meilisearch with Laravel Scout, so you can see the difference in set ups - and make a decision which way you would like to go. As always, we will start with a fresh Laravel application - I usually use the [Laravel Installer](https://laravel.com/docs/9.x/installation#the-laravel-installer) as I use Valet a lot locally - but this tutorial should work well across valet and docker.

Create a new application for this demo by running one of the following commands:

### Using the Laravel Installer

```bash
laravel new search-demo
```

### Using Composer create-project

```bash
composer create-project laravel/laravel search-demo
```

### Using Laravel build and Sail

```bash
curl -s "https://laravel.build/search-demo" | bash
```

Whichever way you choose to run the above, you will get a Laravel project under a new directory called `search-demo` which means we are good to get started.

The first thing we want to do is [install Laravel Scout](https://laravel.com/docs/9.x/scout#installation) by running the following composer command:

```bash
composer require laravel/scout
```

This will install Scout into our Laravel application, so that we can start interacting with any of the potential drivers we might want to use for search. Our next step is to publish the configuration for Laravel Scout by running the following artisan command:

```bash
php artisan vendor:publish --provider="Laravel\Scout\ScoutServiceProvider"
```

This will set us up so that we can modify the newly created `config/scout.php` to however we might want to change it, but the chances are you will want to keep this pretty standard.

At this point we have a few options, driver options. In this tutorial we are going to be covering how to use [Meilisearch](https://www.meilisearch.com/) but you have the following options available as Laravel Scout drivers:
-	Algolia: Use the algolia 3rd party service.
-	Meilisearch: Use the open source meilisearch service.
-	Collection: Use the database as a search service - only supports MySQL and PostgreSQL.
-	null: Don't use a driver - usually used for testing.

To get started using the meilisearch driver, we need to install a new package which will allow scout to use the meilisearch SDK, so run the following composer command:

```bash
composer require meilisearch/meilisearch-php
```

So the Laravel documentation says you also need to install `http-interop/http-factory-guzzle` however if you look at the meilisearch-php library this is now included as part of that dependency. So we can skip this, or install it if it makes you more comfortable. Our next step is to set some ENV variables inside of our `.env` file:

```bash
SCOUT_DRIVER=meilisearch
MEILISEARCH_HOST=http://127.0.0.1:7700
MEILISEARCH_KEY=masterKey
```

The `MEILISEARCH_KEY` env variable is an interesting one, if you install meilisearch locally, you can start the service and pass an optional flag to set this each time you run it. In production you will need to ensure that you set this as a security measure, however locally you are free to leave this empty if you wish. Personally I keep this set, as it is good practice and reminds me that I need to actually set it.

We have Laravel Scout installed, and we have the meilisearch client installed and configured. The next step is to think about data, like all good applications - it kind of needs it. For this demo we are going to use a fairly basic example so that we can focus on the meilisearch and scout topic, and not get lost in demo code logic. This will be a simple blog application, where we have blog posts and categories. So we can index everything we need.

Create a new Eloquent model called `Category` by running the following artisan command, note the additional flags to create a migration and factory which will be important here:

```bash
php artisan make:model Category -mf
```

Our Category will be a relatively light model, so I will show you the migration code below and let you handle the model itself, using either `fillable` or `guarded` depending on your personal preference.

```php
public function up()
{
    Schema::create('categories', static function (Blueprint $table): void {
        $table->id();
 
        $table->string('name');
        $table->string('slug')->unique();
		
		$table->boolean('searchable')->default(true);
 
        $table->timestamps();
    });
}
```

What we have here is a name, slug and searchable boolean flag. That allows us to have specific categories completely hidden from our search - which sometimes might be useful. Fill in your Eloquent Model however you would usually do it and the next step is to create the model factory:

```php
class CategoryFactory extends Factory
{
    protected $model = Category::class;

    public function definition(): array
    {
        $name = $this->faker->unique()->word();

        return [
            'name' => $name,
            'slug' => Str::slug(
                title: $name,
            ),
            'searchable' => $this->faker->boolean(
                chanceOfGettingTrue: 85,
            ),
        ];
    }

	public function searchable(): static
    {
        return $this->state(fn (array $attributes): array => [
            'searchable' => true,
        ]);
    }

	public function nonsearchable(): static
    {
        return $this->state(fn (array $attributes): array => [
            'searchable' => false,
        ]);
    }
}
```

We have made the default likelihood of categories being searchable quite high, but then we have added extra state methods to allow us to control this likelihood for testing purposes. This gives us the best coverage for testing our implementation.

Next we will need another Model called `Post` which will be our main entry point for searching, so run the following artisan command:

```bash
php artisan make:model Post -mf
```

Again like before I will show you the migration, and let you handle the fillable or guarded property on your model - as this is very much personal preference.

```php
public function up(): void
{
    Schema::create('posts', static function (Blueprint $table): void {
        $table->id();

        $table->string('title');
        $table->string('slug')->unique();
        $table->mediumText('content');
		
		$table->boolean('published')->default(true);

        $table
			->foreignId('category_id')
			->index()->constrained()->cascadeOnDelete();

        $table->timestamps();
    });
}
```

The next step is to fill in our Factory for our Post model:

```php
class PostFactory extends Factory
{
    protected $model = Post::class;

    public function definition(): array
    {
        $title = $this->faker->unique()->sentence();

        return [
            'title' => $title,
            'slug' => Str::slug(
                title: $title,
            ),
            'content' => $this->faker->paragraph(),
            'published' => $this->faker->boolean(
                chanceOfGettingTrue: 85,
            ),
            'category_id' => Category::factory(),
        ];
    }

    public function published(): static
    {
        return $this->state(fn (array $attributes): array => [
            'published' => true,
        ]);
    }

    public function draft(): static
    {
        return $this->state(fn (array $attributes): array => [
            'published' => false,
        ]);
    }
}
```

Like the Category model, we have a boolean flag - but this time it is for whether or not the model is published - so that we can have a draft state. We add the additional state methods onto our Factory to allow us good control over this within our testing environment.

Finally you can add the relationships to your Models, your Category should `HasMany` Posts, and your Post should `BelongsTo` Category.

Now that our data is all modelled and ready to be used, we want to be able to seed some data. But before we do that, we need meilisearch installed. If you are using Laravel Sail it is as simple as passing an option when you tell sail to install - with Laravel Valet however it is a little different. The install instructions for this are on the [meilisearch documentation](https://docs.meilisearch.com/learn/getting_started/quick_start.html#setup-and-installation) and are relatively easy to follow, any issues make sure you check requirements to run meilisearch locally.

Assuming that you now have meilisearch up and running, let us look at seeding some data. I am going to add a progress bar to my seeder so I know it is working correctly, but feel free to skip this step if you do not want to:

```php
class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
		$categories = Category::factory(10)->create();
		
		$categories->each(function (Category $category) {
			$this->command->getOutput()->info(  
    			message: "Creating posts for category: [$category->name]",  
			);

			$bar = $this->command->getOutput()->createProgressBar(100);

			for ($i = 0; $i < 100; $i++) {
				$bar->advance();
				Post::factory()->create();
			}

			$bar->finish();
		});
    }
}
```

I don't want any side effects to my seeding right now, as I want to control this behaviour - so I use the `WithoutModelEvents` trait to stop these. What we are doing here is creating 10 Categories, then for each one we will create a progress bar and create 100 posts for this category. This gives visual output while running seeders, and makes sure that each Category has posts - so when we search we can see what we have available.

Now that we have some data, we can look at making our Post model Searchable. To do this, all we need to do is add the `Searchable` trait from Laravel Scout to our Model:

```php
class Post extends Model
{
    use Searchable;
    use HasFactory;

    // Other model stuff here ...
}
```

Now that our model is searchable, we can start to add a few controls to our Model for how we want it to be searched. Almost 99% of the time I want to use my Post model, I will also want the category - so I will tell the Eloquent model to always load the Category model alongside it.

```php
class Post extends Model
{
    use Searchable;
    use HasFactory;
	
	protected $with = [
		'category'
	];

	// Other model stuff here ...
}
```

Now we can add a new method to allow Laravel Scout to check if a model can be searched, or added to the index:

```php
class Post extends Model
{
    use Searchable;
    use HasFactory;
	
	protected $with = [
		'category'
	];

	public function searchable(): bool
	{
    	return $this->published || $this->category->searchable;
	}

	// Other model stuff here ...
}
```

If our Post has been published, or belongs to a category that is searchable - we want this to be indexed. This will allow Scout when updating to re-evaluate if this model needs to be indexed. The next step is to control how we want this to index, we won't worry about the index name - as I typically leave this as standard for smaller applications - but you can override this using the `searchableAs` method and setting an index name yourself. To control how the data is added to meilisearch you need to add the `toSearchableArray` method, which allows you to define an array to index the data:

```php
class Post extends Model
{
    use Searchable;
    use HasFactory;
	
	protected $with = [
		'category'
	];

	public function searchable(): bool
	{
    	return $this->published || $this->category->searchable;
	}

	public function toSearchableArray(): array
	{
    	return [
        	'title' => $this->title,
        	'slug' => $this->slug,
        	'content' => $this->content,
        	'category' => [
            	'name' => $this->category->name,
				'slug' => $this->category->slug,
        	]
    	];
	}

	// Other model stuff here ...
}
```

We want to add the category information to each post, so that we can properly display information on our UI for the post itself, something like "Post Title (Category Name)" or something like that.

Finally we have something that can be indexed and searched, so let's import all of our records for Post into meilisearch:

```bash
php artisan scout:import "App\Models\Post"
```

This should show an output of chunks of 500 records all being added to scout. So now we have something to search we need to think about how we want to search. When it comes to Scout you can do a simple search using the static search method on a model - where you pass it a query and it returns hydrated models, or you can start to look at filters and more. So let us look at a basic search inside a controller and refactor from there.

```php
class SearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        return new JsonResponse(
            data: Post::search(
                query: trim($request->get('search')) ?? '',
            )->get(),
            status: Response::HTTP_OK,
        );
    }
}
```

For now let us register this route under our api routes so we can view results without creating a UI.

```php
Route::get(
    'search',
    App\Http\Controllers\SearchController::class
)->name('search');
```

Now we can go view JSON output for our search based on a search query parameter, have a look and test how it responds. Try searching against whole words and partial words. This is the basics of Laravel Scout and Meilisearch covered, we can index models and search against them now - so we are good from that angle. The next step is to think about how we can get a little more.

Filters are great things, it allows us to get more targetted results on our search, simply by asking for them. So we will add some filters to our Post model so we can easily filter our queries. This is my approach, it does not have to be yours though, so take what I am about to do with a slight pinch of salt and adapt to suit your own needs.

```php
class Post extends Model
{
    use Searchable;
    use HasFactory;
	
	protected $with = [
		'category'
	];

	public function searchable(): bool
	{
    	return $this->published || $this->category->searchable;
	}

	public function toSearchableArray(): array
	{
    	return [
        	'title' => $this->title,
        	'slug' => $this->slug,
        	'content' => $this->content,
        	'category' => [
            	'name' => $this->category->name,
				'slug' => $this->category->slug,
        	]
    	];
	}

	public static function getSearchFilterAttributes(): array
	{
    	return [  
        	'category.name',
        	'category.slug',
    	];
	}

	// Other model stuff here ...
}
```

I have added a static function to define the search filter attributes for my model, and as you can see I want to be able to filter by category name or slug. The next step is to create a command to register these filterable attributes with meilisearch. I usually create a console command to do this as scout doesn't have a way to do it by default:

```bash
php artisan make:command Search/SetupSearchFilters
```

Then add the following code snippet:

```php
class SetupSearchFilters extends Command
{
    protected $signature = 'scout:filters 
		{index : The index you want to work with.}
	';

    protected $description = 'Register filters against a search index.';

    public function handle(Client $client): int
	{
        $index = $this->argument(
            key: 'index',
        );

        $model = match($index) {
            'posts' => Post::class,
        };

        try {
            $this->info(
                string: "Updating filterable attributes for [$model] on index [$index]",
            );

            $client->index(
                uid: $index,
            )->updateFilterableAttributes(
                filterableAttributes: $model::getSearchFilterAttributes(),
            );
        } catch (ApiException $exception) {
            $this->warn(
                string: $exception->getMessage(),
            );

            return self::FAILURE;
        }

        return 0;
    }
}
```

What we do here is pass an index, incase we ever expand what we want to index, and then match it to a model using a match/switch statement. Then because of how console commands work, we can resolve the meilisearch client in our handle method - and use that to update the index, while getting the search filter attributes. If this fails then we display the exception and return a failure.

Now we can run this with the following command:

```bash
php artisan scout:filters 'posts'
```

If everything went as planned, meilisearch will now know about the filters available on your index. So let us have a look to see if we can do it? We will refactor our SearchController to accept filters into the search now.

```php
class SearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        return new JsonResponse(
            data: Post::search(
                query: $request->get('search'),
				callback: function (Indexes $meilisearch, string $query, array $options) use ($request) {
					if ($request->has(key: 'categry.slug')) {
						$options['filter'] = "category.slug = {$request->get(key: 'category.slug')}";
					}

					return $meilisearch->search(
						query: $query,
						options: $options,
					);
				},
            )->get(),
            status: Response::HTTP_OK,
        );
    }
}
```

Now if you add another query paramter onto your search of `category.slug={something}` then you should get a filtered result of the search you are performing, mine currently looks like: `/api/search?search=rem&category.slug=voluptatibus` which filters the results nicely. You can extend these as much as you might want including the filter for category name or even more depending on how you chose to model your data. You can even create filters to filter based on time if you have a need for it.

This is just one way you can implement a great search using Laravel Scout into your application, and fine tune it using filters if you need to. There are many drivers available to use with Laravel Scout, and it isn't impossible to create your own - in fact there are already a few open source ones you could use if they fit your use case!

How are you handling search for your application? Have you tried meilisearch yet? Let us know on twitter and let us know how you found this article!
