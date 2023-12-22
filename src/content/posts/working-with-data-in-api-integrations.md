---
title: Working with Data in your API Integrations
pubDate: 2022-07-20
image: working-with-data-in-api-integrations.png
source: https://laravel-news.com/working-with-data-in-api-integrations
partner: Laravel News
description: Enhance your API experience with contextual data objects. Learn how to build clean and developer-friendly integrations with third-party APIs using PHP.
---

Working with third-party APIs can be frustrating; we get JSON responses which in PHP will be represented as a plain old array - and we send data as arrays too. We lose a great deal of context and the ability to build something with a great developer experience. What if I told you it didn't have to be this way? What if I told you that it doesn't take much effort to build something that will add more context and improve your work with third-party APIs? Don't believe me? Let's take a look.

This tutorial will walk through integrating a fictional third-party API with nested data inside - the messiest of APIs. We will want to be able to get data from the API but also be able to send data to this API without having to build up these nasty arrays we are used to.

The best way to improve your experience here is to use the most up-to-date PHP version and a third-party package like Laravel Saloon or Laravel Transporter - but sometimes you don't want to pull in an entire package just to make a couple of API requests, right? If we did that, our entire application would be brittle and rely on so much third-party code we may as well be using a website builder. 

The API we are going to integrate with is fictional, which tells us the medical history of our users/patients. Imagine an API that you are working with and you want to be able to add new data to it - say a GPs web application or mobile application, and you go in for an appointment, and they need to register any further issues or notes to your file. They might want to check your history and see what is currently on your file.

The best way to get started with this is to build a service class, and depending on how many APIs you need to integrate with would usually point you in the right direction for integrating. I am going to build this as if I was going to need to integrate with multiple APIs - say, the mental health data is on an entirely separate API. So we will need to integrate with that at some point in the future. The first thing we want to do inside our `app` directory is to create a new namespace for `Services` so that we can have somewhere for our service connections to live. Inside, we will create a new namespace for each service we need to integrate, which are external or internal services. It is nice to have them grouped like this, as it gives you a standard - if you need to extend, there is no question of where it belongs; create a new service integration in `App\Services\` and you are good to go.

So our fictional API is called `medicaltrust`, a random name I came up with while writing this tutorial - if this is indeed an API already, then I apologize. This tutorial is not a reflection or based on this API in any way, shape, or form. Now create a new directory/namespace `app/Services/MedicalTrust`; inside here, we will want to create a class that is going to handle our integration - if you read my tutorial on [Laravel Saloon](https://laravel-news.com/api-integrations-using-saloon-in-laravel) then consider this a connector. A class that will handle the primary connection to the API. I have called mine `MedicalTrustService` because I like to be explicit in my naming where I can be and make sure it looks something like the following:

```php
declare(strict_types=1);

namespace App\Services\MedicalTrust;

