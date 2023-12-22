---
title: Steve vs Matt — How two developers approach the same problem
pubDate: 2022-12-15
image: two-developers-approach-the-same-problem.png
source: https://laravel-news.com/two-developers-approach-the-same-problem
partner: Laravel News
description: Steve vs Matt; Two Developers, One Problem - Witness two programmers tackle the same challenge with contrasting approaches
---

It's very common to see two programmers who code the same feature differently. But it's much less common for those two programmers to see eye-to-eye and remain friendly. Thankfully, we have a chance to see how two friends approach the same coding challenge differently and each friend's reflection on the other's code and approach.

Recently Matt shared an opinion on Twitter: ["Most interfaces in PHP code are completely useless."](https://twitter.com/stauffermatt/status/1597247009907683328) One respondent tagged Steve about his love for interfaces, and Steve & Matt decided to write an article about how we each code.

## The context

As our topic, we chose Steve's most recent tutorial, [Creating a Password Generator](https://laravel-news.com/creating-a-password-generator). Steve will show his code from the article and explain his reasoning, and then Matt will respond to Steve's coding style; then Matt will take the same spec and write it his way, explain his reasoning, and Steve will give his notes.

We hope this will be an excellent opportunity for conversation and learning!

### The spec

In Steve's article, he created a `Generator` class with two methods: `generate` and `generateSecure`. They (optionally, in Laravel) pull from a list of nouns and adjectives., both defined in config. They both generate `adjective-noun-adjective-noun` type passwords, but `generateSecure` will replace all a's with 4's, e's with 3's, i's with 1's, and o's with 0's.

## How Steve writes it

I think most people can agree that I love Interfaces, sometimes a little too much. One of my main reasons for this is because, like most things - defining a contract makes life easier. The time investment of an interface is nothing compared to running in circles because you need help figuring out what method you should be calling. But enough about that, as I agree that I tend to reach for them all too soon "at times" ...

As read in my [other article](https://laravel-news.com/creating-a-password-generator) I won't bore you all with the same walkthrough of the code again, but instead, summarise it into understandable chunks to allow an honest insight from my co-author Matt.

What I start with is an interface for the things I want to be able to list. In the tutorial, I limited this to only 'Adjectives' and 'Nouns'. However, I wanted to add this interface because it would allow me to extend this behavior in applications that provide a fun context. The interface looks like the following:

```php
interface ListContract
{
    public function random(): string;
 
    public function secure(): string;
}
```

Now imagine, if you will, that this was being used in a Fishing application (random example I know). You could implement your own `FishList` or `EquipmentList` that allows you to generate a fun password like `trout-rod-bass-lure`, which, as I am sure you would agree, would be much more memorable for a fan of fishing! However, what was lost in the other tutorial, is that this is more aimed at one-time passcodes than production passwords. That, however, is not the point of this article.

Once we have our interface in place, we can build a list class that implements the List Contract itself - building out our first implementation. For this tutorial, I will slightly diverge from the original article and add some fun. We will create a `LaravelList` to use random words associated with Laravel.

```php
final class LaravelList implements ListContract
{
    use HasWords;
}
```

Using the other parts of the tutorial, I can add a section to my configuration like so:

```php
return [
    // nouns and adjectives generated already
    'laravel' => [
        'taylor',
        'james',
        'nuno',
        'tim',
        'jess',
        'dries',
        'vapor',
        'sanctum',
        'passport',
        'eloquent',
    ]
];
```

Using the exact implementation I did in the original tutorial, I will show the service provider how I want to implement this.

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
                adjectives: new LaravelList(
                    words: (array) config('password-generator.laravel'),
                ),
            ),
        );
    }
 
    // boot method would be below.
}
```

I am completely undecided on the generating of the passcodes/password through - I think there are some improvements to be made instead of my initial solution of:

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

I am definitely sure about using a match statement (you'll see below that Matt used `str_replace` instead), as it is very extendable and understandable from a glance. Using this, I can directly understand what the output of each potential letter could be - and extending this is just a step of adding another case. Reducing the number of default returns as you grow means that you understand exactly what should come back from this method. Yes, this is something that you could consider as over-engineering slightly. However, as I implemented a contract that says all I have to do is implement `random` and `secure` it leaves me a lot of freedom to decide on my class. In particular, I could improve this - without it having a knock-on effect on the rest of the application or anything already integrated.

Finally, onto the generator class itself, it is something I designed so that I could use Laravel container to bind the instance - allowing you to override parts of it in userland should your use case differ from mine. This is precisely what the container is designed for. I can resolve the specific instance from the container or use a facade to interact with the implementation statically. I pass a variadic amount of 'parts' into the build method so that if you want to generate something longer or change the order, the class or contract itself doesn't care. All it cares about is that it will return a string.

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

Overall this solution allows for a lot of extension and customization regarding userland or quick adaptations should it be needed. It is erring on the side of over-engineering, though!

### Matt's code review of Steve's code

I think you did a lot of the review yourself, my friend! 😆

Steve's caveats here bring a lot of my thoughts already: a lot of usages of interfaces and traits over-engineer for the *possible* future, but that ends up with us creating a more complicated system that's less capable of adapting if the future becomes something other than what we are imagining *might* happen.

I think the `match` statement instead of the `str_replace` you'll see me use in my example is the most enjoyable little bit of difference. `str_replace` is clearer upfront; more people are familiar with it, and it requires fewer lines of code and doesn't need an extra `array_map`. However, as Steve pointed out, the syntax cleanly shows the initial and replacement letters on the same lines, and that's definitely nice. Either way, it's fun to see all the different ways we can use `match`.

I also have one note about the `NounList` and `LaravelList` classes: what if, instead of type hinting an interface, we instead had a single class named `WordList` that took a list of words into its constructor? That way, we could still get the `random()` method abstracted away, but we're avoiding a tiny interface and a new class for every list of words we might want to use in the future.

## How Matt writes it

Let's talk about the spec and where my brain goes with how I would build this, step by step.

### The general API

The spec for this project is to create a class, `Generator`, with two methods: `generate` and `generateSecure`. That's our entire public API. I'll name it `PasswordGenerator` just to be a bit more clear.

In my brain, this is really one method and one decoration of that method. I imagine we'll run the output of `generate()` through some sort of securing method. So I imagine this being our general class structure:

```php
class PasswordGenerator
{
    public function generate(): string
    {
        // generate a password
    }

