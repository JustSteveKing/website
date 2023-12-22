---
title: Laravel Pint
pubDate: 2022-06-22
image: laravel-pint.png
source: https://laravel-news.com/laravel-pint
partner: Laravel News
description: Laravel Pint; CLI Tool for PHP Code Styling. Zero dependencies, PSR-12 compliance, effortless operation.
---

The long-awaited hype train is finally over, Laravels latest open source CLI app has been released to the world, and we got our hands on it to tell you all about it. Introducing [Laravel Pint](https://github.com/laravel/pint) ...

From the readme, "Laravel pint is a zero-dependency PHP code style fixer for minimalists - built on top of PHP-CS-Fixer."

As soon as I read this, I got excited, and I mean very excited. In modern PHP, we have been going through a phase of honing our craft, making our code stricter and better tested, and ensuring we have a consistent code style. This all began back when PHP-FIG was formed, and they started to release PSRs, and it been going from strength to strength with frameworks having their own specific published style rules. This package is no different and will automatically test and fix your code style based on a preset.

To get started with this package, install it using composer:

```bash
composer require laravel/pint --dev
```

Once installed, it will just run with no configuration required. So you can run:

```bash
./vendor/bin/pint
```

With no configuration, no setup, or thought or effort - my project is instantly assessed for PSR-12 styling and automatically fixed. Magical. Keeping your code clean and consistent sometimes takes effort or thought on how to get this setup - which rules you need to implement. Or with PHP CS Fixer, you had to create a config file, then go through and create a finder to add rules to a PHP file in an array. Things got messy quickly, right?

No more. If you create a pint.json file in the root of your project, it will simply load this and read the configuration - otherwise, stick to its defaults. The configuration is all done using JSON, making it much easier to use and more readable.

Let's take a quick look at setting up a new pint config using a preset. But let's have a look at doing it with a fresh new Laravel project, so create a new project:

```bash
laravel new pint-demo
```

Open this new project in your terminal and install pint:

```bash
composer require laravel/pint --dev
```

With our brand new Laravel application, let's configure a preset to Laravel. Create a pint.json file and add:

```json
{
	"preset": "laravel"
}
```

Now run pint:

```bash
./vendor/bin/pint
```

You should see an output similar to the below:

![](statamic://asset::media::images/laravel-pint-first-run.png)

We have lift off 🚀

So let's now change our preset to PSR-12 and check the output:

```json
{
	"preset": "psr12"
}
```

Rerun pint and let's see the output:

```bash
./vendor/bin/pint
```

You should see the following output:

![](statamic://asset::media::images/laravel-pint-psr12.png)

Let's inspect this a little. It has implemented rules like `single_trait_insert_per_statement` and `braces` and `new_with_braces`. What if we want to customize these a little? Well, we can turn rules on and off really easily. Let's turn off braces in our pint.json file:

```json
{
	"preset": "psr12",
  	"rules": {
    	"braces": false
    }
}
```

That is it! It is simple to customize how you want to set up your code styles. No more messy PHP and arrays to configure your coding style. So let us rerun pint, but this time we want to do a dry run to see what will be changed:

```bash
./vendor/bin/pint —test
```

![](statamic://asset::media::images/laravel-pint-test.png)

Awesome right? Nice clean output, doing a dry run, seeing what will fail and why! So what happens if we want a little more information? I have fixed the files above and gone back to the user migration - and undone those changes so we can test it out. Let's do a dry run again, but this time we want to ask for verbose output using the `-v` flag:

![](statamic://asset::media::images/laravel-pint-verbose-test.png)

We get excellent output, much like when using GitHub, of the changes that would be made. So we can see the code style issue, what it is being caught on, and what changes would happen if we fixed it - all from using one pretty simple command.

I don't know about you, but this is a must-install for all of my upcoming projects, packages, and anything else I work on.