class MedicalTrustService
{
	public function __construct(
		private readonly string $baseUrl,
		private readonly string $apiToken,
    ) {}
}
```

So we will want 2 things for this API, a base URL and an API token - nothing out of the ordinary. Inside `config/services.php` add the following block:

```php
return [
	'medical-trust' => [
		'url' => env('MEDICAL_TRUST_URL'),
		'token' => env('MEDICAL_TRUST_TOKEN'),
	]
];
```

When adding configuration options for third-party services, I find it is always best to keep them in the same place, even if you need a lot of config options. Maintaining a consistent standard to handle this is vital when working with APIs, as standards are the foundation of most modern APIs. To bootstrap our service, we will need to add a new record into our `app/Providers/AppServiceProvider.php` to tell it to register our service class as a dependency in the container to build the class. So add the following to the boot method:

```php
public function boot(): void
{
	$this->app->singleton(
		abstract: MedicalTrustService::class,
        concrete: fn () => new MedicalTrustService(
			baseUrl: strval(config('services.medical-trust.url')),
			apiToken: strval(config('services.medical-trust.token')),
		),
	);
}
```

All we are doing here is adding a new singleton to the container, and when we ask for a `MedicalTrustService` if we have not built one before - then build it by passing in these config values. We use `strval` to ensure it is a string as `config()` will return mixed by default. That part was relatively simple, so let's move on to providing a way we can build consistent requests to send.

Sending requests is the sole purpose of integrating with an API, so you want to ensure that you approach it sensibly. As I said at the tutorial's beginning, we will approach this as if we were integrating with more than one API in the long run. So what we need to do is abstract functionality away from our service where it is shared. The best way to do this is to use Traits in PHP - and if you follow the rule of 3, then this will make sense. You should abstract if you repeat the same code or roughly the same code more than twice. What sort of things might we want to abstract or have some level of control over? Building our base request template is one, ensuring we have it configured correctly. Sending requests is another - we need to make sure that we can control the requests we can send on a per API basis in reality. So let's create a few traits to make this a little easier.

Firstly we will create a Trait that controls building a base request, and it can have a few options in the trait for the approach. These will live within the Services namespace but under a `Concerns` namespace. In Laravel, traits in Eloquent especially are called Concerns - so we will match the naming convention of Laravel here. Create a new Trait called `app/Services/Concerns/BuildsBaseRequest.php` and add the following code to it:

```php
declare(strict_types=1);

namespace App\Services\Concerns;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

trait BuildBaseRequest
{
  public function buildRequestWithToken(): PendingRequest
  {
    return $this->withBaseUrl()->timeout(
    	seconds: 15,
    )->withToken(
    	token: $this->apiToken,
    );
  }

  public function buildRequestWithDigestAuth(): PendingRequest
  {
    return $this->withBaseUrl()->timeout(
    	seconds: 15,
    )->withDigestAuth(
    	username: $this->username,
    	password: $this->password,
    );
  }

  public function withBaseUrl(): PendingRequest
  {
    return Http::baseUrl(
    	url: $this->baseUrl,
    );
  }
}
```

What we are doing here is creating a standard method that will create a Pending Request with a base URL set - this relies on following a standard of injecting the base URL into the constructor of the service class - which is why it is essential to follow a standard or pattern. We then have optional methods to extend the request with token or digest auth. Approaching it this way allows us to be very flexible, and we aren't doing anything extreme or something that would work better elsewhere. Adding these methods to each service is fine, but as you start integrating with more and more APIs, it is crucial to have a centralized way to do so.

Our next set of concerns/traits will be to help control how we send requests to third-party APIs - we want to have multiple concerns/traits to limit the types of requests we can send. The first one will be `app/Services/Concerns/CanSendGetRequest.php`

```php
declare(strict_types=1);

namespace App\Services\Concerns;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;

trait CanSendGetRequest
{
  public function get(PendingRequest $request, string $url): Response
  {
    return $request->get(
    	url: $url,
    );
  }
}
```

Next, let us create a `app/Services/Concerns/CanSendPostRequest.php`:

```php
declare(strict_types=1);

namespace App\Services\Concerns;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;

trait CanSendPostRequest
{
  public function post(PendingRequest $request, string $url, array $payload = []): Response
  {
    return $request->post(
    	url: $url,
    	data: $payload,
    );
  }
}
```

As you can see, we are building up the HTTP verbs into traits to be specific in our control to ensure requests are always sent correctly. For some projects, this will be an absolute overkill, but imagine that you are integrating with 10+ APIs; suddenly, this approach isn't so silly.

Let's take a moment to think about the service class itself again. Do we want to build up this service class so that it has 10-20+ methods to ensure we hit all API endpoints? Most likely not; that sounds pretty messy, right? Instead, we will create specific resource classes that we can build with the service class or inject directly into methods. As this is a fictional medical API, we will look at dental records to start with. Let's go back to our `MedicalTrustService`:

```php
declare(strict_types=1);

namespace App\Services\MedicalTrust;

