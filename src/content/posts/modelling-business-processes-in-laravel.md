---
title: Modelling Business Processes in Laravel
pubDate: 2023-03-24
image: modelling-business-processes-in-laravel.png
source: https://laravel-news.com/modelling-busines-processes-in-laravel
partner: Laravel News
description: Simplify complex business processes in Laravel using pipelines for clean and elegant code.
---

As developers, we often map business processes to digital processes, from sending an email to something quite complex. Let's look at how to take a more complicated process and write clean and elegant code.

It all starts with a workflow. I tweeted about writing this tutorial to see if there would be any feedback on business processes people would find helpful - I only really got one response, though.

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Next tutorial decided! Mapping Business Process in Laravel 👀<br><br>Keep your eye on <a href="https://twitter.com/laravelnews?ref_src=twsrc%5Etfw">@laravelnews</a> for this one 🔥🔥<br><br>If you have an example business process you&#39;d like to see mapped, drop a comment!<a href="https://twitter.com/hashtag/php?src=hash&amp;ref_src=twsrc%5Etfw">#php</a> <a href="https://twitter.com/hashtag/phpc?src=hash&amp;ref_src=twsrc%5Etfw">#phpc</a> <a href="https://twitter.com/hashtag/laravel?src=hash&amp;ref_src=twsrc%5Etfw">#laravel</a></p>&mdash; JustSteveKing (@JustSteveKing) <a href="https://twitter.com/JustSteveKing/status/1638654223536496640?ref_src=twsrc%5Etfw">March 22, 2023</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

So with that in mind, let's look at the Order/Shipping process, something with enough moving parts to get the idea across - but I won't go into too much detail from a domain logic perspective.

Imagine you run an online merch store, have an online shop, and use a dropshipping service to send merch out on demand when an order is placed. We need to think about what the business process might look like without any digital help - this allows us to understand the business and its needs.