    public function generateSecure(): string
    {
        return $this->makeStringSecure($this->generate());
    }

    public function makeStringSecure(string $string): string
    {
        // replace some characters in the password with numbers
    }
}
```

### Making a string secure

Since `makeStringSecure` is the simpler of the two methods we haven't implemented, let's build it out. Effectively, we're replacing instances of a few vowels (a, e, i, and o) with numbers (4, 3, 1, 0) that look similar. `str_replace` to the rescue!

```php
class PasswordGenerator
{
    public function generate(): string
    {
        // generate a password
    }

    public function generateSecure(): string
    {
        return $this->makeStringSecure($this->generate());
    }

    public function makeStringSecure(string $string): string
    {
        return str_replace(
            ['a', 'e', 'i', 'o'],
            ['4', '3', '1', '0'],
            $string
        );
    }
}
```

Once I finished writing this method, I realized I wanted to quickly check to make sure I wrote it *right*. "Wouldn't it be nice," I thought to myself, "to have a test to check this method instead of having to test it manually every time?" So, let's spin up a really quick test to prove that `makeStringSecure` method works the way we want.

```php
class PasswordGeneratorTest extends TestCase
{
    /** @test */
    public function it_converts_some_vowels_to_numbers()
    {
        $generator = new PasswordGenerator();

        $this->assertEquals(
            'fly1ng-f1sh-sw1mm1ng-l1z4rd',
            $generator->makeStringSecure('flying-fish-swimming-lizard')
        );
    }
}
```

With this test, I'm confident I handled the example Steve gave in his article. However, this particular string doesn't capture the letters "e" or "o", so I'm going to switch it up a little to make the test a bit more robust:

```php
class PasswordGeneratorTest extends TestCase
{
    /** @test */
    public function it_converts_some_vowels_to_numbers()
    {
        $generator = new PasswordGenerator();

        $this->assertEquals(
            'fly1ng-g04t-3l0p1ng-l1z4rd',
            $generator->makeStringSecure('flying-goat-eloping-lizard')
        );
    }
}
```

### Generating the passwords

Finally, we need to build out the method for `generate()`. What's the spec?

#### Bringing in the word lists

Passwords will be created by joining words from two lists, which we want to pass into the constructor and (in Laravel apps) store in the config as `password-generator.nouns` and `password-generator.adjectives`.

So, first, let's provide the password generator with the list of nouns and adjectives and then build the `generate()` method. First, the lists:

```php
class PasswordGenerator
{
    public function __construct(
        public readonly array $adjectives,
        public readonly array $nouns
    ) {
    }
```

We can pass the nouns and adjectives in every time we instantiate a generator:

```php
$generator = new PasswordGenerator(
    config('password-generator.adjectives'),
    config('password-generator.nouns')
);
```

Or, if we're working with Laravel, we can bind it to the service provider:

```php
class AppServiceProvider()
{
    public function register(): void
    {
        $this->app->singleton(
            PasswordGenerator::class,
            fn () => new PasswordGenerator(
                config('password-generator.adjectives'),
                config('password-generator.nouns')
            )
        );
    }
}
```

If we've bound it to the service provider, we can then pull an instance out of the Laravel container without having to explicitly pass it in our word lists. We can type-hint the class in any of a number of different places (route definitions, constructors of commands, etc.) or pull it ourselves:

```php
$generator = app(PasswordGenerator::class);
```

#### Generating a password from the word lists

Now that we have access to the lists of nouns and adjectives as properties on our instance, let's build the `generate()` method to create a password.

The spec states that passwords should be `adjective-noun-adjective-noun`. That means we need to be able to get a random adjective and a random noun easily, and then join them.

```php
class PasswordGenerator
{
    public function generate(): string
    {
        // adjective-noun-adjective-noun
        return implode('-', [
            $this->adjectives[array_rand($this->adjectives)],
            $this->nouns[array_rand($this->nouns)],
            $this->adjectives[array_rand($this->adjectives)],
            $this->nouns[array_rand($this->nouns)],
        ]);
    }
```

If we knew we planned to use this tooling later, perhaps to generate passwords with a different structure, it may be worth creating a method for pulling a random adjective and one for pulling a random noun. We could also consider storing the "structure" of the password somewhere. But the spec doesn't call for that, so YAGNI. We build what we need when we need it.

#### Final output

Here's what our final product looks like:

```php
class PasswordGenerator
{
    public function __construct(
        public readonly array $adjectives,
        public readonly array $nouns
    ) {
    }