use App\Services\Concerns\BuildBaseRequest;
use App\Services\Concerns\CanSendGetRequests;
use App\Services\Concerns\CanSendPostRequests;

class MedicalTrustService
{
  use BuildBaseRequest;
  use CanSendGetRequests;
  use CanSendPostRequests;

  public function __construct(
    private readonly string $baseUrl,
    private readonly string $apiToken,
  ) {}

  public function dental(): DentalResource
  {
    return new DentalResource(
    	service: $this,
    );
  }
}
```

We have a new method called `dental` that will return a resource class specific to the dental resource endpoints. We inject the service into the constructor to call service methods such as `get` or `post` or `buildRequestWithToken`. Let's take a look at this class now and see how we should build it `app/Services/MedicalTrust/Resources/DentalResource.php`

```php
declare(strict_types=1);

namespace App\Services\MedicalTrust\Resources;

class DentalResource
{
  public function __construct(
  	private readonly MedicalTrustService $service,
  ) {}
}
```

Nice and simple, really. We can resolve this from the container as it needs nothing special. So for dental records, let's say we want to list all records and add a new record - how would this look using arrays?

```php
declare(strict_types=1);

namespace App\Services\MedicalTrust\Resources;

use Illuminate\Http\Client\Response;

class DentalResource
{
  public function __construct(
  	private readonly MedicalTrustService $service,
  ) {}

  public function list(string $identifier): Response
  {
    return $this->service->get(
    	request: $this->service->buildRequestWithToken(),
    	url: "/dental/{$identifier}/records",
    );
  }

  public function addRecord(string $identifier, array $data = []): Response
  {
    return $this->service->post(
    	request: $this->service->buildRequestWithToken(),
    	url: "/dental/{$identifier}/records",
    	payload: $data,
    );
  }
}
```

As you can see, this is relatively straightforward. We pass an identifier to identify a user, then using the service, we send a `get` or `post` request using the `buildRequestWithToken` as the base request to use. However, this approach to me is flawed. Firstly we are returning just the response as it is. There is no context, no information - just an array. Now, this is fine, especially if building an SDK - but the chances are we want a little more information around responses. How about the request as well? Yes, we probably did some validation with the incoming request using HTTP validation - but how about controlling the data we send to APIs? Let's look at how we can handle this to make arrays a thing of the past and contextual objects the future.

Before completely removing arrays, we need to understand how the data is displayed and what creates this data. Let's look at an example payload for the dental records:

```json
  {
  "id": "1234-1234-1234-1234",
  "treatments": {
    "crowns": [
      {
      	"material": "porcelain",
      	"location": "L12",
      	"implemented": "2022-07-10"
      }
    ],
    "fillings": [
      {
      	"material": "white",
      	"location": "R8",
      	"implemented": "2022-07-10"
      }
    ]
  }
}
```

So we have an identifier for the patient, then a treatment object. The treatment object has crowns and fillings the patient has received. In reality, this would be much bigger and contain much more information. The crown and filling are an array of dental fixes that have been applied - the material used, which tooth using dental jargon, and the date the treatment was implemented. Now let's first look at this in an array format:

```php
[
'id' => '1234-1234-1234-1234',
'treatment' => [
  'crowns' => [
    [
      'material' => 'porcelain',
      'location' => 'L12',
      'implemented' => '2022-07-10',
    ],
  ],
  'fillings' => [
    [
      'material' => 'white',
      'location' => 'R8',
      'implemented' => '2022-07-10',
    ],
  ]
]
];
```

Not quite as good, right? Yes, it represents the data relatively well, but imagine trying to use this data in a UI or anything else. What is the alternative? What can we do to fix this? First, let's design an object that represents a Dental Treatment: `app/Services/MedicalTrust/DataObjects/DentalTreatment.php`

```php
declare(strict_types=1);

namespace App\ServicesMedicalTrust\DataObjects;

use Illuminate\Support\Carbon;

class DentalTreatment
{
  public function __construct(
    public readonly string $material,
    public readonly string $location,
    public readonly Carbon $implemented,
  ) {}

