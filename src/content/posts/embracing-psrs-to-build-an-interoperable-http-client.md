---
title: Embracing PSRs to build an interoperable Http Client
pubDate: 2020-05-29
image: embracing-psrs-to-build-an-interoperable-http-client.png
description: Learn to build a PSR-18 compliant HTTP client in PHP, enhancing web development through interoperability and efficient request handling.
---

Recently I have been scratching my head over PSR-18. As a new PSR there isn't
a lot of information around it, but I saw that as a challenge. I decided to
accept this challenge and build a compliant HTTP client to embrace the future
of interoperability.

If you look at the specifications for [PSR-18 on PHP-FIG](https://www.php-fig.org/psr/psr-18/) they are typically pretty confusing, but I read between the lines a little. The first step was to build a class that would accept all the necessary components to bootstrap the client.

```php
namespace JustSteveKing\HttpSlim;

use Psr\Http\Message\StreamFactoryInterface;
use Psr\Http\Message\RequestFactoryInterface;
use Psr\Http\Client\ClientExceptionInterface;

class HttpClient implements HttpClientInterface
{
  protected ClientInterface $client;
  protected StreamFactoryInterface $streamFactory;
  protected RequestFactoryInterface $requestFactory;
}
```

Now if you have read any of my other posts, or used any of my packages, or seen my posts on twitter, you will know I am a huge fan of named constructors.

```php
final protected function __construct(
  ClientInterface $client,
  RequestFactoryInterface $requestFactory,
  StreamFactoryInterface $streamFactory
) {
  $this->client = $client;
  $this->requestFactory = $requestFactory;
  $this->streamFactory = $streamFactory;
}

public static function build(
  ClientInterface $client,
  RequestFactoryInterface $requestFactory,
  StreamFactoryInterface $streamFactory
): self {
  return new static(
    $client,
    $requestFactory,
    $streamFactory
  );
}
```

This gives us a good starting point to begin with, from here we can implement our helper methods for making requests and encoding json. Our helper methods follow a typical pattern of, take a URL and an optional body as an array - making sure that we return a PSR-7 compliant Response (but that it typically down to the client library we inject). Here is an example of the post request:

```php
use \JsonException;
use Psr\Http\Message\ResponseInterface;
use JustSteveKing\HttpSlim\Exceptions\RequestError;

public function post(string $uri, array $body): ResponseInterface
{
  // build out json body content
  try {
    $content = $this->encodeJson($body);
  } catch (JsonException $exception) {
    throw RequestError::invalidJson($exception); 
  }

  $request = $this->requestFactory
    ->createRequest('POST', $uri)
    ->withAddedHeader('Content-Type', 'application/json')
    ->withBody($this->streamFactory->createStream($content));

  return $this->client->sendRequest($request);
}
```

Our encodeJson method simply returns a json encoded version of the passed through array.

This is just one adventure into embracing PSRs, but I have thoroughly enjoyed it so far! Please drop me a tweet if you have found this useful at all, or if you find an issue - feel free to drop an issue on the [GitHub repo](https://github.com/JustSteveKing/http-slim)