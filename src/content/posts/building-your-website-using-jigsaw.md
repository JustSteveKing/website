---
title: Building your website using Jigsaw
pubDate: 2022-07-12
image: building-your-website-using-jigsaw.png
source: https://laravel-news.com/first-look-at-jigsaw
partner: Laravel News
description: Discover the ease of blogging with Jigsaw, a static site generator by Laravel partners Tighten. Learn to create a simple, markdown-based personal website, perfect for developers.
---

As developers, the chance of you having a personal website is pretty high. After all, it is what we do - and most likely, you have rebuilt this countless times. Because we all know that we need to rebuild our website before we finish that blog post we have been meaning to write...

I am guilty as the next developer for this; honestly, there is no shame in it. We use rebuilding our website as a learning experience and a time for us to experiment with new ideas or designs. But, if you ever get to a point where you think, "I just want a simple website so I can write," there is an answer. [Jigsaw](https://jigsaw.tighten.com/) is a static site generator built by Laravel partners [Tighten](https://tighten.com/), and it is what I have been using for the last year or so for my personal website.

The beauty of it is that it allows me to write my blog posts in markdown, has a simple blade view to render pages and posts - and can be built to be deployed on any number of services from GitHub Pages to Netlify and beyond.

Getting started with Jigsaw is much simpler than you might imagine, so let's walk through the setup together. Our first step is to create a directory for your project. I use `~/code/github/JustSteveKing` for most of my projects that I do not want to use Laravel Valet for. It allows me to organize projects by GitHub repo and organization easily. So run the following command to create the directory:

```bash
mkdir jigsaw-website
```

Our next step is to enter the directory:

```bash
cd $_

// or

cd jigsaw-website
```

Now we have entered the directory. We need to tell Composer that we want to use Jigsaw, so run the following composer command:

```bash
composer require tightenco/jigsaw
```

Once this process has run, we have a few options. Many templates are available, not just the ones listed in the project's documentation. A Google search will help you find many of them. We can start from scratch or use one of the templates available.

We will use one of the ones built by Tighten themselves called `blog`. To install this, run the following jigsaw command:

```bash
./vendor/bin/jigsaw init blog
```

This will bootstrap an entire blog for you quickly, setting everything up, so all you need to do is focus on writing - but you also have the option to start styling and modifying the templates. Let's have a look at the website and see what we are dealing with:

```bash
./vendor/bin/jigsaw serve
```

This should start a PHP server for you on `http://localhost:8000`, so visit it and get familiar with your new blog!

Now we can start thinking about how we might write our content. Open the project inside your code editor of choice, and we can explore what is there.

You can change the configuration for your website inside the `config.php` file, so if you open it up and change the values such as `siteName` and `siteDescription` if you restart the site, you should see your changes reflected.

You will also notice a config option called `collections`. These are content collections, and you can have as many as you need. You can even use remote collections, where you can fetch data from an API and create records in your built site to view them - cool, right?

We won't concentrate too much on this. Instead, let's start writing blog posts. We first want to delete all the dummy data created by this template - it isn't something we would want on our blog, after all. Delete all the files inside the following directories:

- `source/_categories`
- `source/_posts_`

Now we can look at creating a new post for our website. Next, create a new file using the command line:

```bash
touch source/_posts/my-first-blog-post.md
```

Then open it in your editor, and this will be your first blog post. The markdown files are constructed in two parts. You have what is called front matter, a YAML syntax for providing information about the Markdown file itself. This is where we will add things like the title, author, categories, and when it was created. It should look like this:

```markdown
---
extends: _layouts.post
section: content
title: My First Blog Post
date: 2022-06-21
description: This will be your meta description, make sure it isn't too long
categories: [writting]
---
```

So we have a title of `My First Blog Post`, a date and description, then categories. The important thing to remember is that categories are not created for you. To add a category, create another new file:

```bash
touch source/_categories/writting.md
```

Like the posts, this is also split into two parts. So we will add the following:

```markdown
---
extends: _layouts.category
title: Writing
description: All posts that are about writing.
---

These posts are about writing and stuff.
```

As you can see, we have two parts to the markdown file, the front matter and the actual content. If we now go back to our blog post, we can add anything we want in the markdown here:

```markdown
---
extends: _layouts.post
section: content
title: My First Blog Post
date: 2022-06-21
description: This will be your meta description, make sure it isn't too long
categories: [writting]
---

This is my blog post.

## Here is a heading 2

- here

- is

- a

- list

> Even a blockqute

[And a link](https://www.laravel-news.com/)
```

Now, if we serve the website again, using the jigsaw command:

```bash
./vendor/bin/jigsaw serve
```

When we visit `http://localhost:8000/blog/my-first-blog-post` we will see the new page we just created. 

So we have covered how to write content, which in fairness, wasn't too taxing. What else would we want on our website? Well, this template comes with a way to generate a sitemap, which is pretty helpful! 

Jigsaw has a concept called `Listeners` that runs after specific events during the build process of the website. If we open up `bootstrap.php`, you should see the following code:

```php
<?php

declare(strict_types=1);

$events->afterBuild(App\Listeners\GenerateSitemap::class);
$events->afterBuild(App\Listeners\GenerateIndex::class);
```

We have two registered listeners, one that will generate a sitemap for us and another that will generate an index for us. The index is used in the website's search function - something that comes as part of the blog template. Let's have a look at this `GenerateIndex` and see what it is doing:

```php
declare(strict_types=1);

namespace App\Listeners;

use TightenCo\Jigsaw\Jigsaw;

class GenerateIndex
{
	public function handle(Jigsaw $jigsaw): void
	{
		$data = collect($jigsaw->getCollection('posts')
			->map(function ($page) use ($jigsaw) {
				return [
					'title' => $page->title,
					'categories' => $page->categories,
					'link' => rightTrimPath(
						$jigsaw->getConfig('baseUrl')
					) . $page->getPath(),
					'snippet' => $page->getExcerpt(),
				];
		})->values());
		
		file_put_contents(
			$jigsaw->getDestinationPath() . '/index.json',
			json_encode($data)
		);
	}
}
```

This class is called and handled, so we get the `posts` collection, map over each one, and return an array of information we want to add to the search index. Next, we put the contents to a new file JSON encoding it. Kind of cool, and a nice way to build a search index. This data is already public on our website, so adding a publicly accessible JSON file allows us to access it easier through searching.

Let's add an RSS feed to our website now. You could use a few different ways to do this - using a listener or simply as a view. From my experience using Jigsaw, I opted for creating a view for this.

Inside our source directory, we will need to create a new file called `source/blog/rss.blade.xml`, note the file extension. We will be creating an XML file (shudder), but using blade so that we can have familiar syntax. Inside this file add the following code:

```xml
{!! '<'.'?'.'xml version="1.0" encoding="UTF-8" ?>' !!}
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
    <channel>
        <title>{{ $page->siteName }}</title>
        <link>{{ $page->baseUrl }}</link>
        <description><![CDATA[{{ $page->siteDescription }}]]></description>
        <atom:link href="{{ $page->getUrl() }}" rel="self" type="application/rss+xml" />
        <language>{{ $page->siteLanguage }}</language>
        <lastBuildDate>{{ $posts->first()->getDate()->format(DateTime::RSS) }}</lastBuildDate>

        @foreach($posts as $post)
            <item>
                <title><![CDATA[{!! $post->title !!}]]></title>
                <link>{{ $post->getUrl() }}</link>
                <guid isPermaLink="true">{{ $post->getUrl() }}</guid>
                <description><![CDATA[{!! $post->description !!}]]></description>
                <content:encoded><![CDATA[{!! $post->getContent() !!}]]></content:encoded>
                <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">{{ $post->author }}</dc:creator>
                <pubDate>{{ $post->getDate()->format(DateTime::RSS) }}</pubDate>
            </item>
        @endforeach
    </channel>
</rss>
```

We create a channel with our site information, then we loop through each post and add an item to this channel, creating a valid RSS feed. To add a link to the feed, edit the main layout to add the link in the head of our html . This allows RSS feed readers to auto-discover the feed. Open `source/_layouts/main.blade.php` and refactor the `<head>` element to look like the following:

```html
<head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
        <meta http-equiv="x-ua-compatible" content="ie=edge">
        <meta name="description" content="{{ $page->description ?? $page->siteDescription }}">

        <meta property="og:title" content="{{ $page->title ? $page->title . ' | ' : '' }}{{ $page->siteName }}"/>
        <meta property="og:type" content="{{ $page->type ?? 'website' }}" />
        <meta property="og:url" content="{{ $page->getUrl() }}"/>
        <meta property="og:description" content="{{ $page->description ?? $page->siteDescription }}" />

        <title>{{ $page->title ?  $page->title . ' | ' : '' }}{{ $page->siteName }}</title>

        <link rel="home" href="{{ $page->baseUrl }}">
        <link rel="icon" href="/favicon.ico">
        <link href="/blog/feed.atom" type="application/atom+xml" rel="alternate" title="{{ $page->siteName }} Atom Feed">

        <link rel="alternate" type="application/rss+xml" title="{{ $page->siteName }}" href="/blog/rss.xml" />

        @if ($page->production)
            <!-- Insert analytics code here -->
        @endif

        <link href="https://fonts.googleapis.com/css?family=Nunito+Sans:300,300i,400,400i,700,700i,800,800i" rel="stylesheet">
        <link rel="stylesheet" href="{{ mix('css/main.css', 'assets/build') }}">
    </head>
```

As you can see, we added the following snippet to point to our RSS feed. 

```html
<link rel="alternate" type="application/rss+xml" title="{{ $page->siteName }}" href="{{ $page->baseUrl.'/rss.xml' }}" />
```

So inspecting this code, we already have a feed - the atom feed. This comes as part of the template itself but is an Atom feed over an RSS feed - this isn't a problem, though. Having both options available means that you are more accessible, which is never a bad thing when it comes to your website.

The final step in using Jigsaw is to build your website, so it's ready for deployment, and you can do this using the following jigsaw command:

```bash
./vendor/bin/jigsaw build production
```

This will build your local site into static content inside `build_production`, a new directory that appears once this command is run. The final step is to deploy your website somewhere. The documentation has instructions on deploying to:

- [GitHub Pages](https://jigsaw.tighten.com/docs/deploying-your-site/#using-github-pages)
- [Netlify](https://jigsaw.tighten.com/docs/deploying-your-site/#using-netlify)
- [Amazon S3](https://jigsaw.tighten.com/docs/deploying-your-site/#using-amazon-s3)
- [Manual Deployment](https://jigsaw.tighten.com/docs/deploying-your-site/#manually)


So pick your desired provider for hosting, and set it up. You are now ready to start blogging with minimal effort - and an easy-to-use system to do it on. The fact that it is a static site also means that you do not have to worry about slow queries fetching data or any usual problems you might have with a non-static website.