  public function toArray(): array
  {
    return [
      'material' => $this->material,
      'location' => $this->location,
      'implemented' => $this->implemented->toDateString(),
    ];
  }
}
```

Instead, we now have a class that can be built - that, when looking at, we know what it means. We understand that this object or this set of data is in relation to dental treatment. Let's go up a level and look at treatments themselves: `app/Services/MedicalTrust/DataObjects/Treatments.php`

```php
declare(strict_types=1);

namespace App\Services\MedicalTrust\DataObjects;

class Treatments
{
  public function __construct(
    public readonly Crowns $crowns,
    public readonly Fillings $fillings,
  ) {}

  public function toArray(): array
  {
    return [
      'crowns' => $this->crowns->toArray(),
      'fillings' => $this->fillings->toArray(),
    ];
  }
}
```

Again like before, we have a specific class that represents all treatments a user might undertake - and it can be extended to include others. Let's say we now want to offer veneers - we can add a new property and create the data object for this. Let's have a look at how an object like Crowns might look: `app/Services/MedicalTrust/DataObjects/Crowns.php`

```php
declare(strict_types=1);

namespace App\Services\MedicalTrust\DataObjects;

use Illuminate\Support\Collection;

class Crowns
{
  public function __construct(
  	public Collection $treatments,
  ) {}

  public function toArray(): array
  {
    return $this->treatments->map(fn (DentalTreatment $treatment) =>
    	$treatment->toArray(),
    )->toArray();
  }
}
```

This time, our constructor just holds a Collection of treatments that can be added. We could type-hint this using docblocks to ensure that we only add DentalTreatments to it if we wanted to. Then when we cast this one to an array, we map over the treatments (type hinting each item) and cast the treatment to an array - then finally casting the entire thing to an array. The reason we have the `toArray` method on our classes is so that we can either save it to the database easily using eloquent: `Treatment::query()->create($treatment->toArray());` but also for CLI display and tables. A handy thing I have noticed works well on these data objects.

So how can we leverage these? Surely manually building them in the service will make it feel bloated? I like to build these objects using a data object factory, which accepts the data as an array and returns it as an object. Let's create one for the Dental Treatment (the lowest one): `app/Services/MedicalTrust/DataFactories/DentalTreatmentFactory.php`

```php
declare(strict_types=1);

namespace App\Services\MedicalTrust\DataFactories;

use App\Services\MedicalTrust\DataObjects\DentalTreatment;
use Illuminate\Support\Carbon;

class DentalTreatmentFactory
{
  public function make(array $attributes): DentalTreatment
  {
    return new DentalTreatment(
    	material: strval(data_get($attributes, 'material')),
    	location: strval(data_get($attributes, 'location')),
    	implemented: Carbon::parse(strval($attributes, 'implemented'));
    );
  }
}
```

So we have a factory with a make method, which accepts an array of attributes. Then we create a new Dental Treatment object using the Laravel `data_get` helper and make sure we cast it to the correct type. When it comes to the `implemented` property, we use Carbon to parse the passed-in date. Now taking it a step further, let's have a look at how we can create crows: `app/Services/MedicalTrust/DataFactories/CrownsFactory.php`:

```php
declare(strict_types=1);

namespace App\Services\MedicalTrust\DataFactories;

use App\Services\MedicalTrust\DataObjects\Crowns;
use Illuminate\Support\Carbon;

class CrownsFactory
{
  public function make(array $treatments): Crowns
  {
    return new Crowns(
    	treatments: new Collection(
    		items: $treatments,
    	)->map(fn ($treatment): DentalTreatment =>
    		(new DentalTreatmentFactory)->make(
    			attributes: $treatment,
    		),
    	),
    );
  }
}
```

So this one is a little more complex than the last one. This time we are passing an array of treatments in and newing up a Collection. Then once we have our collection, we want to loop through each treatment and use the dental treatment factory to make it into a Dental Treatment Object. To make this easier to work with, we could add a static method to our Data Factories called `new`, which accepts an array and just calls the make method:

```php
declare(strict_types=1);

