---
title: Using Laravel Model Factories in your tests
pubDate: 2022-07-28
image: laravel-model-factories.png
source: https://laravel-news.com/laravel-model-factories
partner: Laravel News
description: Master the use of Laravel Model Factories for predictable test data. Learn how to define and modify states for various scenarios in your app.
---

Laravel Model factories are one of the best features you can use in your application when it comes to testing. They provide a way to define data that is predictable and easy to replicate so that your tests are consistent and controlled.

Let's start with a simple example. We have an application used for blogging, so naturally, we have a `Post` model that has a status for if the post is published, drafted, or queued. Let's look at the Eloquent Model for this example:

```php
declare(strict_types=1);

namespace App\Models;

use App\Publishing\Enums\PostStatus;
use Illuminate\Database\Model;

class Post extends Model
{
	protected $fillable = [
		'title',
		'slug',
		'content',
		'status',
		'published_at',
	];

	protected $casts = [
		'status' => PostStatus::class,
		'published_at' => 'datetime',
	];
}
```
As you can see here, we have an Enum for the status column, which we will design now. Using an enum here allows us to take advantage of PHP 8.1 features instead of plain strings, boolean flags, or messy database enums.

```php
declare(strict_types=1);

namespace App\Publishing\Enums;

enum PostStatus: string
{
	case PUBLISHED = 'published';
	case DRAFT = 'draft';
	case QUEUED = 'queued';
}
```

Now, let's get back to the topic we are here to discuss: model factories. A simple factory would look very simple:

```php
declare(strict_types=1);

namespace Database\Factories;

use App\Models\Post;
use App\Publishing\Enums\PostStatus;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class PostFactory extends Factory
{
	protected $model = Post::class;

	public function definition(): array
	{
		$title = $this->faker->sentence();
		$status = Arr::random(PostStatus::cases());

		return [
			'title' => $title,
			'slug' => Str::slug($title),
			'content' => $this->faker->paragraph(),
			'status' => $status->value,
			'published_at' => $status === PostStatus::PUBLISHED
				? now()
				: null,
		];
	}
}
```

So in our tests, we can now quickly call our post factory to create a post for us. Let's have a look at how we might do this:

```php
it('can update a post', function () {
	$post = Post::factory()->create();

	putJson(
		route('api.posts.update', $post->slug),
		['content' => 'test content',
	)->assertSuccessful();

	expect(
		$post->refresh()
	)->content->toEqual('test content');
});
```
A simple enough test, but what happens if we have business rules that say you can only update specific columns depending on post type? Let's refactor our test to make sure we can do this:

```php
it('can update a post', function () {
	$post = Post::factory()->create([
		'type' => PostStatus::DRAFT->value,
	]);

	putJson(
		route('api.posts.update', $post->slug),
		['content' => 'test content',
	)->assertSuccessful();

	expect(
		$post->refresh()
	)->content->toEqual('test content');
});
```

Perfect, we can pass an argument into the create method to make sure that we are setting the correct type when we create it so that our business rules aren't going to complain. But that is a little cumbersome to keep having to write, so let's refactor our factory a little to add methods to modify the state:

```php
declare(strict_types=1);

namespace Database\Factories;

use App\Models\Post;
use App\Publishing\Enums\PostStatus;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class PostFactory extends Factory
{
	protected $model = Post::class;

	public function definition(): array
	{
		$title = $this->faker->sentence();

		return [
			'title' => $title,
			'slug' => Str::slug($title),
			'content' => $this->faker->paragraph(),
			'status' => PostStatus::DRAFT->value,
			'published_at' => null,
		];
	}

	public function published(): static
	{
		return $this->state(
			fn (array $attributes): array => [
				'status' => PostStatus::PUBLISHED->value,
				'published_at' => now(),
			],
		);
	}
}
```

We set a default for our factory so that all newly created posts are drafts. Then we add a method for setting the state to be published, which will use the correct Enum value and set the published date - a lot more predictable and repeatable in a testing environment. Let's have a look at what our test would now look like:

```php
it('can update a post', function () {
	$post = Post::factory()->create();

	putJson(
		route('api.posts.update', $post->slug),
		['content' => 'test content',
	)->assertSuccessful();

	expect(
		$post->refresh()
	)->content->toEqual('test content');
});
```

Back to being a simple test - so if we have multiple tests that want to create a draft post, they can use the factory. Now let us write a test for the published state and see if we get an error.

```php
it('returns an error when trying to update a published post', function () {
	$post = Post::factory()->published()->create();

	putJson(
		route('api.posts.update', $post->slug),
		['content' => 'test content',
	)->assertStatus(Http::UNPROCESSABLE_ENTITY());

	expect(
		$post->refresh()
	)->content->toEqual($post->content);
});
```

This time we are testing that we are receiving a validation error status when we try to update a published post. This ensures that we protect our content and force a specific workflow in our application.

So what happens if we also want to ensure specific content in our factory? We can add another method to modify the state as we need to:

```php
declare(strict_types=1);

namespace Database\Factories;

use App\Models\Post;
use App\Publishing\Enums\PostStatus;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class PostFactory extends Factory
{
	protected $model = Post::class;

	public function definition(): array
	{
		return [
			'title' => $title = $this->faker->sentence(),
			'slug' => Str::slug($title),
			'content' => $this->faker->paragraph(),
			'status' => PostStatus::DRAFT->value,
			'published_at' => null,
		];
	}

	public function published(): static
	{
		return $this->state(
			fn (array $attributes): array => [
				'status' => PostStatus::PUBLISHED->value,
				'published_at' => now(),
			],
		);
	}

	public function title(string $title): static
	{
		return $this->state(
			fn (array $attributes): array => [
				'title' => $title,
				'slug' => Str::slug($title),
			],
		);
	}
}
```

So in our tests, we can create a new test that ensures that we can update a draft posts title through our API:

```php
it('can update a draft posts title', function () {
	$post = Post::factory()->title('test')->create();

	putJson(
		route('api.posts.update', $post->slug),
		['title' => 'new title',
	)->assertSuccessful();

	expect(
		$post->refresh()
	)->title->toEqual('new title')->slug->toEqual('new-title');
});
```
So we can control things in our test environment using factory states nicely, giving us as much control as we need. Doing this will ensure that we are consistently preparing our tests or would be a good reflection of the applications state at specific points.

What do we do if we need to create many models for our tests? How can we do this? The easy answer would be to tell the factory:

```php
it('lists all posts', function () {
	Post::factory(12)->create();

	getJson(
		route('api.posts.index'),
	)->assertOk()->assertJson(fn (AssertableJson $json) =>
		$json->has(12)->etc(),
	);
});
```

So we are creating 12 new posts and ensuring that when we get the index route, we have 12 posts returning. Instead of passing the count into the factory method, you can also use the count method:

```php
Post::factory()->count(12)->create();
```

However, there are times in our application when we might want to run things in a specific order. Let's say we want the first one to be a draft, but the second is published?

```php
it('shows the correct status for the posts', function () {
	Post::factory()
		->count(2)
		->state(new Sequence(
			['status' => PostStatus::DRAFT->value],
			['status' => PostStatus::PUBLISHED->value],
		))->create();

	getJson(
		route('api.posts.index'),
	)->assertOk()->assertJson(fn (AssertableJson $json) =>
		$json->where('id', 1)
			->where('status' PostStatus::DRAFT->value)
			->etc();
	)->assertJson(fn (AssertableJson $json) =>
		$json->where('id', 2)
			->where('status' PostStatus::PUBLISHED->value)
			->etc();
	);
});
```

How are you using model factories in your application? Have you found any cool ways to use them? Let us know on twitter!