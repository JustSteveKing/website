---
title: Creating a Password Generator
pubDate: 2022-11-25
image: creating-a-password-generator.png
source: https://laravel-news.com/creating-a-password-generator
partner: Laravel News
description: Explore creating a memorable yet secure password generator with Laravel, focusing on framework-agnostic implementation and customization options.
---

Password generation is something we all think about doing at some point, but how can we go about doing it - and making these passwords easy to remember and secure?

In this tutorial, I will walk you through how I recently built a password generator for fun and what my thoughts were. I created it for more than just Laravel but as a framework agnostic approach that I could use within Laravel easily.

When using a create password tool, you often get a selection of words joined together with a dash. I wanted to make something I could use and remember with relative ease, but with the option to make the passwords more "secure" by switching letters for numbers in places.

Let's get our code on!

We first want to define a standard interface that our generator will want to implement - this will allow us to use it within Laravel, outside of Laravel, and wherever we want to use it.

```php
interface GeneratorContract
{
    /**
     * @return string
     */
    public function generate(): string;

    /**
     * @return string
     */
    public function generateSecure(): string;
}
```

We want our implementation to have two possible approaches, generate a random password using memorable words - and another option to generate the same thing that may be seen as more secure. A perfect example of this would be:

`flying-fish-swimming-lizard` - memorable
`fly1ng-f1sh-sw1mm1ng-l1z4rd` - "secure"

To achieve this, we will need to create a way for words to be generated. We will need `Nouns` and `Adjectives`, meaning we need to create another contract to follow. This contract will be a way to fetch a random word from a registered list either in a standard approach or in our required `secure` approach.

```php
interface ListContract
{
    public function random(): string;

    public function secure(): string;
}
```

Both methods on this contract will achieve roughly the same thing, the only difference is that with one of them, we will do a little more processing before returning. Let's dive into the code to see how this can work. 

We know that we require a list of nouns and a list of adjectives, and both are going to do the same thing in terms of behavior. In the future, we may slightly change this so that we get verbs included as well, but for now, we will focus on nouns and adjectives. To achieve this, I will use a PHP Trait to add shared behavior to each implementation.

```php
trait HasWords
{
    /**
     * @param array $words
     */
    public function __construct(
        private readonly array $words,
    ) {
    }

    public function random(): string
    {
        return $this->words[array_rand($this->words)];
    }
}
```

To begin with, we create the trait, where we know that our implementation will want to be created with an array of words. Then we add the method for selecting a random item from this array. This will allow us to build our standard memorable password by calling this a few times and concatenating the results. Let's add this to the two implementations that we need to create.

```php
final class AdjectiveList implements ListContract
{
    use HasWords;
}


final class NounList implements ListContract
{
    use HasWords;
}
```

Our two implementations will allow us to generate half of what we need. We must consider how we want to create our "secure" passwords next. Let us revisit the trait we created.

```php
trait HasWords
{
    /**
     * @param array $words
     */
    public function __construct(
        private readonly array $words,
    ) {
    }

    public function random(): string
    {
        return $this->words[array_rand($this->words)];
    }

    public function secure(): string
    {
        $word = $this->random();

        $asArray = str_split($word);

        $secureArray = array_map(
            callback: fn (string $item): string => $this->convertToNumerical($item),
            array: $asArray,
        );

        return implode('', $secureArray);
    }

    public function convertToNumerical(string $item): string
    {
        return match ($item) {
            'a' => '4',
            'e' => '3',
            'i' => '1',
            'o' => '0',
            default => $item,
        };
    }
}
```

So how do this work? As a "secure" password, we still want to fetch a random word from our list, but we need to do some additional processing. We split the word into its core letters to have an array. We can then map over each letter - and call our convert method to update the input. Our convert method is a simple match statement that we can use to map the input to the output, so we are controlling how these are written. I have mapped these here to a typical approach you may find where the number representation looks like the letter representation - allowing us to have a memorable password still.

Our list control now works, and we can create a list of nouns and adjectives - that are injected into the constructors. We can fetch the word directly or pass it through a converter to make it more "secure". Our next step is to look at the implementation of our generator. So far, we only have implementations for the lists themselves. Let's look at some more code.

```php
final class PasswordGenerator implements GeneratorContract
{
    public function __construct(
        private readonly ListContract $nouns,
        private readonly ListContract $adjectives,
    ) {
    }

    public function generate(): string
    {
        return $this->build(
            $this->nouns->random(),
            $this->adjectives->random(),
            $this->nouns->random(),
            $this->adjectives->random(),
        );
    }

    public function generateSecure(): string
    {
        return $this->build(
            $this->nouns->secure(),
            $this->adjectives->secure(),
            $this->nouns->secure(),
            $this->adjectives->secure(),
        );
    }

    private function build(string ...$parts): string
    {
        return implode('-', $parts);
    }
}
```

Our password generator takes the two list implementations into its constructor so that we can access them. We then implement the two methods for generating passwords: memorable and secure.

For each approach, we call a method internally that will allow us to build the password by imploding the array with a joining string. If we want to extend this to more words, we must pass in more random words.

Our contract does not need to know about the `build` method as that is an implementation detail. We could extend this method to customize the joining character - but I will leave that to your implementation should you want to.

As an additionally added extra, we will now create a service provider and facade so that you can quickly call or inject this into your application code. This part is Laravel only, though. Up until this point, we have focused on framework-independent code.

```php
final class PackageServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(
            abstract: GeneratorContract::class,
            concrete: fn (): GeneratorContract => new PasswordGenerator(
                nouns: new NounList(
                    words: (array) config('password-generator.nouns'),
                ),
                adjectives: new AdjectiveList(
                    words: (array) config('password-generator.adjectives'),
                ),
            ),
        );
    }

    public function boot(): void
    {
        if ($this->app->runningInConsole()) {
            $this->publishes(
                paths: [
                    __DIR__ . '/../../config/password-generator.php',
                    config_path('password-generator.php'),
                ],
                groups: 'password-generator-config',
            );
        }
    }
}
```

Here we are loading our configuration, which will house the nouns and adjectives we want to use in our password generator. We also provide a set of instructions to Laravel about how we wish to load our implementation from the container.

Now the facade will work in the same way but will resolve the implementation from the container allowing you to statically call the methods you wish to call.

```php
/**
 * @method static string generate()
 * @method static string generateSecure()
 *
 * @see GeneratorContract
 */
final class Generator extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return GeneratorContract::class;
    }
}
```

Our facade returns the contract that we have used to bind the implementation and has docblocks stating what methods are available and the return types it expects.

All we now need to do is call the password generator, and we can provide randomly generated passwords for our users.

```php
Generator::generate(); // flying-fish-swimming-lizard
Generator::generateSecure(); // fly1ng-f1sh-sw1mm1ng-l1z4rd
```

I have created a package that delivers this code above, which has a little more code should you wish to dive into the example a little more. You can find the repository for this here: https://github.com/JustSteveKing/password-generator

**Disclaimer**. This is not intended for use in a production environment to create your passwords. My use case for this is to actually generate one off use codes such as One Time Pass Codes. This is not the most secure as the list of words is quite small, and will leave you open to a potential dictionary attack.