namespace App\Services\MedicalTrust\DataFactories;

use App\Services\MedicalTrust\DataObjects\DentalTreatment;
use Illuminate\Support\Carbon;

class DentalTreatmentFactory
{
  public static new(array $attributes): DentalTreatment
  {
  	return (new static)->make(
  		attributes: $attributes,
  	);
  }

  public function make(array $attributes): DentalTreatment
  {
  	return new DentalTreatment(
  		material: strval(data_get($attributes, 'material')),
  		location: strval(data_get($attributes, 'location')),
  		implemented: Carbon::parse(strval($attributes, 'implemented'));
  	);
  }
}
```

This would make our Crows Factory a lot cleaner:

```php
declare(strict_types=1);

namespace App\Services\MedicalTrust\DataFactories;

use App\Services\MedicalTrust\DataObjects\Crowns;
use Illuminate\Support\Carbon;

class CrownsFactory
{
  public function make(array $treatments): Crowns
  {
    return new Crowns(
    	treatments: new Collection(
    		items: $treatments,
    	)->map(fn ($treatment): DentalTreatment =>
    		DentalTreatmentFactory::new(
    			attributes: $treatment,
    		),
    	),
    );
  }
}
```

Or we could even make it even easier for us to use by telling the DentalTreatment Factory to create a collection for us:

```php
declare(strict_types=1);

namespace App\Services\MedicalTrust\DataFactories;

use App\Services\MedicalTrust\DataObjects\DentalTreatment;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class DentalTreatmentFactory
{
  public static collection(array $treatments): Collection
  {
    return (new Collection(
    	items: $treatments,
    ))->map(fn ($treatment): DentalTreatment =>
    	static::new(attributes: $treatment),
    );
  }

  public static new(array $attributes): DentalTreatment
  {
    return (new static)->make(
    	attributes: $attributes,
    );
  }

  public function make(array $attributes): DentalTreatment
  {
    return new DentalTreatment(
    	material: strval(data_get($attributes, 'material')),
    	location: strval(data_get($attributes, 'location')),
    	implemented: Carbon::parse(strval($attributes, 'implemented'));
    );
  }
}
```

This would allow us to simplify the Crowns factory that much further:

```php
declare(strict_types=1);

namespace App\Services\MedicalTrust\DataFactories;

use App\Services\MedicalTrust\DataObjects\Crowns;
use Illuminate\Support\Carbon;

class CrownsFactory
{
  public function make(array $treatments): Crowns
  {
    return new Crowns(
      treatments: DentalTreatmentFactory::collection(
      	treatments: $treatments,
      ),
    );
  }
}
```

The story here is that the limit is on what makes your life easier. Perhaps you do not need to go this far, or maybe your API is a little flatter, so it is easy to implement this approach. But, if we take the approach and apply what works for us, we get a more contextual API response and can understand the response a lot easier and work with it a lot easier.

Stepping back, we also want to be able to create new treatments through the API. We want to be able to fill in a form - or something similar and post the data off to the API to register that we have implemented a new treatment. To do this, we need to send a post request through our `DentalResource` using the `addRecord` method. This isn't terrible, but let's have a look at the example payload that we might use to send in a PHP array:

```php
[
	'type' => 'crown',
	'material' => 'porcelain',
	'location' => 'L12',
	'implemented' => now()->toDateString(),
];
```

This isn't the worse payload possible, but what if we want to do some validation or extend this? The point is that the request data also has minimal context, isn't developer-friendly, and we aren't adding any value to our application. So instead, we can do something different - much like we did with responses, we can do the same with requests; build an object that we use and can cast as an array. Firstly let's create the data object for the request:`app/Services/MedicalTrust/Requests/NewDentalTreatment.php`

```php
declare(strict_types=1);

namespace App\Services\MedicalTrust\Requests;

