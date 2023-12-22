---
title: Reducing code duplication
pubDate: 2023-01-26
image: reducing-code-duplication.png
source: https://laravel-news.com/leaning-on-artisan
partner: Laravel News
description: Learn to reduce code duplication in Laravel using artisan commands and services for better code quality.
---

Code duplication is the most painful thing for a lot of developers, you think you have solved the problem, but there are several instances of the same issue.

In many of the codebases I have seen as a Laravel developer, the console commands always seem to be the forgotten area or the part where people need to pay more attention to the quality.

In this tutorial, I will walk through how you can approach writing code with a focus on reducing code duplication. To begin with, let's pose a hypothetical. We have a Laravel application that is an e-commerce store, and once a day, we want to generate a report on all the sales and the status of shipments. Our current approach is to log in to the administration panel and click a button to generate the report. 

This may be unrealistic, as the first instance here would be to automate it. But stick with me just a little while as we venture through this idea to improve it.

Our first step will be to create an artisan command or set of artisan commands that will generate the reports. As we start looking at reporting, it makes sense to have commands explicitly named for what we want to achieve. So let us begin with the sales figures.

```php
final class SalesFigures extends Command
{
	public $signature = 'reports:sales';

	public $description = 'Run a daily report on sales.';

	public function handle(): int
	{
		$date = now()->subDay();

		$sales = Order::query()
			->where('status', Status::COMPLETE)
			->whereBetween(
				'completed_at',
				$date->startOfDay(),
				$date->endOfDay(),
			)->latest()->get();

		// send information through to the report builder
	}
}
```

We have a simple command here that we will be able to run and get sales figures for yesterday that are marked as complete. The query itself is simple enough. It checks the status and date was yesterday, then orders them, so the latest is first - to allow us to build a chronological report.

How can we improve this, though? Are there other aspects of the application where we need to get these orders in a similar order? Let's start the refactoring process.

Firstly, this specific query is something that we need to run in a few different areas. So we can move this to its own class for us to run.

```php
final class ResultsForPeriod implements ResultsForPeriodContract
{
	public function handle(
		Builder $query,
		CarbonInterface $start,
		CarbonInterface $end,
	): Builder {
		return $builder->whereBetween(
			'completed_at',
			$start,
			$end,
		);
	}
}
```

This will allow us to get the results for a certain timespan across any models - which is more beneficial for the project.

```php
final class SalesFigures extends Command
{
	public $signature = 'reports:sales';

	public $description = 'Run a daily report on sales.';

	public function handle(ResultsForPeriodContract $query): int
	{
		$date = now()->subDay();

		$sales = $query->handle(
			query: Order::query()
				->where('status', Status::COMPLETE),
			start: $date->startOfDay(),
			end: $date->endOfDay()
		)->latest()->get();

		// send information through to the report builder
	}
}
```

We have implemented the query we built for filtering based on a timespan. Where else can we take this to make it cleaner and more efficient? Could we create a specific service to handle this reporting aspect? Is this service helpful in other areas too?

Our e-commerce dashboard will likely have some information from these reports, so some code reuse is already in place. Let's move this to a service.

```php
final class ReportService implements ReportServiceContract
{
	public function __construct(
		private readonly ResultsForPeriodContract $periodFilter,
	) {}

	public function dailySales(CarbonInterface $start, CarbonInterface $end): Collection
	{
		return $this->periodFilter->handle(
			query: Order::query()->where('status', Status::COMPLETE),
		)->latest()->get();
	}
}
```

We can now move this back into the artisan command.

```php
final class SalesFigures extends Command
{
	public $signature = 'reports:sales';

	public $description = 'Run a daily report on sales.';

	public function handle(ReportServiceContract $service): int
	{
		$date = now()->subDay();

		$sales = $service->dailySales(
			query: Order::query(),
			start: $date->startOfDay(),
			end: $date->endOfDay()
		);

		// send information through to the report builder
	}
}
```

As you can see, we have a new clean command that nicely utilizes shared code with other areas of our application.
