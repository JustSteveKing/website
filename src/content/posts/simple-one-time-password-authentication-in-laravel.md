---
title: Simple one-time password authentication in Laravel
pubDate: 2022-09-23
image: simple-one-time-password-authentication-in-laravel.png
source: https://laravel-news.com/one-time-password-authentication
partner: Laravel News
description: Learn how to implement one-time password authentication in Laravel. Secure and streamlined user authentication.
---

When dealing with Authentication in Laravel, there are several options out of the box. However, sometimes you need something more specific. This tutorial will look at how we can add a one-time password approach to our authentication flow.

To begin with, we will need to make some adjustments to our User model, as we no longer need a password to log in. We will also need to ensure that our name is nullable and force this to be updated through an onboarding process. This way, we will be able to have one entry route for authentication - the key difference is that now registered users will be redirected through the onboarding process.

Your users' migration should now look like the following: 

```php
public function up(): void
{
    Schema::create('users', function (Blueprint $table): void {
        $table->id();

        $table->string('name')->nullable();
        $table->string('email')->unique();
        $table->string('type')->default(Type::STAFF->value);

        $table->timestamps();
    });
}
```

We can reflect these changes into our model too. We no longer need a remember token as we want to enforce logging in each time. Also, users validate their email just by logging in using a one-time password.

```php
final class User extends Authenticatable
{
    use HasApiTokens;
    use HasFactory;
    use Notifiable;

    protected $fillable = [
        'name',
        'email',
        'type',
    ];

    protected $casts = [
        'type' => Type::class,
    ];

    public function offices(): HasMany
    {
        return $this->hasMany(
            related: Office::class,
            foreignKey: 'user_id',
        );
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(
            related: Booking::class,
            foreignKey: 'user_id',
        );
    }
}
```

Our model is much cleaner, so we can start looking at how we want to generate our one-time password code. To begin with, we will want to create a `GeneratorContract` that our implementation can use, and we can bind it to our container for resolving.

```php
declare(strict_types=1);

namespace Infrastructure\Auth\Generators;

interface GeneratorContract
{
    public function generate(): string;
}
```

 Now let us look at implementing a `NumberGenerator` for the one-time password, and we will go for a default of 6 characters.

```php
declare(strict_types=1);

namespace Domains\Auth\Generators;

use Domains\Auth\Exceptions\OneTimePasswordGenertionException;
use Infrastructure\Auth\Generators\GeneratorContract;
use Throwable;

final class NumberGenerator implements GeneratorContract
{
    public function generate(): string
    {
        try {
            $number = random_int(
                min: 000_000,
                max: 999_999,
            );
        } catch (Throwable $exception) {
            throw new OneTimePasswordGenertionException(
                message: 'Failed to generate a random integer',
            );
        }

        return str_pad(
            string: strval($number),
            length: 6,
            pad_string: '0',
            pad_type: STR_PAD_LEFT,
        );
    }
}
```