class NewDentalTreatment
{
  public function __construct(
    public readonly string $type,
    public readonly string $material,
    public readonly string $location,
    public readonly Carbon $implemented,
  ) {}

  public function toArray(): array
  {
    return [
      'type' => $this->type,
      'material' => $this->material,
      'location' => $this->location,
      'implemented' => Carbon::now()->toDateString(),
    ];
  }
}
```

So this time, we are using the object. Like before, we will create a factory for this: `app/Services/MedicalTrust/RequestFactories/DentalTreatmentFactory.php`

```php
declare(strict_types=1);

namespace App\Services\MedicalTrust\RequestFactories;

use Illuminate\Support\Carbon;

class DentalTreatmentFactory
{
  public function make(array $attributes): NewDentalTreatment
  {
    return new NewDentalTreatment(
      type: strval(data_get($attributes, 'type')),
      material: strval(data_get($attributes, 'material')),
      location: strval(data_get($attributes, 'location')),
      implemented: Carbon::parse(data_get($attributes, 'implemented')),
    );
  }
}
```

Let's now refactor the `addRecord` method on our service:

```php
declare(strict_types=1);

namespace App\Services\MedicalTrust\Resources;

use App\Services\MedicalTrust\Requests\NewDentalTreatment;
use Illuminate\Http\Client\Response;

class DentalResource
{
  public function addRecord(string $identifier, NewDentalTreatment $request): Response
  {
    return $this->service->post(
      request: $this->service->buildRequestWithToken(),
      url: "/dental/{$identifier}/records",
      payload: $request->toArray(),
    );
  }
}
```

At this point, we have a much cleaner-looking method. We can click through to the request class and see what it contains. But to appreciate this, we can take a step back to see what it looks like for us to implement it. Imagine now we have a controller that handles this, it is a post request on a web form coming in, and it is a specific form we use for adding a new Crown: `app/Http/Controllers/Dental/Crowns/StoreController.php` this first time, we will use the array:

```php
declare(strict_types=1);

namespace App\Http\Controllers\Dental\Crowns;

use App\Http\Requests\Dental\NewCrownRequest;
use App\Services\MedicalTrust\Resources\DentalResource;

class StoreController
{
  public function __construct(
    private readonly DentalResource $api,
  ) {}

  public function __invoke(NewCrownRequest $request): RedirectResponse
  {
    $treatment = $this->api->addRecord(
    	identifier: $request->get('patient'),
    	data: $request->validated(),
  	);

  	// Whatever else we need to do...
  }
}
```

This isn't terrible, right? It is pretty reasonable. We can validate the payload coming from the form using a form request and pass the validated data to the resource to add a new record. But there is nothing we can do about business logic; we rely only on HTTP validation here. Let's have a look at what we can do with objects:

```php
declare(strict_types=1);

namespace App\Http\Controllers\Dental\Crowns;

use App\Http\Requests\Dental\NewCrownRequest;
use App\Services\MedicalTrust\RequestFactories\DentalTreatmentFactory;
use App\Services\MedicalTrust\Resources\DentalResource;

class StoreController
{
  public function __construct(
    private readonly DentalResource $api,
    private readonly DentalTreatmentFactory $factory,
  ) {}

  public function __invoke(NewCrownRequest $request): RedirectResponse
  {
  	$treatment = $this->api->addRecord(
  		identifier: $request->get('patient'),
  		request: $this->factory->make(
  			attributes: $request->validated(),
  		),
  	);

  	// Whatever else we need to do...
  }
}
```

So we are now using objects instead of arrays, but what about business logic? Yes, we are doing some HTTP validation that can catch some stuff - but what else could we do? Let's look at how we validate an array:

```php
declare(strict_types=1);

namespace App\Http\Controllers\Dental\Crowns;

use App\Http\Requests\Dental\NewCrownRequest;
use App\Services\MedicalTrust\Resources\DentalResource;

