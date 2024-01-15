---
title: Laravel CI with GitHub Actions
pubDate: 2023-02-23
image: laravel-ci-with-github-actions.png
source: https://laravel-news.com/laravel-ci-with-github-action
partner: Laravel News
description: Automate Laravel CI with GitHub Actions - Learn testing, PHPStan static analysis setup in this tutorial.
---

GitHub Actions is a fantastic way to run your Continuous Integration workflows, from running your tests to checking static analysis and more.

In your Laravel applications, it is crucial to run workflow processes to ensure your code is of a certain standard. Before we had a CI pipeline, we used to run all of these workflows locally - which caused issues when others forgot to run them.

In this tutorial, I will walk through getting your GitHub Actions set up for your Laravel applications so that you can happily sit back and ensure your code is ready to go live.

The beginning of this process is to add a directory in the root of your project, `.github/workflows`. Here, we add our workflow files so that GitHub can pick up each and run it separately. From this point, you can design your workflow processes how you need them, from separate workflows for each part - to combining them all into one workflow.

I will start with the test workflow, as this is the most likely one to start with. Even if you implement this one workflow, you have taken a step in the right direction.

I will not do a complete walk-through on how you should build GitHub Actions, as this is quite a complicated topic that is very specific to how you would like to implement them. The workflow will be built up step by step, allowing us to understand how this works.

```yaml
name: Run tests

on: [push]
```

The begin with, we need to give the workflow a name, something that GitHub will use to display what is happening. Then we add an `on` entry, telling GitHub what events this workflow should be running on. You can add more than one here, and there is a wide range of events that you can use.

Our next step is to define the jobs that we want to be able to run. Each workflow can have multiple jobs within it. However, typically I stick to one job per workflow to keep it simple.

```yaml
name: Run tests

on: [push]

jobs:
  tests:
    name: Run tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
          extensions: dom, curl, libxml, mbstring, zip, pcntl, pdo, sqlite, pdo_sqlite, bcmath, soap, intl, gd, exif, iconv
          coverage: none

      - name: Run composer install
        run: composer install -n --prefer-dist

      - name: Prepare Laravel Application
        run: |
          cp .env.ci .env
          php artisan key:generate

      - name: Run tests
        run: php artisan test
```

Our job has a name for GitHub to use as a label when displaying what is happening. We need to define what this job will run on. Here I am using `ubuntu-latest` as this is typically my target deployment. There are many options here, targeting specific versions of the OS and even different operating systems available. Our job then has multiple steps that the job needs to take to run, from checking out the code to executing what needs to be done.

Most jobs will start with the checkout action, an official action from the team at GitHub. I am using version 3 here because it supports the latest node version for any JavaScript within my project. If you need a specific node version, look at each version's release notes to make sure you match your requirements.

Next, we use the `shivammathur/setup-php@v2` action, which we use to set up our PHP environment. Passing in our PHP version and any PHP extensions required to be installed.

We then install our PHP dependencies so that we can ensure our installation is smooth when it comes to a deployment later on. With each step, you can run either a packaged action or a CLI command that can be run. Then we set up our Laravel application, running any artisan commands or anything else we may need to do. In my project, I am using an SQLite database run in memory for my test database. If you are using something different, there are quite a few available options that are well-documented. All I am doing in mine is copying a specified `.env.ci` file to the `.env` file the application will use. Then we can generate the application's encryption key using an artisan command.

Our final step is to run our test suite, which I use the artisan test command. You can call the test binary yourself or use the artisan command. You can also add any additional options to this command that you may need to debug potential test failures within CI.

Now that our initial workflow is running, we can look at another one. This time we will use one of my favorite workflows to run, Static Analysis. As many people may already know, I am an outspoken developer who always waves the static analysis flag.

For this next part, I will not go through all the steps again. Instead, we will focus on the final part.

```yaml
name: Static Analysis

on: [push]

jobs:
  phpstan:
    name: phpstan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
          coverage: none

      - name: Install composer dependencies
        run: composer install -n --prefer-dist

      - name: Run Static Analysis
        run: ./vendor/bin/phpstan --error-format=github
```

As we do not need the application to run, we don't need to worry about all the PHP dependencies this time. Our final step is to run the static analysis itself. Personally, I use PHPStan for my static analysis of choice. However, this will work with any of the static analysis libraries available. I pass the flag of `error-format` so that any potential errors are in a format that GitHub can understand and are designed for a CI environment.

You can take this further, such as running Laravel Pint or more. However, as an introduction, I think this covers what you will need.