Finally, we want to add this to a Service Provider to bind the interface and implementation into Laravels' container - allowing us to resolve this when required. If you can't remember how to do this, I wrote a handy tutorial on Laravel News about [how I develop Laravel applications](https://laravel-news.com/how-i-develop-applications-with-laravel). This will walk you through this process quite nicely.

```php
declare(strict_types=1);

namespace Domains\Auth\Providers;

use Domains\Auth\Generators\NumberGenerator;
use Illuminate\Support\ServiceProvider;
use Infrastructure\Auth\Generators\GeneratorContract;

final class AuthServiceProvider extends ServiceProvider
{
    protected array $bindings = [
        GeneratorContract::class => NumberGenerator::class,
    ];
}
```

Now that we know that we can generate these codes, we can look at how we will implement this. To begin with, we will want to refactor the User Data Object we created in our last tutorial called [Setting up your Data Model in Laravel](https://laravel-news.com/data-model).

```php
declare(strict_types=1);

namespace Domains\Auth\DataObjects;

use Domains\Auth\Enums\Type;
use JustSteveKing\DataObjects\Contracts\DataObjectContract;

final class User implements DataObjectContract
{
    public function __construct(
        private readonly string $email,
        private readonly Type $type,
    ) {}

    public function toArray(): array
    {
        return [
            'email' => $this->email,
            'type' => $this->type,
        ];
    }
}
```

We can now focus on the action of sending a one-time password and what steps need to be taken actually to send the notification and remember the user. To start with, we need to run an action/command that will generate a code, and send this through to the user as a notification. To remember this, we will need to add this code to our applications cache alongside the device's IP address that requested this one-time password. This could cause a problem if you are using a VPN and your IP switches between asking for a code and entering the code - however a slight risk for now.

To start with, we will create a command for each step. I like to create small single classes that do each part of a process. To begin with, let us make the command to generate the code - and as usual, we will build a corresponding interface/contract to allow us to lean on the container.

```php
declare(strict_types=1);

namespace Infrastructure\Auth\Commands;

interface GenerateOneTimePasswordContract
{
    public function handle(): string;
}
```

Then the implementation we wish to use:

```php
declare(strict_types=1);

namespace Domains\Auth\Commands;

use Infrastructure\Auth\Commands\GenerateOneTimePasswordContract;
use Infrastructure\Auth\Generators\GeneratorContract;

final class GenerateOneTimePassword implements GenerateOneTimePasswordContract
{
    public function __construct(
        private readonly GeneratorContract $generator,
    ) {}
    
    public function handle(): string
    {
        return $this->generator->generate();
    }
}
```

As you can see, we are leaning on the container at any opportunity - in case we decide to change implementations of our one-time password from 6 numbers to 3 words, for example.

As before, ensure you bind this to your container in the Service Provider for this domain. Next, we want to send a notification. This time I will skip showing the interface, as you can guess what it looks like at this point.

```php
declare(strict_types=1);

namespace Domains\Auth\Commands;

use App\Notifications\Auth\OneTimePassword;
use Illuminate\Support\Facades\Notification;
use Infrastructure\Auth\Commands\SendOneTimePasswordNotificationContract;

final class SendOneTimePasswordNotification implements SendOneTimePasswordNotificationContract
{
    public function handle(string $code, string $email): void
    {
        Notification::route(
            channel: 'mail',
            route: [$email],
        )->notify(
            notification: new OneTimePassword(
                code: $code,
            ),
        );
    }
}
```

This command will accept the code and email and route a new email notification to the requester. Ensure you create the notification and return a mail message containing the code generated. Register this binding into your container, and then we can work on how we want to remember the IP address with this information.

```php
declare(strict_types=1);

namespace Domains\Auth\Commands;

use Illuminate\Support\Facades\Cache;
use Infrastructure\Auth\Commands\RememberOneTimePasswordRequestContract;

final class RememberOneTimePasswordRequest implements RememberOneTimePasswordRequestContract
{
    public function handle(string $ip, string $email, string $code): void
    {
        Cache::remember(
            key: "{$ip}-one-time-password",
            ttl: (60 * 15), // 15 minutes,
            callback: fn (): array => [
                'email' => $email,
                'code' => $code,
            ],
        );
    }
}
```

We accept the IP address, email address, and one-time code so we can store this in the cache. We set this lifetime to 15 minutes so that codes do not go stale, and a busy mail system should deliver this perfectly within this time. We use the IP address as part of the cache key to limit who can access this key on returning.

So we have three components to use when sending a one-time password, and there are a few ways in which we could achieve sending these nicely. For this tutorial, I am going to create one more command that will handle this for us - using Laravels' `tap` helper to make it fluent,

```php
declare(strict_types=1);

namespace Domains\Auth\Commands;

use Infrastructure\Auth\Commands\GenerateOneTimePasswordContract;
use Infrastructure\Auth\Commands\HandleAuthProcessContract;
use Infrastructure\Auth\Commands\RememberOneTimePasswordRequestContract;
use Infrastructure\Auth\Commands\SendOneTimePasswordNotificationContract;

final class HandleAuthProcess implements HandleAuthProcessContract
{
    public function __construct(
        private readonly GenerateOneTimePasswordContract $code,
        private readonly SendOneTimePasswordNotificationContract $notification,
        private readonly RememberOneTimePasswordRequestContract $remember,
    ) {}

    public function handle(string $ip, string $email)
    {
        tap(
            value: $this->code->handle(),
            callback: function (string $code) use ($ip, $email): void {
                $this->notification->handle(
                    code: $code,
                    email: $email
                );

                $this->remember->handle(
                    ip: $ip,
                    email: $email,
                    code: $code,
                );
            },
        );
    }
}
```

We use the tap function first to create a code that we pass through to a closure so that we can send the notification and remember the details only if the code is generated. The only problem with this approach is that it is a synchronous action, and we do not want this to happen in the main thread as it would be quite blocking. Instead, we will move this to a background job - we can do this by turning our command into something that can be dispatched onto the queue.

```php
declare(strict_types=1);

namespace Domains\Auth\Commands;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Infrastructure\Auth\Commands\GenerateOneTimePasswordContract;
use Infrastructure\Auth\Commands\HandleAuthProcessContract;
use Infrastructure\Auth\Commands\RememberOneTimePasswordRequestContract;
use Infrastructure\Auth\Commands\SendOneTimePasswordNotificationContract;

final class HandleAuthProcess implements HandleAuthProcessContract, ShouldQueue
{
    use Queueable;
    use Dispatchable;
    use SerializesModels;
    use InteractsWithQueue;

    public function __construct(
        public readonly string $ip,
        public readonly string $email,
    ) {}

    public function handle(
        GenerateOneTimePasswordContract $code,
        SendOneTimePasswordNotificationContract $notification,
        RememberOneTimePasswordRequestContract $remember,
    ): void {
        tap(
            value: $code->handle(),
            callback: function (string $oneTimeCode) use ($notification, $remember): void {
                $notification->handle(
                    code: $oneTimeCode,
                    email: $this->email
                );

                $remember->handle(
                    ip: $this->ip,
                    email: $this->email,
                    code: $oneTimeCode,
                );
            },
        );
    }
}
```

Now we can look at the front-end implementation. In this example, I will use Laravel Livewire for the front-end, but the process is similar no matter the technology you use. All we need to do is accept an email address from the user, route this through the dispatched job and redirect the user.

```php
declare(strict_types=1);

namespace App\Http\Livewire\Auth;

use Domains\Auth\Commands\HandleAuthProcess;
use Illuminate\Contracts\View\View as ViewContract;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\View;
use Livewire\Component;
use Livewire\Redirector;

final class RequestOneTimePassword extends Component
{
    public string $email;

    public function submit(): Redirector|RedirectResponse
    {
        $this->validate();

        dispatch(new HandleAuthProcess(
            ip: strval(request()->ip()),
            email: $this->email,
        ));

        return redirect()->route(
            route: 'auth:one-time-password',
        );
    }

    public function rules(): array
    {
        return [
            'email' => [
                'required',
                'email',
                'max:255',
            ],
        ];
    }

    public function render(): ViewContract
    {
        return View::make(
            view: 'livewire.auth.request-one-time-password',
        );
    }
}
```

Our component will take the email and send a notification. In reality, at this point, I would add a trait to my Livewire component to enforce strict rate limiting. This trait would look like the following:

```php
declare(strict_types=1);

namespace App\Http\Livewire\Concerns;

use App\Exceptions\TooManyRequestsException;
use Illuminate\Support\Facades\RateLimiter;

trait WithRateLimiting
{
    protected function clearRateLimiter(null|string $method = null): void
    {
        if (! $method) {
            $method = debug_backtrace()[1]['function'];
        }

        RateLimiter::clear(
            key: $this->getRateLimitKey(
                method: $method,
            ),
        );
    }

    protected function getRateLimitKey(null|string $method = null): string
    {
        if (! $method) {
            $method = debug_backtrace()[1]['function'];
        }

        return strval(static::class . '|' . $method . '|' . request()->ip());
    }

    protected function hitRateLimiter(null|string $method = null, int $decaySeonds = 60): void
    {
        if (! $method) {
            $method = debug_backtrace()[1]['function'];
        }

        RateLimiter::hit(
            key: $this->getRateLimitKey(
                method: $method,
            ),
            decaySeconds: $decaySeonds,
        );
    }

    protected function rateLimit(int $maxAttempts, int $decaySeconds = 60, null|string $method = null): void
    {
        if (! $method) {
            $method = debug_backtrace()[1]['function'];
        }

        $key = $this->getRateLimitKey(
            method: $method,
        );

        if (RateLimiter::tooManyAttempts(key: $key, maxAttempts: $maxAttempts)) {
            throw new TooManyRequestsException(
                component: static::class,
                method: $method,
                ip: strval(request()->ip()),
                secondsUntilAvailable: RateLimiter::availableIn(
                    key: $key,
                )
            );
        }

        $this->hitRateLimiter(
            method: $method,
            decaySeonds: $decaySeconds,
        );
    }
}
```

This is a handy little trait to keep if you use Livewire, and want to add rate limiting to your components.

Next, on the one-time password view, we would use an additional livewire component that will accept the one-time password code and allow us to validate it. Before we do that, though, we need to create a new command that will enable us to ensure a user exists with this email address.

```php
declare(strict_types=1);

namespace Domains\Auth\Commands;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Infrastructure\Auth\Commands\EnsureUserExistsContract;

final class EnsureUserExists implements EnsureUserExistsContract
{
    public function handle(string $email): User|Model
    {
        return User::query()
            ->firstOrCreate(
                attributes: [
                    'email' => $email,
                ],
            );
    }
}
```

This action is injected into our Livewire component, allowing us to authenticate to the app's dashboard or the onboarding step, depending on whether it is a new user. We can tell if it is a new user because it won't have a name, only an email address.

```php
declare(strict_types=1);

namespace App\Http\Livewire\Auth;

use App\Http\Livewire\Concerns\WithRateLimiting;
use Illuminate\Contracts\View\View as ViewContract;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\View;
use Infrastructure\Auth\Commands\EnsureUserExistsContract;
use Livewire\Component;
use Livewire\Redirector;

final class OneTimePasswordForm extends Component
{
    use WithRateLimiting;

    public string $email;

    public null|string $otp = null;

    public string $ip;

    public function mount(): void
    {
        $this->ip = strval(request()->ip());
    }

    public function login(EnsureUserExistsContract $command): Redirector|RedirectResponse
    {
        $this->validate();

        return $this->handleOneTimePasswordAttempt(
            command: $command,
            code: Cache::get(
                key: "{$this->ip}-one-time-password",
            ),
        );
    }

    protected function handleOneTimePasswordAttempt(
        EnsureUserExistsContract $command,
        mixed $code = null,
    ): Redirector|RedirectResponse {
        if (null === $code) {
            $this->forgetOtp();

            return new RedirectResponse(
                url: route('auth:login'),
            );
        }

        /**
         * @var array{email: string, otp: string} $code
         */
        if ($this->otp !== $code['otp']) {
            $this->forgetOtp();

            return new RedirectResponse(
                url: route('auth:login'),
            );
        }

        Auth::loginUsingId(
            id: intval($command->handle(
                  email: $this->email,
              )->getKey()),
        );

        return redirect()->route(
            route: 'app:dashboard:show',
        );
    }

    protected function forgetOtp(): void
    {
        Cache::forget(
            key: "{$this->ip}-one-time-password",
        );
    }

    public function rules(): array
    {
        return [
            'email' => [
                'required',
                'string',
                'email',
            ],
            'otp' => [
                'required',
                'string',
                'min:6',
            ]
        ];
    }

    public function render(): ViewContract
    {
        return View::make(
            view: 'livewire.auth.one-time-password-form',
        );
    }
}
```

We want to ensure that we reset the one-time password for this IP address if we have a failed attempt. Once this is done, the user is authenticated and redirected as if they logged in with a standard email address and password approach.

This isn't what I would call a perfect solution, but it is an interesting one, that is for sure. An improvement would be to email a signed URL containing some of the information instead of leaning on our cache completely.

Have you worked with a custom authentication flow before? What is your preferred method for auth in Laravel? Let us know on Twitter!