class StoreController
{
  public function __construct(
    private readonly DentalResource $api,
  ) {}

  public function __invoke(NewCrownRequest $request): RedirectResponse
  {
    if ($request->get('type') !== DentalTreatmentOption::crown()) {
    	throw new InvalidArgumentException(
      		message: 'Cannot create a new treatment, the only option available right now is crowns.',
      	);
    }

    if (! in_array($request->get('location'), DentalLocationOptions::teeth())) {
      throw new InvalidArgumentException(
      	message: 'Passed through location is not a recognised dental location.',
      );
    }

    if (! in_array($request->get('material'), DentalCrownMaterials::all())) {
      throw new InvalidArgumentException(
      	message: 'Cannot use this material for a crown.',
      );
    }

    $treatment = $this->api->addRecord(
    	identifier: $request->get('patient'),
    	data: $request->validated(),
    );

  	// Whatever else we need to do...
  }
}
```

So we have many validation options available - but logic-wise, we also want to check beyond HTTP validation. Do we support this type - as we are only doing a crown, have we passed in a valid location in terms of dental jargon? Can we use this material for a crown? All of this, we want to make sure we know and can program. Yes, we could add all of this to a form request, but then the request would get bigger. We want to validate the input from a basic level with Laravel form requests and validate business logic in a place that owns the business logic so that we have a similar experience across web, API, and CLI. So how would this look using an object:

```php
declare(strict_types=1);

namespace App\Http\Controllers\Dental\Crowns;

use App\Http\Requests\Dental\NewCrownRequest;
use App\Services\MedicalTrust\RequestFactories\DentalTreatmentFactory;
use App\Services\MedicalTrust\Resources\DentalResource;

class StoreController
{
  public function __construct(
    private readonly DentalResource $api,
    private readonly DentalTreatmentFactory $factory,
  ) {}

  public function __invoke(NewCrownRequest $request): RedirectResponse
  {
    $treatment = $this->api->addRecord(
      identifier: $request->get('patient'),
      request: $this->factory->make(
      	attributes: $request->validated(),
      )->validate(),
    );

    // Whatever else we need to do...
  }
}
```

This time we are using a factory to create the object from the validated data - the HTTP valid data. At this point, we have passed the web validation. Now we can move on to the business validation. So we create the object and then call validate on it, which is a new method that we need to add:

```php
declare(strict_types=1);

namespace App\Services\MedicalTrust\Requests;

class NewDentalTreatment
{
  public function __construct(
    public readonly string $type,
    public readonly string $material,
    public readonly string $location,
    public readonly Carbon $implemented,
  ) {}

  public function toArray(): array
  {
    return [
      'type' => $this->type,
      'material' => $this->material,
      'location' => $this->location,
      'implemented' => Carbon::now()->toDateString(),
    ];
  }

  public function validate(): static
  {
    if ($this->type !== DentalTreatmentOption::crown()) {
      throw new InvalidArgumentException(
      	message: "Cannot create a new treatment, the only option available right now is crowns, you asked for {$this->type}"
      );
    }

    if (! in_array($this->location, DentalLocationOptions::teeth())) {
      throw new InvalidArgumentException(
      	message: "Passed through location [{$this->location}] is not a recognised dental location.",
      );
    }

    if (! in_array($this->material, DentalCrownMaterials::all())) {
      throw new InvalidArgumentException(
      	message: "Cannot use material [{$this->material}] for a crown.",
      );
    }

    return $this;
  }
}
```

So as you can see, the Request Object can hold its own business rules for us - meaning that the object can go through validating itself, not adding extra complexity to your web app and CLI implementations. This is where I believe the power of this approach comes in. in the standardization of how you approach an API. It isn't anything new or groundbreaking, but adopting this approach, means that you can finely control your API integrations in a consistent standard in the best possible way that suits you.

How are you handling API data and requests? I am interested to see how many others have found a similar way to be helpful. Is there a way you think this could be improved? Let us know on Twitter, as we all love to learn and grow!