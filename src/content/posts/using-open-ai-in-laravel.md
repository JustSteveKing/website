---
title: Using OpenAI in Laravel
pubDate: 2023-01-06
image: using-open-ai-in-laravel.png
source: https://laravel-news.com/openai-in-laravel
partner: Laravel News
description: Discover how to harness the potential of OpenAI in Laravel for AI-driven applications, from natural language processing to text generation.
---

AI is it a buzzword, or is it something we should be thinking about? With the release of the OpenAI package, we can dive into AI-powered Laravel applications

So, what is OpenAI? What can we do with it? Mostly this is about natural language processing. We pass it some text, and in return, it can amaze us with many things. From complete text examples to code examples to whatever you need. The main limitation is your imagination and its current capabilities.

Nuno released the [OpenAI PHP client](https://laravel-news.com/openai-for-laravel) some time ago - but what can we do with this? Often I find that the most challenging part of working with this technology is understanding what you can do with it.

Looking around the OpenAI examples, I found loads of samples that would likely work well for me and general usage. Let's walk through the model for "Ad from product description". I am choosing this because we often capture text input from our users and then have to output this later for various reasons. Imagine you are running an online store and need to capture product descriptions for your items - and want to add some killer "ad" style text to encourage people to click on the product.

Let's jump in.

I won't walk you through the installation process of setting up the OpenAI PHP Client. As you are reading this, I assume I don't need to teach you this part. However, I will walk through how I would use this package, which will likely be different from other tutorials.

The first thing I would do is bind the OpenAI Client class to my container - so that I don't need to use the facade or instantiate a client.

```php
final class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(
            abstract: Client::class,
            concrete: fn () => OpenAI::client(
                apiToken: strval(config('openai.api_key')),
            ),
        );
    }
}
```

Now, anytime I try to inject the OpenAI Client class into a constructor or anywhere else, it will come pre-setup for me.

Our use case is when we save a product with a description. We want to auto-generate an advertisement text for the product. In reality, the best place for this to happen would be in a Job. One we can dispatch as part of the creation process of the model itself.

I won't go through the creation of the model, as I want to ensure I get all the points from this tutorial. 

When we dispatch a background job, we pass through what we want serialized into the constructor - and then, in the handle method, we can resolve instances from the DI container.

Let's look at how this would look if we were to approach it simply.

```php
final class GenerateAdFromProduct implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function __construct(
        public readonly string $text,
        public readonly int $product,
    ) {}

    public function handle(Client $client): void
    {
        $response = $client->completions()->create([
            'model' => 'text-davinci-003',
            'prompt' => $this->text,
            'temperature' => 0.5,
            'max_tokens' => 100,
            'top_p' => 1.0,
            'frequency_penalty' => 0.0,
            'presence_penalty' => 0.0,
        ]);
        
        DB::transaction(fn () => Product::query()->find(
            id: $this->product,
        ))->update(['ai_description' => $response['choices'][0]['text']]);
    }
}
```

This uses the settings described on the example page without looking too deep into it. Of course, if you do this in production, I highly recommend looking at these settings more carefully.

Can we improve this? Of course, we can - I am Steve, and I am opinionated .... Let's take it a step further.

What are we doing here? We use a predefined model to generate and return a response from OpenAI. The settings we are using are predefined in the examples. Of course, they can be tweaked, but we can use this to take this a step further.

Our first step is the model itself. There are only so many available that OpenAI currently supports - this may change at some point, but for now, it won't. Let's create an Enum for the model part of the payload:

```php
enum Model: string
{
    case ADA = 'text-ada-001';
    case BABBAGE = 'text-babbage-001';
    case CURIE = 'text-curie-001';
    case DAVINCI = 'text-davinci-003';
}
```

Step one is complete. Let's have a look at the OpenAI client request now.

```php
$client->completions()->create([
    'model' => Model::DAVINCI->value,
    'prompt' => $this->text,
    'temperature' => 0.5,
    'max_tokens' => 100,
    'top_p' => 1.0,
    'frequency_penalty' => 0.0,
    'presence_penalty' => 0.0,
]);
```

Pretty good. The rest of the settings are specific to the model and result I am trying to achieve from what I can tell from the documentation. So this is something that is purposefully set up so that I can get advertisement text from another text body. To me, this is an Advertising Transformer. It transforms whatever prompt you give it into an advertisement. So, with that in mind - let's create a specific class to create this.

```php
final class AdvertisementTransformer
{
    public static function transform(string $prompt): array
    {
        return [
            'model' => Model::DAVINCI->value,
            'prompt' => $prompt,
            'temperature' => 0.5,
            'max_tokens' => 100,
            'top_p' => 1.0,
            'frequency_penalty' => 0.0,
            'presence_penalty' => 0.0,
        ];
    }
}
```

We are extracting the logic of creating a completion to a dedicated class that will allow us to reuse it easily. Let's look back at the OpenAI client request now:

```php
$client->completions()->create(
    parameters: AdvertisementTransformer::transform(
        prompt: $this->text,
    ),
);
```

This, to me, at least, is clean and understandable. Looking at this, I am passing in the text from the job to a transformer that will transform to the required parameters for an advertisement text generator.

The output for this will be the following:

```json
{
  "object": "text_completion",
  "created": 1672769063,
  "model": "text-davinci-003",
  "choices": [
    {
      "text": "Are you a #Laravel developer looking to stay up-to-date with the latest news and updates? Look no further than Laravel News! With over 10K users daily, you'll be able to stay informed and learn from the official news outlet for the Laravel ecosystem. #LaravelNews #Developers #Ecosystem",
      "index": 0,
      "logprobs": null,
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 82,
    "completion_tokens": 72,
    "total_tokens": 154
  }
}
```

As you can see we have an array of choices, each with a text key. To retrieve this we just need to access it like we usually would in PHP:

```php
$response = $client->completions()->create(
    parameters: AdvertisementTransformer::transform(
        prompt: $this->text,
    ),
);

DB::transaction(fn () => Product::query()->find(
    id: $this->product,
))->update(['ai_description' => $response['choices'][0]['text']]);
```

All you now need to do is create the standard transformers that you might use in your application, tweak the parameters to the point that you know they will work for you, and you are free to carry on.