An item is requested (we are using a print-on-demand service, so stock isn't an issue).
We take the customers' details.
We create an order for this new customer.
We accept payment for this order.
We confirm the order and payment to the customer.
We then place our order with the print-on-demand service.

The print-on-demand service will periodically update us on the order status, which we can update our customers, but this would be a different business process. Let's look at the order process first and imagine this was all done inline in one controller. It would get quite complicated to manage or change.

```php
class PlaceOrderController
{
    public function __invoke(PlaceOrderRequest $request): RedirectResponse
    {
        // Create our customer record.
        $customer = Customer::query()->create([]);

        // Create an order for our customer.
        $order = $customer->orders()->create([]);

        try {
            // Use a payment library to take payment.
            $payment = Stripe::charge($customer)->for($order);
        } catch (Throwable $exception) {
            // Handle the exception to let the customer know payment failed.
        }

        // Confirm the order and payment with the customer.
        Mail::to($customer->email)->send(new OrderProcessed($customer, $order, $payment));

        // Send the order to the Print-On-Demand service
        MerchStore::create($order)->for($customer);

        Session::put('status', 'Your order has been placed.');

        return redirect()->back();
    }
}
```

So if we walk through this code, we see that we create a user and order - then accept the payment and send an email. Finally, we add a status message to the session and redirect the customer.

So we write to the database twice, talk to the payment API, send an email, and finally, write to the session and redirect. It is quite a lot in one synchronous thread to handle, with a lot of potential for things to break. The logical step here is to move this to a background job so that we have a level of fault tolerance.

```php
class PlaceOrderController
{
    public function __invoke(PlaceOrderRequest $request): RedirectResponse
    {
        // Create our customer record.
        $customer = Customer::query()->create([]);

        dispatch(new PlaceOrder($customer, $request));

        Session::put('status', 'Your order is being processed.');

        return redirect()->back();
    }
}
```

We have cleaned up our controller a lot - however, all we have done is move the problem to a background process. While moving this to a background process is the right way to handle this, we need to approach this a lot differently.

Firstly, we want to first or create the customer - in case they have made an order before.

```php
class PlaceOrderController
{
    public function __invoke(PlaceOrderRequest $request): RedirectResponse
    {
        // Create our customer record.
        $customer = Customer::query()->firstOrCreate([], []);

        dispatch(new PlaceOrder($customer, $request));

        Session::put('status', 'Your order is being processed.');

        return redirect()->back();
    }
}
```

Our next step is to move the creation of a customer to a shared class - this is one of many times we would want to create or get a customer record.

```php
class PlaceOrderController
{
    public function __construct(
        private readonly FirstOrCreateCustomer $action,
    ) {}

    public function __invoke(PlaceOrderRequest $request): RedirectResponse
    {
        // Create our customer record.
        $customer = $this->action->handle([]);

        dispatch(new PlaceOrder($customer, $request));

        Session::put('status', 'Your order is being processed.');

        return redirect()->back();
    }
}
```

Let's look at the background process code if we moved it directly there.

```php
class PlaceOrder implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function _construct(
        public readonly Customer $customer,
        public readonly Request $request,
    ) {}

    public function handle(): void
    {
        // Create an order for our customer.
        $order = $this->customer->orders()->create([]);

        try {
            // Use a payment library to take payment.
            $payment = Stripe::charge($this->customer)->for($order);
        } catch (Throwable $exception) {
            // Handle the exception to let the customer know payment failed.
        }

        // Confirm the order and payment with the customer.
        Mail::to($this->customer->email)
            ->send(new OrderProcessed($this->customer, $order, $payment));

        // Send the order to the Print-On-Demand service
        MerchStore::create($order)->for($this->customer);
    }
}
```

Not too bad, but - what if a step fails and we retry the job? We will end up redoing parts of this process again and again when not needed. We should first look to create the order within a database transaction.

```php
class CreateOrderForCustomer
{
    public function handle(Customer $customer, data $payload): Model
    {
        return DB::transaction(
            callback: static fn () => $customer->orders()->create(
                attributes: $payload,
            ),
        );
    }
}
```

Now we can update our background process to implement this new command.

```php
class PlaceOrder implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function _construct(
        public readonly Customer $customer,
        public readonly Request $request,
    ) {}

    public function handle(CreateOrderForCustomer $command): void
    {
        // Create an order for our customer.
        $order = $command->handle(
            customer: $customer,
            payload: $this->request->only([]),
        );

        try {
            // Use a payment library to take payment.
            $payment = Stripe::charge($this->customer)->for($order);
        } catch (Throwable $exception) {
            // Handle the exception to let the customer know payment failed.
        }

        // Confirm the order and payment with the customer.
        Mail::to($this->customer->email)
            ->send(new OrderProcessed($this->customer, $order, $payment));

        // Send the order to the Print-On-Demand service
        MerchStore::create($order)->for($this->customer);
    }
}
```

This approach works well. However, it isn't ideal, and you do not have much visibility at any point. We could model this differently so that we are modeling our business process instead of splitting it out into parts.

It all starts with the Pipeline facade, enabling us to build this process correctly. We will still want to create our customer in the controller, but we will handle the rest of the process within the background job using a business process.

To begin with, we will need an abstract class that our business process classes can extend to minimize code duplication.

```php
abstract class AbstractProcess
{
    public array $tasks;

    public function handle(object $payload): mixed
    {
        return Pipeline::send(
            passable: $payload,
        )->through(
            pipes: $this->tasks,
        )->thenReturn();
    }
}
```

Our business process class will have many associated tasks, which we declare in the implementation. Then our abstract process will take the passed-on payload and send it through these tasks - eventually returning. Unfortunately, I can't think of a nice way to return an actual type instead of mixed, but sometimes we have to compromise...

```php
class PlaceNewOrderForCustomer extends AbstractProcess
{
    public array $tasks = [
        CreateNewOrderRecord::class,
        ChargeCustomerForOrder::class,
        SendConfirmationEmail::class,
        SendOrderToStore::class,
    ];
}
```

As you can see, this is super clean to look at and works well. These tasks can be reused in other business processes where it makes sense.

```php
class PlaceOrder implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function _construct(
        public readonly Customer $customer,
        public readonly Request $request,
    ) {}

    public function handle(PlaceNewOrderForCustomer $process): void
    {
        try {
            $process->handle(
                payload: new NewOrderForCustomer(
                    customer: $this->customer->getKey(),
                    orderPayload: $this->request->only([]),
                ),
            );
        } catch (Throwable $exception) {
            // Handle the potential exceptions that could occur.
        }
    }
}
```

Our background process now tries to handle the business process, and if any exceptions happen, we can fail and retry the process later on. As Laravel will use its DI container to pass through what you need into the jobs `handle` method, we can pass our process class into this method and let Laravel resolve this for us.

```php
class CreateNewOrderRecord
{
    public function __invoke(object $payload, Closure $next): mixed
    {
        $payload->order = DB::transaction(
            callable: static fn () => Order::query()->create(
                attributes: [
                    $payload->orderPayload,
                    'customer_id' $payload->customer,
                ],
            ),
        );

        return $next($payload);
    }
}
```

Our business process tasks are invokable classes that get passed the "traveller", which is the payload we want to pass through, and a Closure which is the next task in the pipeline. This is similar to how the middleware functionality works in Laravel, where we can chain on as many as we need, and they are just sequentially called.

The payload we pass in can be a simple PHP object we can use to build as it goes through a pipeline, extending it at each step, allowing the next task in the pipeline to access any information it needs without running a database query.

Using this approach, we can break down our business processes that aren't digital and make digital representations of them. Chaining them together in this way adds automation where we need it. It is quite a simple approach, really, but it is very powerful.

Have you found a nice way to handle business processes in Laravel? What did you do? Let us know on twitter!
