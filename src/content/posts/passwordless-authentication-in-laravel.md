---
title: Passwordless Authentication in Laravel
pubDate: 2023-03-21
image: passwordless-authentication-in-laravel.png
source: https://laravel-news.com/passwordless-authentication-in-laravel
partner: Laravel News
description: Learn how to implement secure passwordless authentication in Laravel using magic links for user access. Follow this tutorial for a step-by-step guide.
---

Sometimes we don't want users to have passwords. Sometimes we want to send a magic link to a user's email address and have them click to gain access. 

In this tutorial, I will walk through a process you can use to implement this yourself. The main focus of this workflow is to create a signed URL that will allow us to send a specific URL to the users' email address, and only that person should be able to access this URL.

We first want to remove the password field from our migration, model, and model factory. As this won't be needed, we want to ensure we remove it, as it is not a nullable column by default. This is a relatively simple process to achieve, so I won't show any code examples for this part. While we are at it, we can remove the password resets table, as we will not have a password to reset.

Routing should be the next thing we look at. We can create our login route as a simple view route, as we will use Livewire for this example. Let's have a look at registering this route:

```php
Route::middleware(['guest'])->group(static function (): void {
    Route::view('login', 'app.auth.login')->name('login');
});
```

We want to wrap this in the guest middleware to force a redirect if the user is already logged in. I won't go through the UI for this example, but at the end of the tutorial, there is a link to the repo on GitHub. Let's walk through the Livewire component that we will use for the login form.

```php
final class LoginForm extends Component
{
    public string $email = '';

    public string $status = '';

    public function submit(SendLoginLink $action): void
    {
        $this->validate();

        $action->handle(
            email: $this->email,
        );

        $this->status = 'An email has been sent for you to log in.';
    }

    public function rules(): array
    {
        return [
            'email' => [
                'required',
                'email',
                Rule::exists(
                    table: 'users',
                    column: 'email',
                ),
            ]
        ];
    }

    public function render(): View
    {
        return view('livewire.auth.login-form');
    }
}
```

Our component has two properties we will want to use. The email is used to capture the form input. Then the status is, so we don't need to rely on the request session. We have a method that returns the validation rules. This is my preferred approach for validation rules in a Livewire component. Our submit method is the primary method for this component, and it is a naming convention that I use when dealing with form components. This makes a lot of sense to me, but feel free to choose a naming method that works for you. We use Laravels container to inject an action class into this method to share the logic for creating and sending a signed URL. All we need to do here is pass the email entered through to the action and set a status alerting the user that the email is being sent.

Let's now walk through the action we want to use.

```php
final class SendLoginLink
{
    public function handle(string $email): void
    {
        Mail::to(
            users: $email,
        )->send(
            mailable: new LoginLink(
                url: URL::temporarySignedRoute(
                    name: 'login:store',
                    parameters: [
                        'email' => $email,
                    ],
                    expiration: 3600,
                ),
            )
        );
    }
}
```

This action only needs to send an email. We can configure this to be queued if we want to - but when dealing with an action requiring quick processing, it is better to queue it if we are building an API. We have a mailable class called `LoginLink` that we pass through the URL we want to use. Our URL is created by passing in the name of a route we want to generate a route for and passing the parameters that you want to use as part of the signing.

```php
final class LoginLink extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $url,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your Magic Link is here!',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.auth.login-link',
            with: [
                'url' => $this->url,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
```

Our mailable class is relatively straightforward and doesn't defer much from a standard mailable. We pass in a string for the URL. Then, we want to pass this through to a markdown view in the content.

```markdown
<x-mail::message>
# Login Link

Use the link below to log into the {{ config('app.name') }} application.

<x-mail::button :url="$url">
Login
</x-mail::button>

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
```

The user will receive this email and click on the link, taking them through to the signed URL. Let's register this route and see how it looks.

```php
Route::middleware(['guest'])->group(static function (): void {
    Route::view('login', 'app.auth.login')->name('login');
    Route::get(
        'login/{email}',
        LoginController::class,
    )->middleware('signed')->name('login:store');
});
```

We want to use a controller for this route and ensure we add the signed middleware. Now let us look at the controller to see how we handle signed URLs.

```php
final class LoginController
{
    public function __invoke(Request $request, string $email): RedirectResponse
    {
        if (! $request->hasValidSignature()) {
            abort(Response::HTTP_UNAUTHORIZED);
        }

        /**
         * @var User $user
         */
        $user = User::query()->where('email', $email)->firstOrFail();

        Auth::login($user);

        return new RedirectResponse(
            url: route('dashboard:show'),
        );
    }
}
```

Our first step is to ensure that the URL has a valid signature, and if it doesn't, we want to throw an unauthorized response. Once we know the signature is valid, we can query for the user passed through and authenticate them. Finally, we return a redirect to the dashboard.

Our user is now logged in successfully, and our journey is complete. However, we need to look at the registration route too. Let's add this route next. Again this will be a view route.

```php
Route::middleware(['guest'])->group(static function (): void {
    Route::view('login', 'app.auth.login')->name('login');
    Route::get(
        'login/{email}',
        LoginController::class,
    )->middleware('signed')->name('login:store');

    Route::view('register', 'app.auth.register')->name('register');
});
```

Again, we use a livewire component for the registration form - just like we did with the login process.

```php
final class RegisterForm extends Component
{
    public string $name = '';

    public string $email = '';

    public string $status = '';

    public function submit(CreateNewUser $user, SendLoginLink $action): void
    {
        $this->validate();

        $user = $user->handle(
            name: $this->name,
            email: $this->email,
        );

        if (! $user) {
            throw ValidationException::withMessages(
                messages: [
                    'email' => 'Something went wrong, please try again later.',
                ],
            );
        }

        $action->handle(
            email: $this->email,
        );

        $this->status = 'An email has been sent for you to log in.';
    }

    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'min:2',
                'max:55',
            ],
            'email' => [
                'required',
                'email',
            ]
        ];
    }

    public function render(): View
    {
        return view('livewire.auth.register-form');
    }
}
```

We capture the users' name, email address, and have a status property instead of using the request session again. Again we use a rules method to return the validation rules for this request. We come back to the submit method, where this time, we want to inject two actions.

`CreateNewUser` is the action we use to create and return a new user based on the information provided. If this fails for some reason, we throw a validation exception on the email. Then we use the `SendLoginLink` action we used on the login form to minimize code duplication.

```php
final class CreateNewUser
{
    public function handle(string $name, string $email): Builder|Model
    {
        return User::query()->create([
            'name' => $name,
            'email' => $email,
        ]);
    }
}
```

We could rename the login store route, but it is technically what we are doing again. We create a user. Then we want to log the user in.

This is one of many approaches you can take to implement passwordless authentication, but this is one approach that does work. You can find the [GitHub Repo here](https://github.com/JustSteveKing/passwordless-auth), and if you think this could be improved, feel free to drop a PR!
