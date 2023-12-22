---
title: Composition over inheritance in final classes
pubDate: 2022-11-10
image: composition-over-inheritance-in-final-classes.png
source: https://laravel-news.com/composition-over-inheritance-in-final-classes
partner: Laravel News
description: Explore the use of final classes in PHP packages like 'moneyphp/money' and learn how to integrate them using composition over inheritance in your application code.
---

Final classes, you either love them or hate them. People have been using them more recently in their open-source packages, but what does that mean for you? How do you handle this in application code?

Developers have been discussing composition over inheritance for years, and final classes are a perfect use case. A recent example I was talking to someone about was 'moneyphp/money', which implemented final classes. Let's dive in.

Let's take the example of 'moneyphp/money' and look at how we might integrate with it. Before final classes, we would extend the `Money` class and use it as I need to. However, that is not possible anymore, so we want to find a way to work with it. We will create a class called `MoneyImplementation` which will be the class we want to use.

```php
class MoneyImplementation
{
    private Money $money;

    public function __construct(
        int|string $amount,
        Currency $currency,
    ) {
        $this->money = new Money(
            amount: $amount,
            currency: $currency,
        );
    }
}
```

So in the code above, we have used composition to build a class that will proxy its construction to the money class - setting a property on the class to the constructed instance. The next problem is how do we call class methods on the money class without extending the API we want to call. Without adding this, we would have to add an accessor to get the money instance from our class, and then use the accessor like the following.

```php
$money = new MoneyImplementation(
    amount: 10_000,
    currency: new Currency(
        code: 'USD',
    ),
);

$money->money()->getAmount();
```

This isn't ideal, but without any additional work, this is acceptable. But we can take it one step further using a little PHP magic. Let's add this magic method to our `MoneyImplementation` class.

```php
class MoneyImplementation
{
    private Money $money;

    public function __construct(
        int|string $amount,
        Currency $currency,
    ) {
        $this->money = new Money(
            amount: $amount,
            currency: $currency,
        );
    }

    public function __call(string $name, array $arguments)
    {
        if (! method_exists($this->money, $name)) {
            throw new RuntimeException(
                message: "Method [$name] does not exist.",
            );
        }

        return $this->money->{$name}(...$arguments);
    }
}
```

We add a method `__call` to our class so we can proxy the call straight to the money instance we have already constructed. Before that, however, we can add a safety check to ensure the method exists. Using this, we can now simplify the API.

```php
$money = new MoneyImplementation(
    amount: 10_000,
    currency: new Currency(
        code: 'USD',
    ),
);

$money->getAmount();
```

This may not be the best example to illustrate the point as we haven't added anything to our class. However, it illustrates how we can use composition over inheritance to get around final package classes.

Have you found a workaround for this? How would you handle this scenario? Let us know on Twitter.
