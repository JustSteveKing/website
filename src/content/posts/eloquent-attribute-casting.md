---
title: Eloquent Attribute Casting
pubDate: 2022-06-27
image: eloquent-attribute-casting.png
source: https://laravel-news.com/eloquent-attribute-casting
partner: Laravel News
description: Unlock the potential of Eloquent Castable attributes in Laravel with practical examples, including address formatting and business hours, to enhance your applications.
---

Eloquent Castable attributes are one of the more powerful features of Laravel; some people use them religiously while others tend to shy away from them. In this tutorial, I will walk through a few different examples of using them and, most importantly, why you should be using them.

You can create a new Laravel project or use an existing one for this tutorial. Feel free to follow along with me, or if you want to read and remember - that is fine too. The critical thing to take away from this is just how good eloquent casts can be.

Let's start with our first example, similar to the one in the Laravel documentation. The Laravel documentation shows getting a user's address but using a Model too. Now imagine if this was instead a JSON column on the user or any model for that fact. We can get and set some data and add extra to make this work as we want. We need to install a package by [Jess Archer](https://github.com/jessarcher) called [Laravel Castable Data Transfer Object](https://laravel-news.com/laravel-castable-data-transfer-object). You can install this using the following composer command:

```bash
composer require jessarcher/laravel-castable-data-transfer-object
```

Now we have this installed, let's design our Castable class:

```php
namespace App\Casts;

use JessArcher\CastableDataTransferObject\CastableDataTransferObject;

class Address implements CastableDataTransferObject
{
	public string $nameOrNumber,
	public string $streetName,
	public string $localityName,
	public string $town,
	public string $county,
	public string $postalCode,
	public string $country,
}
```

We have a PHP class that extends the `CastableDataTransferObject`, which allows us to mark the properties and their types, then handles all the getting and setting options behind the scenes. This package uses a Spatie package called [Data Transfer Object](https://laravel-news.com/data-transfer-object-v3-php-8) under the hood, which has been quite popular in the community. So now, if we wanted to extend this at all, we could:

```php
namespace App\Casts;

use JessArcher\CastableDataTransferObject\CastableDataTransferObject;

class Address implements CastableDataTransferObject
{
	public string $nameOrNumber,
	public string $streetName,
	public string $localityName,
	public string $town,
	public string $county,
	public string $postalCode,
	public string $country,
	
	public function formatString(): string
	{
		return implode(', ', [
			"$this->nameOrNumber $this->streetName",
			$this->localityName,
			$this->townName,
			$this->county,
			$this->postalCode,
			$this->country,
		]);
	}
}
```

We have an `Address` class that extends the `CastableDataTransferObject` class from the package, which handles all of our getting and setting of data to the database. We then have all the properties we want to store - this is the UK format address as it is where I live. Finally, we have a method that we have added that helps us format this address as a string - if we want to display this in any form of the user interface. We could take it a step further with postcode validation using regex or an API - but that might defeat the point of the tutorial.

Let's move on to another example: money. We all understand money; we know that we can use money in its smallest form of coins and its larger form of notes. So imagine we have an e-commerce store where we store our products (a simple store so we don't have to worry about variants, etc.), and we have a column called `price` which we store in the smallest denominator of our currency. I am in the UK, so I will call this pence. However, this in the US is cents. A common approach to storing monetary values in our database as it avoids floating-point math issues. So let's design a cast for this price column, this time using the php `moneyphp/money` package:

```php
namespace App\Casts;

use Money\Currency;
use Money\Money;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;

class Money implements CastsAttributes
{
    public function __construct(
	    protected int $amount,
	) {}
	
	public function get($model, string $key, $value, array $attributes)
	{
	    return new Money(
			$attributes[$this->amount],
			new Currency('GBP'),
		);
	}
	
	public function set($model, string $key, $value, array $attributes)
	{
		return [
			$this->amount => (int) $value->getAmount(),
			$this->curreny => (string) $value->getCurrency(),
		];
	}
}
```

So this class doesn't use the DTO package but instead returns a new instance with its own methods. In our constructor, we pass in an amount. When we get and set the amount, we are either casting to an array for storage in a database or parsing an array to return a new money object. Of course, we could make this a data transfer object instead and control how we handle money a little more. However, the php money library is pretty well tested and reliable, and if I am honest - there isn't much I would do differently.

Let's go to a new example. We have a CRM application, and we want to store business open hours or days. Each business needs to be able to mark the days they are open, but only in a simple true or false way. So we can create a new cast, but first, we will make the class that we want to cast to, much like the money PHP class above.

```php
namespace App\DataObjects;

class Open
{
    public function __construct(
	    public readonly bool $monday,
		public readonly bool $tuesday,
		public readonly bool $wednesday,
		public readonly bool $thursday,
		public readonly bool $friday,
		public readonly bool $saturday,
		public readonly bool $sunday,
		public readonly array $holidays,
	) {}
}
```

To begin with, this is fine; we just want to store if the business is open each day and have an array of days they count as holidays. Next, we can design our cast:

```php
namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;

class OpenDaysCast implements CastsAttributes
{
	public function __construct(
		public readonly array $dates,
	) {}

	public function set($model, string $key, $value, array $attributes)
	{
		return $this->dates;
	}
	
	public function get($model, string $key, $value, array $attributes)
	{
		return Open::fromArray(
			dates: $this->dates,
		);
	}
}
```

Our constructor will accept an array of dates to simplify the saving (however, you will need to make sure you validate input properly here). Then when we want to get the data back out from the database, we create a new `Open` object, passing in the dates. However, here we are calling a `fromArray` method that we have yet to create, so let's design that now:

```php
public static function fromArray(array $dates): static
{
    return new static(
	    monday: (bool) data_get($dates, 'monday'),
		tuesday: (bool) data_get($dates, 'tuesday'),
		wednesday: (bool) data_get($dates, 'wednesday'),
		thursday: (bool) data_get($dates, 'thursday'),
		friday: (bool) data_get($dates, 'friday'),
		saturday: (bool) data_get($dates, 'saturday'),
		sunday: (bool) data_get($dates, 'sunday'),
		holidays: (array) data_get($dates, 'holidays'),
	);
}
```

So we manually build up our Open object using the Laravel helper `data_get`, which is extremely handy, making sure that we are casting to the correct type. Now when we query, we have access:

```php
$business = Business:query()->find(1);

// Is this business open on mondays?
$business->open->monday; // true|false

// Is the business open on tuesdays?
$business->open->tuesday; // true|false

// What are the busines holiday dates?
$business->open->holidays; // array
```

As you can see, we can make this extremely readable so that the developer experience is logical and easy to follow. Can we then extend this to add additional methods, such as is it open today?

```php
public function today(): bool
{
    $date = now();
	
	$day = strtolower($date->englishDayOfWeek());
	
	if (! $this->$day) {
	    return false;
	}
	
	return ! in_array(
	    $date->toDateString(),
		$this->holidays,
	);
}
```

So this method may make a small assumption that we are storing holidays in a date string, but the logic follows: get the day of the week, in English, as that is our property name; if the day is false, then return false. However, we also need to check the holidays. If the current date string is not in the holiday's array, it is open; otherwise, it is closed.

So we can then check to see if the business is open using the today method on our cast:

```php
$business = Business:query()->find(1);

// Is the business open today?
$business->open->today();
```

As you can probably imagine, you can add many methods to this, allowing you to check multiple things and even add ways to display this information nicely.

Do you use Attribute casting in your application? Do you have any other cool examples you could share? Please drop us a tweet with your examples and share the power of knowledge.