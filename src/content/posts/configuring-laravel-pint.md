---
title: Configuring Laravel Pint
pubDate: 2023-01-12
image: configuring-laravel-pint.png
source: https://laravel-news.com/configuring-laravel-pint
partner: Laravel News
description: Discover how to tailor Laravel Pint, a PHP CS Fixer wrapper, to your coding standards with a personal guide on rule implementation and customization.
---

Laravel Pint is the hot new thing from the Laravel team. An excellent wrapper around PHP CS Fixer that is my go-to code standards tool.

I previously wrote about the release of [Laravel Pint](https://laravel-news.com/laravel-pint) when it was first released. By default, it will follow the `laravel` standard out of the box, a custom standard by the Laravel team.

What do we do if we want something else, though? Let's dive in a little.

If you read the documentation, it is very informative as to what you can do with Laravel Pint. You can implement many rules in a handy JSON file, but which ones work well, and what should you do?

I am going to walk you through my personal Laravel Pint configuration and explain what and why I choose these settings.

### Align Multiline Comments

This rule `align_multiline_comment` will allow you to fix any comments that I call "borked". They have all gone out of alignment and look weird. It is not a significant thing in terms of your code, but it is an annoyance when reading through it as your eyes will be drawn to it instead of what you want to focus on.

### Array Indentation

The rule `array_indentation` will allow you to fix any arrays you are creating that has, again, become "borked" for some reason. Another code cleaning rule that will tidy up where spaces may be used in the wrong place etc. etc.

### Array Syntax

The `array_syntax` rule is one that you may not need, depending on the age of your code. This rule will change the old `array()` syntax to the new `[]` syntax. I keep this in case I have old code or am working with multiple developers who may fall into old habits.

### Blank Line After Namespace

The `blank_line_after_namespace` rule is a housekeeping rule that I use to ensure that there is always a blank line under the namespace declaration on any class.

### Blank Line After Opening Tag

The `blank_line_after_opening_tag` rule is similar to the previous rule but enforces a blank line after the opening PHP tag. I like to keep my code organized and uniform - these rules enable this.

### Combine Consecutive Issets

The `combine_consecutive_issets` rule is one that taught me that I could use more than one argument in an isset check -which was something new to me. This will convert any code that combines one or more isset checks into one clean check.

```php
// before
if (isset($a) && isset($b))

// after
if (isset($a, $b))
```

### Combine Consecutive Unsets

The `combine_consecutive_unsets` rule is like the above rule, something I wasn't aware I could do - and forces me to use better code.

```php
// before
unset($a);
unset($b);

// after
unset($a, $b);
```

### Concat Space

The `concat_space` rule is one of my favorites. It forces spaces between any string concatenation - which is one of the things I hate not seeing. I like my code to have room, not be all squashed up like space will slow it down.

```php
// before
$name = $request->get('name');
$message = 'Hello '.$name;

// after
$message = 'Hello ' . $name;
```

### Declare Parentheses

The `declare_parentheses` rule is almost the opposite of the above rule. Anywhere I use a `declare` statement, I want to ensure there aren't unnecessary spaces around it.

```php
// before
declare( strict_type = 1 );

// after
declare(strict_types=1);
```

### Declare Strict Types

The `declare_strict_types` rule is a must-have for me. With the amount of type usage I use in my code, I also like to ensure that strict typing is enabled. This is a handy rule to force this in your code base without remembering to add it every time. Great for Laravel, as you don't need to modify your stubs to add them!

```php
declare(strict_types=1);
```

### Explicit String Variable

The `explicit_string_variable` rule is one that I love to add as it makes my code that much easier to read. Anywhere you are using implicit variables in your code, it will make them explicit like the following:

```php
$name = 'Steve';

$implicit = "Hello, $name";
$explicit = "Hello {$name}";
```

### Final Class

The `final_class` rule is one I will haunt Michael Dyrynda about. It forces **all** your classes to be final in your application. Use caution, though, as it will make every class final, which can lead to breakages if using pest or extending the base Controller in Laravel. Luckily for me - I don't worry about this so much as I don't use a lot of inheritance.

### Final Internal Class

The `final_internal_class` rule is a way you can combat the above rule. If you do not want a class to be final because you plan to extend it - make sure that this rule is set to `false` in your configuration. This will tell the final rule to ignore this one and that internal classes should **not** be final.

```php
{
  "final_internal_class": false
}
```

### Fully Qualified Strict Types

The `fully_qualified_strict_types` rule will force you to import the class as a use statement in your code instead of declaring the fully qualified class name as a type in methods etc. This keeps code clean, and clean code is happy code.

```php
// before
public function __invoke(\Illuminate\Http\Request $request)

// after
public function __invoke(Request $request)
```

There are many more rules that I use, so instead of boring you with **every single one** I will share my configuration, also have a look at the [PHP CS configuration website](https://mlocati.github.io/php-cs-fixer-configurator/#version:3.13) so that you can see what rules are and what they do.

[Here is my current configuration](https://gist.github.com/JustSteveKing/81a39cc793e1f54d036c4ba8b7d96a0e), but bear in mind I tweak this often as I feel code standards should be a living thing. It should be something that you constantly re-evaluate and see if it still meets your needs.
