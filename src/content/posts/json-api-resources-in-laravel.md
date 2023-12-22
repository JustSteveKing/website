---
title: JSON API Resources in Laravel
pubDate: 2022-08-09
image: json-api-resources-in-laravel.png
source: https://laravel-news.com/json-api-resources-in-laravel
partner: Laravel News
description: Master JSON API Resources in Laravel with this guide. Learn to create consistent, compliant API responses with Tim MacDonald's package, streamlining your API development with attributes, relationships, and meta-data handling.
---

Building APIs in Laravel is a passion of mine, and I have spent a lot of time searching for the perfect way to return consistent JSON:API friendly resources so that I can find and use a standard.

In the past, I have used a cobbled-together solution that would just about manage to achieve what I needed, but it was quite a bit of work. The negatives outweighed the benefits of this approach, as the development time spent achieving it just felt like it wasn't worth it.

Luckily for you and me, Tim MacDonald built a fantastic package for this use case. It allows us to build and return JSON:API compliant resources that are easy to use. Let's walk through how this works.

Typically when building an API resource, we would extend Laravels `JsonResource` or `CollectionResource` depending on what we wanted to achieve. Our typical Resource might look like the following:

```php
class PostResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'type' => 'post',
            'attributes' => [
                'title' => $this->title,
                'slug' => $this->slug,
                'content' => $this->content,
            ]
        ];
    }
}
```

We are adding a simple implementation to "fake" a JSON:API resource at a basic level. But as you can see, this is a little - yuck. Let's install the package by Tim:

```bash
composer require timacdonald/json-api
```

Now we can refactor the above resource to follow JSON:API standards. Let me walk you through the changes.

Firstly, we need to change what class we are extending from `JsonResource` to `JsonApiResource`:

```php
class PostResource extends JsonApiResource
```

The next thing we need to make sure that we change is to remove the `toArray` method, as this package will handle this under the hood for you - instead, we use different methods that are useful for JSON:API standards. For example, to add `attributes` to your resource, you can use the following method:

```php
protected function toAttributes(Request $request): array
{
	return [
		'title' => $this->title,
                'slug' => $this->slug,
                'content' => $this->content,
	];
}
```

Now let's look at relationships. Previously we would do something similar to:

```php
 return [
	'id' => $this->id,
	'type' => 'post',
	'attributes' => [
		'title' => $this->title,
		'slug' => $this->slug,
		'content' => $this->content,
	],
	'relationships' => [
		'category' => new CategoryResource(
			resource: $this->whenLoaded('category'),
		),
	]
];
```

This isn't a bad way to do it by any means; however, let us have a look at how we would add these on the JSON:API package:

```php
protected function toRelationships(Request $request): array
{
	return [
		'category' => fn () => new CategoryResource(
			resource: $this->category,
		),
	];
}
``` 

So this time, we are passing through a closure to be evaluated to return the relationship. This is a very powerful way to do this, as it opens us up to add very custom behavior to relationship loading - meaning that we can load different conditional relationships or run authorization on the resource. Another point to note is that the closure is only evaluated when the client has included the relationship - making it a little cleaner.

Taking this another step further, adding links to your API resources is something that I feel is an important step. Adding these links makes your API navigatable, allowing clients to follow links as required programmatically. Previously I would add another array entry to add these and use the `route` helper to echo these out. The JSON:API package has an alternative approach, which is particularly fluent:

```php
protected function toLinks(Request $request): array
{
	return [
		Link::self(route('api:v1:posts:show', $this->resource)),
	];
}
```

As you can see - it is fluent, simple, and will generate the correct link for you. Of course, you are welcome to add what you need here, but it will add the links in a JSON:API standardized way - so you don't have to.

Finally, meta-data, in JSON:API, you can add additional information within the `meta-object` so you can add documentation links or anything you might need to pass back with an API resource (depending on your API design). There aren't a million use cases for this, but the package does support it. So let's have a look at this to understand it.

```php
protected function toMeta(Request $request): array
{
	return [
		'depreciated' => false,
		'docs' => 'https://docs.domain/com/resources/posts',
	];
}
```

As you can see above, we can add depreciation warnings so that clients can be notified of resources they need to consider changing - and a link to the docs explaining the replacement approach.

How do you build your API resources? Are you following any specific standards? Let us know on Twitter!