    public function generate(): string
    {
        // adjective-noun-adjective-noun
        return implode('-', [
            $this->adjectives[array_rand($this->adjectives)],
            $this->nouns[array_rand($this->nouns)],
            $this->adjectives[array_rand($this->adjectives)],
            $this->nouns[array_rand($this->nouns)],
        ]);
    }

    public function generateSecure(): string
    {
        return $this->makeStringSecure($this->generate());
    }

    public function makeStringSecure(string $string): string
    {
        return str_replace(
            ['a', 'e', 'i', 'o'],
            ['4', '3', '1', '0'],
            $string
        );
    }
}
```

And here's an updated test, modified to pass in blank word lists. We could write some more tests for how it pulls words from the lists, but for now, this is updated to not error.

```php
class PasswordGeneratorTest extends TestCase
{
    /** @test */
    public function it_converts_some_vowels_to_numbers()
    {
        $generator = new PasswordGenerator(adjectives: [], nouns: []);

        $this->assertEquals(
            'fly1ng-g04t-3l0p1ng-l1z4rd',
            $generator->makeStringSecure('flying-goat-eloping-lizard')
        );
    }
}
```

### Why do I write this way

When I program, I aim to write flexible, comprehensible, changeable, and deletable code. We can't predict the future, but we can write code that is *easy to change* in the future, so I opt for simple, clear, concise code.

In my way of thinking, you can always add tools or structures later, but it's much harder to remove them later. I adhere very strongly to YAGNI ("you aren't gonna need it") ideals, and if you're curious to learn more about my thoughts here, check out my Laracon Online talk [Abstracting Too Early](https://www.youtube.com/watch?v=f4QShF42c6E&t=13999s).

I build interfaces when I see a concrete, tangible need for them. I build abstractions when I see a pain point that's best solved by that abstraction and no earlier. I've found this to be 

### Steve's code review

I absolutely love Matts's idea of the 'generateSecure' simply being a decorator - and this, for my implementation, would make a great focal point on a refactor.

String replace for me, while it is more straightforward - if I run any code styling could lose the purpose of the simplification. When they are aligned above each other, it makes sense and is easy to read. However, as this list grows, it takes more work to manage. As I said - code-style formatters could easily destroy this ease of reading, whereas this is not likely to happen on a match statement.

Passing in an array into the constructor for the password generator to control the adjectives and nouns offers flexibility that my solution definitely does not have. You have to work harder to achieve what I did, but for a relatively simple piece of functionality like this - it is possibly time spent on over-engineering where an array would have sufficed.

The benefits of this more straightforward approach become clear as you look at the `generate` method on the password generator. As the list grows, this will undoubtedly be simpler and easier to manage with less memory usage. It does lose a little in context should you extend, but that is a small price to pay for the extension.

Overall, Matt made evident improvements to my approach that aim at simplicity over extension - which is the desired approach for a feature like this.

## Conclusion
Thanks so much for checking this out! We hope seeing two programmers approach the same problem with different priorities and mindsets *, but respect for each other* can lead to a super enjoyable conversation where we all learn!
