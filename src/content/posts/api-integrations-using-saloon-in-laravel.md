---
title: API Integrations using Saloon in Laravel
pubDate: 2022-06-14
image: api-integrations-using-saloon-in-laravel.png
source: https://laravel-news.com/api-integrations-using-saloon-in-laravel
partner: Laravel News
description: Discover easy API integration in Laravel with Saloon; a tutorial on creating a GitHub API connection to manage workflows from the command line.
---

We have all been there, we want to integrate with a 3rd party API in Laravel and we ask ourselves "How should I do this?". When it comes to API integrations I am no stranger, but still each time I wonder what is going to be the best way. [Sam Carré](https://twitter.com/carre_sam) built a [package](https://docs.saloon.dev/) early in 2022 called [Saloon](https://laravel-news.com/saloon) that can make our API integrations amazing. This article however is going to be very different, this is going to be a walk through on how you can use it to build an integration, from scratch.

Like all great things it starts with a `laravel new` and goes from there, so let's get started. Now when it comes to installing Laravel you can use the laravel installer or composer - that part is up to you. I would recommend the installer if you can though, as it provides easy options to do more than just create a project. Create a new project and open it in your code editor of choice. Once we are there, we can get started.

What are we going to build? I am glad you asked! We are going to be building an integration with the GitHub API to get a list of workflows available for a repo. Now this could be super helpful if you, like me, spend a lot of time in the command line. You are working on an app, you push changes to a branch or create a PR - it goes though a workflow that could be running one of many other things. Knowing the status of this workflow sometimes has a huge impact on what you do next. Is that feature complete? Were there issues with our workflow run? Are our tests or static analysis passing? All of these things you would usually wait and check the repo on GitHub to see the status. This integration will allow you to run an artisan command, get a list of available workflows for a repo, and allow you to trigger a new workflow run.

So by now, composer should have done its thing and installed the perfect starting point, a Laravel application. Next we need to install Saloon - but we want to make sure that we install the laravel version, so run the following inside your terminal:

```bash
composer require sammyjo20/saloon-laravel
```

Just like that, we are a step closer to easier integrations already. If you have any issues at this stage, make sure that you check both the Laravel and PHP versions you are using, as Saloon requires at least Laravel 8 and PHP 8!

So, now we have Saloon installed we need to create a new class. In Saloons terminology these are "Connectors" and all a connector does is create an object focused way to say - this API is connected through this class. There is a handy artisan command that allows you to create these, so run the following artisan command to create a GitHub connector:

```bash
php artisan saloon:connector GitHub GitHubConnector
```

This command is split into 2 parts, the first argument is the Integration you are creating and the second is the name of the connector you want to create. This means that you can create multiple connectors for an integration - which gives you a lot of control to connect in many different ways should you need to.

This will have created a new class for you under `app/Http/Integrations/GitHub/GitHubConnector.php`, let's have a look at this a moment, and understand what is going on.

The first thing we see is that our connector extends the `SaloonConnector`, which is what will allow us to get our connector working without a lot of boilerplate code. Then we inherit a trait called `AcceptsJson`. Now if we look at the Saloon documentation, we know that this is a plugin. This basically adds a header to our requests telling the 3rd party API that we want to Accept JSON responses. The next thing we see is that we have a method for defining the base URL for our connector - so let's add ours in:

```php
public function defineBaseUrl(): string
{
    return 'https://api.github.com';
}
```

Nice and clean, we could even take this a little further so we are dealing with less loose strings hanging around in our application - so let's look at how we can do that. Inside your `config/services.php` file add a new service record:

```php
'github' => [
    'url' => env('GITHUB_API_URL', 'https://api.github.com'),
]
```

What this will do is allow us to override this in different environments - giving us a better and more testable solution. Locally we could even mock the GitHub API using their OpenAPI specification, and test against that to ensure that it works. However, this tutorial is about Saloon so I digress... Now let us refactor our base URL method to use the configuration:

```php
public function defineBaseUrl(): string
{
    return (string) config('services.github.url');
}
```

As you can see we are now fetching the newly added record from our configuration - and casting it to a string for type safety - `config()` returns a mixed result so we want to be strict on this if we can.

Next we have default headers and default config, now right now I am not going to worry about the default headers, as we will approach auth on it's own in a little while. But the configuration is where we can define the guzzle options for our integration, as Saloon uses Guzzle under the hood. For now let's set the timeout and move on, but feel free to spend some time configuring this as you see fit:

```php
public function defaultConfig(): array
{
    return [
        'timeout' => 30,
    ];
}
```

We now have our Connector as configured as we need it for now, we can come back later if we find something we need to add. The next step is to start thinking about the requests we want to be sending. If we look at the API documentation for GitHub Actions API we have many options, we will start with listing the workflows for a particular repository: `/repos/{owner}/{repo}/actions/workflows`. Run the following artisan command the create a new request:

```bash
php artisan saloon:request GitHub ListRepositoryWorkflowsRequest
```

Again the first argument is the Integration, and the second argument is the name of the request we want to create. We need to make sure we name the integration for the request we are creating so it lives in the right place, then we need to give it a name. I called mine `ListRepositoryWorkflowsRequest` because I like a descriptive naming approach - however, feel free to adapt this to how you like to name things, as there is no real wrong way here. This will have created a new file for us to look at: `app/Http/Integrations/GitHub/Requests/ListRepositoryWorkflowsRequest.php` - let us have a look at this now.

Again we are extending a library class here, this time the `SaloonRequest` which is to be expected. We then have a connector property and a method. We can change the method if we need to - but the default `GET` is what we need right now. Then we have a method for defining the endpoint. Refactor your request class to look like the below example:

```php
class ListRepositoryWorkflowsRequest extends SaloonRequest
{
    protected ?string $connector = GitHubConnector::class;

    protected ?string $method = Saloon::GET;

    public function __construct(
        public string $owner,
        public string $repo,
    ) {}

    public function defineEndpoint(): string
    {
        return "/repos/{$this->owner}/{$this->repo}/actions/workflows";
    }
}
```

What we have done is add a constructor which accepts the repo and owner as arguments which we can then use within our define endpoint method. We have also set the connector to the `GitHubConnector` we created earler. So we have a request we know we can send, we can take a small step away from the integration and think about the Console Command instead.

If you haven't created a console command in Laravel before, make sure you check out [the documentation](https://laravel.com/docs/9.x/artisan#writing-commands) which is very good. Run the following artisan command to create the first command for this integration:

```bash
php artisan make:command GitHub/ListRepositoryWorkflows
```

This will have created the following file: `app/Console/Commands/GitHub/ListRespositoryWorkflows.php`. We can now start working with our command to make this send the request and get the data we care about. The first thing I always do when it comes to console commands, is think on the signature. How do I want this to be called? It needs to be something that explains what it is doing, but it also needs to be memorable. I am going to call mine `github:workflows` as it explains it quite well to me. We can also add a description to our console command, so that when browsing available commands it explains the purpose better: "Fetch a list of workflows from GitHub by the repository name."

Finally we get to the handle method of our command, the part where we actualy need to do something. In our case we are going to be sending a request, getting some data and displaying that data in some way. However before we can do that, there is one thing we have not done up until this point. That is Authentication. With every API integration, Authentication is one of the key aspects - we need the API to know not only who we are but also that we are actually allowed to make this request. If you go to [your GitHub settings](https://github.com/settings/tokens) and click through to developer settings and personal access tokens, you will be able to generate your own here. I would recommand using this approach instead of going for a full OAuth application for this. We do not need OAuth we just need users to be able to access what they need.

Once you have your access token, we need to add it to our `.env` file and make sure we can pull it through our configuration.

```bash
GITHUB_API_TOKEN=ghp_loads-of-letters-and-numbers-here
```

We can now extends our service in `config/services.php` under github to add this token:

```php
'github' => [
    'url' => env('GITHUB_API_URL', 'https://api.github.com'),
    'token' => env('GITHUB_API_TOKEN'),
]
```

Now we have a good way of loading this token in, we can get back to our console command! We need to ammend our signature to allow us to accept the owner and repository as arguments:

```php
class ListRepositoryWorkflows extends Command
{
    protected $signature = 'github:workflows
        {owner : The owner or organisation.}
		{repo : The repository we are looking at.}
	';

    protected $description = 'Fetch a list of workflows from GitHub by the repository name.';

    public function handle(): int
    {
        return 0;
    }
}
```

Now we can turn our focus onto the handle method:

```php
public function handle(): int
{
    $request = new ListRepositoryWorkflowsRequest(
        owner: $this->argument('owner'),
        repo: $this->argument('repo'),
    );

    return self::SUCCESS;
}
```

Here we are starting to build up our request by passing the arguments straight into the Request itself, however what we might want to do is create some local variables to provide some console feedback:

```php
public function handle(): int
{
    $owner = (string) $this->argument('owner');
    $repo = (string) $this->argument('repo');

    $request = new ListRepositoryWorkflowsRequest(
        owner: $owner,
        repo: $repo,
    );

    $this->info(
        string: "Fetching workflows for {$owner}/{$repo}",
    );

    return self::SUCCESS;
}
```

So we have some feedback to the user, which is always important when it comes to a console command. Now we need to add our authentication token and actually send the request:

```php
public function handle(): int
{
    $owner = (string) $this->argument('owner');
    $repo = (string) $this->argument('repo');

    $request = new ListRepositoryWorkflowsRequest(
        owner: $owner,
        repo: $repo,
    );

    $request->withTokenAuth(
        token: (string) config('services.github.token'),
    );

    $this->info(
        string: "Fetching workflows for {$owner}/{$repo}",
    );

    $response = $request->send();

    return self::SUCCESS;
}
```

If you ammend the above and do a `dd()` on `$response->json()`, just for now. Then run the command:

```bash
php artisan github:workflows laravel laravel
```

This will get a list of workflows for the `laravel/laravel` repo. Our command will allow you to work with any public repos, if you wanted this to be more specific you could build up an option list of repos you want to check against instead of accepting arguments - but that part is up to you. For this tutorial I am going to focus on the wider more open use case.

Now the response we get back from the GitHub API is great and informative, but it will require transforming for display, and if we look at it in isolation, there is no context. Instead we will add another plugin to our request, which will allow us to transform responses into DTOs (Domain Transfer Objects) which is a great way to handle this. It will allow us to loose the flexible array we are used to getting from APIs, and get something that is more contextually aware. Let's create a DTO for a Workflow, create a new file: `app/Http/Integrations/GitHub/DataObjects/Workflow.php` and add the follow code to it:

```php
class Workflow
{
    public function __construct(
        public int $id,
        public string $name,
        public string $state,
    ) {}

    public static function fromSaloon(array $workflow): static
    {
        return new static(
            id: intval(data_get($workflow, 'id')),
            name: strval(data_get($workflow, 'name')),
            state: strval(data_get($workflow, 'state')),
        );
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'state' => $this->state,
        ];
    }
}
```

We have a constructor which contains the important parts of our workflow that we want to display, a `fromSaloon` method which will transform an array from a saloon response into a new DTO, and a to array method for displaying the DTO back to an array when we need it. Inside our `ListRepositoryWorkflowsRequest` we need to inherit a new trait and add a new method:

```php
class ListRepositoryWorkflowsRequest extends SaloonRequest
{
    use CastsToDto;

    protected ?string $connector = GitHubConnector::class;

    protected ?string $method = Saloon::GET;

    public function __construct(
        public string $owner,
        public string $repo,
    ) {}
  
    public function defineEndpoint(): string
    {
        return "/repos/{$this->owner}/{$this->repo}/actions/workflows";
    }

    protected function castToDto(SaloonResponse $response): Collection
    {
        return (new Collection(
            items: $response->json('workflows'),
        ))->map(function ($workflow): Workflow {
            return Workflow::fromSaloon(
                workflow: $workflow,
            );
        });
    }
}
```

We inherit the `CastsToDto` trait, which allows this request to call the `dto` method on a response, and then we add a `castToDto` method where we can control how this is transformed. We want this to return a new Collection as there is more than one workflow, using the workflows part of the response body. We then map over each item in the collection - and turn it into a DTO. Now we can either do it this way, or we can do it this way where we build our collection with DTOs:

```php
protected function castToDto(SaloonResponse $response): Collection
{
	return new Collection(
		items: $response->collect('workflows')->map(fn ($workflow) =>
			Workflow::fromSaloon(
				workflow: $workflow
			),
		)
	);
}
```

You can choose what works best for you here. I prefer the first approach personally as I like to step through and see the logic, but there is nothing wrong with either approach - the choice is yours. Back to the command now, we now need to think about how we want to be displaying this information:

```php
public function handle(): int
{
    $owner = (string) $this->argument('owner');
    $repo = (string) $this->argument('repo');

    $request = new ListRepositoryWorkflowsRequest(
        owner: $owner,
        repo: $repo,
    );

    $request->withTokenAuth(
        token: (string) config('services.github.token'),
    );

    $this->info(
        string: "Fetching workflows for {$owner}/{$repo}",
    );

    $response = $request->send();

    if ($response->failed()) {
        throw $response->toException();
	}

    $this->table(
        headers: ['ID', 'Name', 'State'],
        rows: $response
			->dto()
			->map(fn (Workflow $workflow) =>
				  $workflow->toArray()
			)->toArray(),
    );

    return self::SUCCESS;
}
```

So we create a table, with the headers, then for the rows we want the response DTO and we will map over the collection returned, casting each DTO back to an array to be displayed. This may seem counter intuative to cast from a response array to a DTO and back to an array, but what this will do is enforce types so that the ID, name and status are always there when expected and it won't give any funny results. It allows consistency where a normal response array may not have it, and if we wanted to we could turn this into a Value Object where we have behaviour attached instead. If we now run our command we should now see a nice table output which is easier to read than a few lines of strings:

```bash
php artisan github:workflows laravel laravel
```

```markdown
Fetching workflows for laravel/laravel
+----------+------------------+--------+
| ID       | Name             | State  |
+----------+------------------+--------+
| 12345678 | pull requests    | active |
| 87654321 | Tests            | active |
| 18273645 | update changelog | active |
+----------+------------------+--------+
```

Lastly, just listing out these workflow is great - but let's take it one step further in the name of science. Let's say you were running this command against one of your repos, and you wanted to run the update changelog manaually? Or maybe you wanted this to be triggered on a cron using your live production server or any event you might think of? We could set the changelog to run once a day at midnight so we get daily recaps in the changelog or anything we might want. Let us create another console command to create a new workflow dispatch event:

```bash
php artisan saloon:request GitHub CreateWorkflowDispatchEventRequest
```

Inside of this new file `app/Http/Integrations/GitHub/Requests/CreateWorkflowDispatchEventRequest.php` add the following code so we can walk through it:

```php
class CreateWorkflowDispatchEventRequest extends SaloonRequest
{
    use HasJsonBody;

    protected ?string $connector = GitHubConnector::class;

    public function defaultData(): array
    {
        return [
            'ref' => 'main',
        ];
    }
  
    protected ?string $method = Saloon::POST;

    public function __construct(
        public string $owner,
        public string $repo,
        public string $workflow,
    ) {}

    public function defineEndpoint(): string
    {
        return "/repos/{$this->owner}/{$this->repo}/actions/workflows/{$this->workflow}/dispatches";
    }
}
```

We are setting the connector, and inheriting the `HasJsonBody` trait to allow us to send data. The method has been set to be a `POST` request as we want to send data. Then we have a constructor which accepts the parts of the URL that builds up the endpoint. Finally we have dome default data inside `defaultData` which we can use to set defaults for this post request. As it is for a repo, we can pass either a commit hash or a branch name here - so I have set my default to `main` as that is what I usually call my production branch. We can now trigger this endpoint to dispatch a new workflow event, so let us create a console command to control this so we can run it from our CLI:

```bash
php artisan make:command GitHub/CreateWorkflowDispatchEvent
```

Now let's fill in the details and then we can walk through what is happening:

```php
class CreateWorkflowDispatchEvent extends Command
{
    protected $signature = 'github:dispatch
        {owner : The owner or organisation.}
		{repo : The repository we are looking at.}
		{workflow : The ID of the workflow we want to dispatch.}
		{branch? : Optional: The branch name to run the workflow against.}
	';

    protected $description = 'Create a new workflow dispatch event for a repository.';

    public function handle(): int
    {
        $owner = (string) $this->argument('owner');
        $repo = (string) $this->argument('repo');
        $workflow = (string) $this->argument('workflow');

        $request = new CreateWorkflowDispatchEventRequest(
            owner: $owner,
            repo: $repo,
            workflow: $workflow,
        );

        $request->withTokenAuth(
            token: (string) config('services.github.token'),
        );
	
		if ($this->hasArgument('branch')) {
			$request->setData(
				data: ['ref' => $this->argument('branch')],
			);
        }
  
        $this->info(
            string: "Requesting a new workflow dispatch for {$owner}/{$repo} using workflow: {$workflow}",
        );

        $response = $request->send();

        if ($response->failed()) {
            throw $response->toException();
        }

        $this->info(
            string: 'Request was accepted by GitHub',
        );

        return self::SUCCESS;
    }
}
```

So like before we have a signature and a description, our signature this time has an optional branch incase we want to override the defaults in the request. So in our handle method, we can simple check if the input has the argument 'branch' and if so, we can parse this and set the data for the request. We then give a little feedback to the CLI, letting the user know what we are doing - and send the request. If all goes well at this point we can simply output a message informing the user that GitHub accepted the request. However if something goes wrong, we want to throw the specific exception, at least during develoment.

The main caveat with this last request is that our workflow is set up to be triggered by a webhook by adding a new `on` item into the workflow:

```yaml
on: workflow_dispatch
```

That is it! We are using Saloon and Laravel to not only list repository workflows, but if configured correctly we can also trigger them to be ran on demand :muscle:

As I said at the beginning of this tutorial, there are many ways to approach API integrations, but one thing is for certain - using Saloon makes it clean and easy, but also quite delightful to use.