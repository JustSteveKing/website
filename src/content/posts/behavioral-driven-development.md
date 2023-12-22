---
title: Behavioural Driven Development in Laravel
pubDate: 2022-09-06
image: behavioral-driven-development.png
source: https://laravel-news.com/behavioral-driven-development
partner: Laravel News
description: Discover how Laravel can embrace BDD with the 'Given When Then' approach, uniting teams and creating a ubiquitous testing language without new syntax.
---

BDD, or Behavioural Driven Development, is a popular testing approach in many organizations and has a proven track record for uniting testing efforts across teams. But the question remains, how can we achieve this in Laravel without having to learn a new framework for testing or new language syntax such as [Gherkin](https://cucumber.io/docs/gherkin/).

As a business being able to define processes in an easy-to-read way and for that to be represented in our test suites is a huge benefit. Much like Domain Driven Design allows us to create a ubiquitous language for our code, BDD will enable us to have a ubiquitous language for our testing.

Let's walk through some examples of what a BDD test might look like, and then let us break this down. Let us imagine that we have a web application that has a registration form. When this form is completed, we expect that the user will be registered, and they should be automatically logged in. Let us look at this in a typical feature test:

```php
it('allows a user to register for an account', function (string $email) {
	expect(
		User::query()->count(),
	)->toEqual(0);

	post(
		route('register'),
		['name' => 'test', 'email' => $email, 'password' => 'password']
	)->assertRedirect(route('dashboard'));

	expect(
		User::query()->count(),
	)->toEqual(1);
})->with('emails');
```

This is a simple example of what you could do with pestPHP to test this endpoint, which replicates a form submission. As you can see, as a developer, this is relatively easy to understand if you are used to testing with pest. However, your QA Engineer will struggle with this as they are not used to pestPHP, and it doesn't have a syntax they understand.

How could we refactor this to use BDD and a syntax our QA Engineer and the wider team may understand? Luckily, a pestPHP plugin will allow us to use a "Given When Then" approach, which is typical in the BDD world. This is the [Give when then plugin](https://laravel-news.com/pest-given-when-then) and is straightforward to get started with. Run the following composer command to install this plugin:

```bash
composer require milroyfraser/pest-plugin-gwt --dev
```

From here, we can start writing specific tests for BDD. One thing we want to bear in mind at this point is, do we want to replace our tests, or do we want BDD to enhance our current test suite? I would look to improve my existing test suite to avoid losing valuable tests.

Let us take an example I recently encountered. I was not using any specific Auth package for my Laravel application. Instead, I needed to create a custom authentication flow - using a one-time password. My register form is a Livewire component that handles the logic for me. So let us first write the feature test to ensure our component works.

```php
it('will submit the form and create a new user', function (string $email) {
	Livewire::test(
		RegisterForm::class,
	)->set(
		'name', 'test',
	)->set(
		'email', $email,
	)->set(
		'password', 'password',
	)->call(
		'submit'
	)->assertHasNoErrors(
		['name', 'email', 'password']
	);
})->with('emails');
```

We are testing that we can fill in and submit the form. We could add our expectations around this to ensure that the user is created in the database, but we can simplify our feature test here and move some of this logic to an Integration test.

In our case, like most of my code, I perform the logic in Action classes, so moving this makes a lot of sense. I typically have single action classes for all read and write operations I need to perform so that CLI, Web, and API can use all similar logic - the only difference is how it is called. In the above example, our Livewire component would call the action to create the user.

So now, let us look at what the business process would look like in a Gherkin syntax:

```gherkin
Scenario: The Register Action is handled
	Given the RegisterAction is created
	When the handle method is called
	Then a new user will be created
```

Admittedly we could write this in a standard test, and it would make sense to us as developers - but one of the principles of DDD I love is the ubiquitous language you create - almost like a business language.

For our BDD tests, I will create an `Integration` directory under `test`, so that I have:
Unit: Test-Driven Development
Feature: Test-Driven Development
Integration: Behavioral Driven Development 

Inside our `Integrations` directory, we will store all of our scenarios created as [pestPHP](https://pestphp.com/) tests using the plugin we installed.

```php
scenario('The RegisterAction is handled')
	->given(fn () => new RegisterAction())
	->when(fn (RegisterAction $action) => $action->handle(
		name: 'test',
		email: 'pest@test.com',
		password: 'password',
	))->then(fn () => assertDatabaseHas('users', [
		'name' => 'test',
		'email' => 'pest@test.com',
	]));
```

As you can see from the above code, it is effortless to understand. It has great similarities to what we might expect in most BDD test suites - but in a framework, we are used to. We can usually directly translate this to a user story in many cases.

Let us take one more example, but this time we will start from a user story:

> As a User, when I activate my account, I must receive an email.

Now let us move this to Gherkin syntax:

```gherkin
Scenario: A user can activate their account
	Given a new user
	When they activate their account
	Then an email is sent to confirm the activation.
```

Finally, let us move on to pestPHP with the plugin we are testing:

```php
scenario('A user can activate their account')
	->given(fn (): User => User::factory()->inactive()->create())
	->when(fn () => Bus::fake())
	->when(fn (User $user): User => $user->activate())
	->then(function (User $user) {
		Bus::assertDispatched(ActivateUser::class);
	});
```

So you can see that this way of testing has advantages for your test suite and your team. I am not saying you should _always_ use this approach - but for those critical business processes, it allows you to map the process from a language the business understands to a test suite you understand directly.

Have you found any other exciting ways to improve your testing strategy in your applications? Let us know your thoughts on Twitter!