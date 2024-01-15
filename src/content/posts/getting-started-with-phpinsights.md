---
title: Getting started with PHPInsights
pubDate: 2023-02-16
image: getting-started-with-phpinsights.png
source: https://laravel-news.com/getting-started-with-phpinsights
partner: Laravel News
description: Use PHPInsights to enhance PHP code in Laravel and others - A guide to optimal code style and architecture.
---

PHPInsights is a composer package created by Nuno Maduro and is a fantastic tool to get started with analyzing the code quality of your PHP applications.

Whether you are a pro at code quality tools or a complete newbie - PHPInsights has a steady learning curve that you can quickly adapt to as your knowledge improves. Out of the box, it works with Laravel, Symfony, Yii, WordPress, Magento 2, and more.

It allows you to gain insights into the quality of your code, your coding style, your application architecture, and the complexity of your code.

To get started with this package, all you need to do is run a quick composer command:

```bash
composer require nunomaduro/phpinsights --dev
```

You are then set to go, as out of the box, it requires no configuration. You can analyze specific directories using the command line by running:

```bash
./vendor/bin/phpinsights
```

This will run through a series of default. "sniffs" to check a few basic things for you. You will get an output that looks like the below:

```markdown


                89.7%                  87.5%                  94.1%                  90.4%


                Code                 Complexity            Architecture              Style


Score scale: ◼ 1-49 ◼ 50-79 ◼ 80-100

[CODE] 89.7 pts within 367 lines

Comments ...................................................... 64.6 %
Classes ....................................................... 12.3 %
Functions ...................................................... 1.1 %
Globally ...................................................... 22.1 %

[COMPLEXITY] 87.5 pts with average of 1.38 cyclomatic complexity

[ARCHITECTURE] 94.1 pts within 28 files

Classes ....................................................... 75.0 %
Interfaces ..................................................... 0.0 %
Globally ...................................................... 25.0 %
Traits ......................................................... 0.0 %

[MISC] 90.4 pts on coding style and 0 security issues encountered
```

From here, you can press enter to see the code issues that may be reported, then enter again to see architectural issues reported, and finally, enter again to see code style issues.

Next, we can look into how we might improve our code based on the "sniffs" run. This can be done by configuring the PHPInsights configuration, customizing what is run, and a few other options. To get started, create a `phpinsights.php` in the root of your project, then we can begin customizing what we want to run.

```php
declare(strict_types=1);

return [
    'preset' => 'default',
];
```

We have various options for the preset, depending on the framework/platform you are using. To show how this works, I will gradually build up my configuration file as I explain each part - so you can see the journey you might go through.

You can use `laravel`, `symfony`, `magento2`, `drupal`, or `default` for your preset - I will use Laravel.

```php
declare(strict_types=1);

return [
    'preset' => 'laravel',
];
```

You may want to exclude directories within your application that you do not want to be "sniffed" or analyzed. You can add these by adding an `exclude` configuration option.

```php
declare(strict_types=1);

return [
    'preset' => 'laravel',
    'exclude' => [
        'database/*',
    ],
];
```

You can configure specific insights within your configuration file, which allows you to set the options for things such as Line Length.

```php
declare(strict_types=1);

use PHP_CodeSniffer\Standards\Generic\Sniffs\Files\LineLengthSniff;

return [
    'preset' => 'laravel',
    'exclude' => [
        'database/*',
    ],
    'config' => [
        LineLengthSniff::class => [
            'lineLimit' => 120,
            'absoluteLineLimit' => 160,
        ],
    ],
];
```

If we rerun PHPInsights now, we will run it with our configuration, which will be more specific to our configured specifications.

Your analysis will be split into critical areas for you to focus on, starting with your code. Analyzing the structure and quality of your code, this is extremely [well documented](https://phpinsights.com/insights/code.html#forbidden-public-property) on the PHPInsights website showing you the sniffs and insights that are available should you want to disable or configure any of the insight classes that are ran against your code.

Next up will be the Architecture of your application, which is less in-depth than something like [Deptrac](https://qossmic.github.io/deptrac/) but covers a few specific areas to ensure consistency and standards more than architectural rules.

We then move on to the Complexity of your code, which is a smaller insight. This calculates your "cyclomatic complexity", where the lower the score, the easier your code is to understand. Code can be complicated in terms of functionality while still being easy to understand.

Finally, it checks the Style of your code, which is a little like [Easy Coding Standards](https://github.com/easy-coding-standard/easy-coding-standard) or [PSR-2](https://www.php-fig.org/psr/psr-2/) or [PSR-12](https://www.php-fig.org/psr/psr-12/). Again, the [documentation on this insight](https://phpinsights.com/insights/style.html#function-closing-brace) is extensive, with examples of how you can configure specific insights to get your code exactly how you want it.

Unlike my [tutorial on Laravel Pint](https://laravel-news.com/configuring-laravel-pint), I don't have a default configuration for PHPInsights, as each time I use it - I need to configure it specifically for the project or team. I recently took over from Nuno as a maintainer on this project alongside [Chris](https://twitter.com/cmgmyr), and we have been having many conversations about how to improve this package moving forward and what the future of the package will be. There are some very exciting conversations, and we hope to have more to talk about this year.
