---
title: API Versioning in Laravel - All you need to know
pubDate: 2023-11-25
image: api-versioning-in-laravel.png
partner: Treblle
source: https://blog.treblle.com/content/images/size/w1750/2023/10/API-Versioning-in-Laravel.png
description: All you need to know about API Versioning. What is it, what types of versioning exist, how are they used and why you might need it?
---

## Introduction

In todays world, APIs are everywhere. From your business application to your best friend's online store, to your smart kettle that makes a coffee from that handy app on your phone. Everything needs to talk to something else at some point, and this is where, as Software Engineers, we would reach for an API. We use them to send updates to your kettle or provide a catalog of products for the online store, or an entry point into the masses of data that your business application may need.

Over the last ten years APIs have been becoming more and more of a necessity, as the mobile web introduced the need for faster applications and websites. This meant as Software Engineers, we needed to look for ways to provide data for these applications and websites quickly when requested - instead of as the application or page opens. To understand this transition better, you can delve into the [history of APIs](https://blog.treblle.com/from-soap-to-rest-tracing-the-history-of-apis/) and how they have revolutionized the way we build and interact with software today.

As time has gone on, our APIs have been growing in complexity, growing in terms of the functionalities that they offer, and the footprint of the data they capture has changed time after time. This is where API versioning can help you manage the growth and changes in your application as you move forward with business as usual.

If you provide an API to a smart kettle for example, changes to your API could mean 100s or 1000s of people suddenly cannot make their morning cup of coffee. Or people are unable to checkout from that online store, resulting in decreased sales. Event not getting the correct or up to date information from your business application, leading to misinformed decisions, and potentially missed leads.

As you can imagine, not versioning your API correctly can have a detrimental impact on your business or product.

**But how should you version your API?**

What approaches are there? Do you even need to version your API? Perhaps you have an internal application that utilises an API that only a small group of people use in a non business critical role, do you still need to version your API? Let’s look into these questions and more.


## Basics: What is API Versioning

So before we begin, let’s dive into what exactly is API Versioning. It is an approach we as Software Engineers will use to introduce changes to our API, it is as simple as that. We may want to change how the data is structured, or how functionality works, or add extra authorization layers to increase security in areas that were overlooked. There are other approaches we can take to do some of these tasks, such as Role Based Access Control or Feature Flags. However, usually we would want to use these alongside Versioning of our API to get the fine-grained control we desire for our application.

Let’s take the smart kettle scenario. We may release another kettle that uses the same API, that wants to optionally heat the water to a different temperature. Our initial product heating the water to 100 degrees to make a coffee, but from product feedback with our customers - our product is mostly used by tea drinkers who only want to heat the water up to 80 degrees, to make the perfect cup of tea. This in itself is perhaps a separate article on making the perfect cup of tea. Our initial product used version 1 of our API, that only let you heat up the water to 100 degrees. We could amend this and add a default temperature of 100 degrees, but that wouldn’t let us add customisations for users who wanted that option.

If we implemented versioning into our API, our new product release could be timed with the release of a new version of our API - allowing all new kettles to talk directly to the new endpoints required. Then we can stagger updates to our older products, to upgrade them to use the newer API - offering the new functionality to all customers with a supported product. Allowing customers with unsupported products to still use the product as they always have. Having this level of seamless compatibility means that our customers are going to have the best experience they can with our brand - increasing the likeliness of them being a returning customer in the future.

If we didn’t version our API, or plan this level of role out using a versioned API - we could end up pushing customer loyalty and trust away from us. While this may be an extreme case of not versioning your API, it is a reality that this could indeed happen. Even if you don’t have immediate plans to release additional products, or change functionality - do you want to have to worry about it later on when you are about to add that massive new feature, or change the massive feature that helped you grow your user base to begin with?

## Types of API Versioning

Much like coffees, there are multiple different flavours of API Versioning. You need to find the one that suits you best, what fits your exact scenario so that you aren’t jumping through hoops to achieve what you need to.

### URL Versioning

One of the most popular approaches is URL versioning. This is where you would see something like `https://api.domain.com/v1/some-resource` in your URL. This is sometimes referred to as Path Versioning too. The idea here is that you are allowing users to choose which version they want to access easily by modifying to URL itself. There are a lot of benefits to this approach. It offers simplicity out of the box, allowing you to simply nest a new version of the API in the same domain without any additional thoughts. You can even host this behind an Nginx reverse proxy to allow different servers to host different versions of your API. However, it isn’t without its down sides.
Using a versioned API that uses URL Versioning means that you can easily end up with duplicate code - no matter which programming language or framework you choose to use. You are adding complexity on-top of complexity and binding it together through one entry point - the URL. Now this is something that you can work around if you have the time to do so, but it is not the most real expectation.

### Media Type Versioning

Not as popular as URL Versioning, however it has been increasing in popularity since companies such as GitHub switched to using this approach. With this approach we use the requests Accept header to determine which version of the API you want to communicate with. This does add a limit to who might be able to change or update the version, as not everyone will be able to change request headers - or know how they should be formatted. If we are to follow API Standards, then we would expect to see something such as `Accept: application/vnd.api.version+json` where version is the version being requested. If we were to [build a fully RESTful API](https://blog.treblle.com/the-10-rest-commandments/) then we will already be doing content negotiation to determine how our user wants the response to be sent back. However adding the additional complexity of versioning into that makes it all that much harder to build your API efficiently.

### Query Parameter Versioning

Query Parameters are something a lot of us are familiar with then it comes to APIs, but not so much for versioning. The benefit of using query parameters for versioning is that it is easy to implement, and change at any point. Query Parameters are super flexible and have fantastic support in all web and application clients. Much like media type versioning this can add additional layers of complexity on-top of what you are building already. Alongside content negotiation, data filtering and sorting, adding API versioning into the query parameters adding yet another thing you have to logic checks for at a point when you should be focusing more on fine tuning the response you want to get back.

## Best Practices

In Software Engineering we have standards for everything, from how to write our code to how we should write our tests. When it comes to API Versioning, standards aren’t any different. Having a standard is important when it comes to your API, it encourages you as a developer to adhere to a contract that you intend to offer to your clients.

[Whichever approach you take to API Versioning](https://blog.treblle.com/my-version-api-versioning-better-than-most-versiong-being-done/), it is important to make sure you keep it consistent and document the approach. This allows your users to trust that as your application grows, there won’t be any changes to how you version your API that is going to take them by surprise.

## Implementing

When in comes to implementing your API Versioning, you need to think about which way would be best for your product and clients. Do you have a highly technical team, with a less technical client list? Maybe you don’t have an overly technical team but a very technical client list. You have to consider all options to decide what is going to work well. Not just for now either, you need to consider your product in five years. The rule of product development that I always go for is to think about the product of tomorrow instead of the product you have. Let’s walk through the options, and talk through the different pros and cons of each approach.

et’s start with perhaps my least favourite option to start. The query parameter versioning approach. I won’t focus on any specific language or framework, I will focus more on "sudo code" so that the idea is universal.

```
public function index(request)
  switch (request.get('version')):
    case 'v1':
      data = this.service.v1.listall()
    case 'v2':
      data = this.service.v2.listall()
  
  return response.data(data)
```

This is an approach that we can implement directly in our controllers, we can hot-swap our data repository based on the version that is coming through in the query parameter. This allows us to keep a central entry point for our API, while having a flexible approach to how we retrieve the data in the background. It isn’t perfect however, as I mentioned before - the query parameter is designed to filter and sort the data that should be returned. Let’s move on.

We will go for the easiest option next, URL versioning. We have multiple options for this, whether we are using a singular code base or an API gateway with small micro-services behind. The most common used to be a singular code base, but as micro-services gained popularity - the API gateway has become a popular approach. However, versioning in an API gateway is relatively easy, it is flexible enough to just support it with little hassle. Let’s look at an example just using it a singular code base.

```
public function handle(request, next): response
  switch (request.path.matchesPattern('v')):
    case 'v1':
        app.container.bind(data-repository, v1.data-repository)
    case 'v2':
        app.container.bind(data-repository, v2.data-repository)

   return next(request)
```

This is a very similar approach to how we can work with query parameters, where we have a piece of middleware that will catch the version and rebind our data repository in the container dependent on the version. The reason we are doing it this way is because while we may have different controllers for each route - we want the data repository to be specific to the version being requested. The biggest downside here is the code repetition. You have to have multiple controllers and repositories that are maintained as your product moves forward. So in effect you have to maintain a certain level of technical debt to keep backwards compatibility. This is not uncommon in the software world, but I think we can all agree that this isn’t the most ideal situation to be in.

Finally let’s discuss what is perhaps the hardest approach, Header versioning. This is less typically used in monolithic applications as it is hard to do, but again in an API gateway this is almost designed to work perfectly. Companies such as GitHub use the header and content type to switch versions of their API. Using an API gateway here you can switch which service or API you want to send the request through to - which keeps your application code a lot simpler. For the sudo code example, I will assume you are not using an API gateway.

```
public function handle(request, next): response
  switch (request.headers.get('Content-Type')):
    case 'application/vnd.api.v1+json':
        app.container.bind(data-repository, v1.data-repository)
    case 'application/vnd.api.v2+json':
        app.container.bind(data-repository, v2.data-repository)

   return next(request)
```

Here we want to do something very similar to how we handle the URL versioning, which is the most reliable and testable approach to versioning that I have personally found.

## Documentation and Communication

When versioning your API, you need to make sure that you have full documentation on each version and an easy way to switch between the versions. You need to provide a way for your users to easily decide which version they want to use and why. They need to easily see which version does what, and what the differences are. Communicating the differences between each version is crucial to the success of your API. However, it isn’t about just having documentation - you need to have good documentation. One of the things that made [Laravel](https://docs.treblle.com/en/integrations/laravel/?ref=blog.treblle.com) (a PHP framework) gain its popularity is how well it was documented. Having human readable documentation that is aimed at your users, to guide them through the journey of using your API is almost vital. Relying simply on auto-generated documentation from code or your OpenAPI specification is the quickest way to build documentation that quite simply, sucks. Nobody wants to read it, or have to read it. Whereas when the documentation has had effort put into it, it can be quite enjoyable to read instead of trying to find a reason not to read the documentation.

## Versioning in REST APIs

When building a REST API, is it almost assumed that you will follow some sort of versioning strategy. When designing your API, you need to think about which approach will work best for you. Sometimes you will need to version your API - so you need to think through which approach is going to work best for your product. Sometimes, however, you don’t actually need versioning - in which case you can relax.

## Versioning in GraphQL APIs

When it comes to GraphQL APIs you approach versioning completely differently. GraphQL has a `@deprecated` directive that you can add to your schema definition - allowing you to communicate the upcoming changes in your API. It’s flexible nature and query-specific responses allow for a much more granular and client-driven approach to managing changes. However, this does move the breaking changes risk to your clients. This approach tends to provide a smoother transition, reduces versioning conflicts, and ensures that older clients are not broken by changes. However, it does also require careful schema design and evolution, as well as clear communication with clients to ensure deprecated fields are phased out over time.

## Continuous Integration

API Versioning in CI introduces some unique challenges, but also opportunities, for development teams. CI promotes the frequent merging of code changes into a central repository, followed by automated builds and testing. When your API undergoes any sort of changes, especially any breaking changes, it can have a massive impact on any dependent components or services. In a CI environment, failing to properly version your API can lead to integration failures, especially if your users are not prepared or informed about any changes you are releasing. Hence, it is vital to integrate a version strategy when you have plans to move fast. This can be avoided by clear communication, good documentation, active community, and usage of the most modern standards and approaches. However, you need to make a call as to which approach (if any) is right for you. It goes beyond simply sticking a v2 in your URL, because before you know it you will be on v10 with no way back. The lesson learned here is, design your API for a purpose and that purpose should always be tailored to your users.

## Security Considerations

The one thing that a lot of people don’t think about when it comes to API Versioning is the security considerations. While versioning of your API mostly focuses on the functionality and compatibility of your API it also carries significant security implications you need to think about. As your API evolves. some versions might contain vulnerabilities that are fixed in newer versions. Without proper versioning and lifecycle management, outdated versions of your API could remain exposed to these vulnerabilities. These can serve as potential entry points for any attacker, who may choose you as their target. When an API version is deprecated, it is crucial to notify your users and provide them with clean migration paths to update their integration. Notifying them of the why you are deprecating is a sign of you being on the ball with these things, not a sign that you wrote bad code. Maintaining multiple version of an API increases the complexity of security audits and penetration testing, it also widens to attack surface of your API itself. Versioning ensures feature compatibility in your API, however it also necessitates vigilant security governance to prevent potential vulnerabilities from lingering in outdated versions as you move forwards.

## Performance Impact

Let’s talk about the performance impact of API Versioning. When building an API, we think about how we might scale our product. How can we support a sudden uptick of users, or how can we expand our functionality without causing bottlenecks or technical debt. What do we do if we 5x our team? But we never think about how our API Versioning strategy might cause any performance issues, or how they might exacerbate existing performance issues we are seeing. Versioning ensures compatibility and feature progression can also introduce performance considerations for both you and your users. Maintaining multiple versions of your API means potentially sustaining various codebases or branching logic within a single codebase to handle the different version requests. This branching can add an overhead to processing a request, especially if there are significant differences between versions or the logic the determine the version and execute the code is complex. We end up building a house of cards, and have no choice but to keep stacking. For your uses, using non-standard API versions might result in receiving more data than than required or perhaps in a less efficient format. This impacts the speed of data parsing and handling. Caching strategies become more complex as the same resource in different versions may need to be cached separately. While the performance impact of versioning will vary based on your strategy, it is an undeniable fact that versioning your API will introduce layers of complexity that might be hard to unpick or maintain.

## Challenges

The biggest challenge you will face when you first look at API Versioning, is deciding if you should use API Versioning - and if so, which strategy should you use. While it is essential for ensuring compatibility it does present its own set of challenges if you do adopt Versioning in your API. One of the primary hurdles you will face is deciding when to increment a version. Should a minor, non-breaking change warrant a new version? Or should versions only be incremented for major breaking changes? Finding that right balance can be difficult, and maintaining multiple versions concurrently can lead to a bloated codebase and increased overhead for your developers. They need to ensure bugs are fixes across all supported versions. Communicating changes in your API to your users poses another challenge. They need to be kept informed about deprecations, new versions, any changes that might potentially affect their integration with your service. How long should you support an old version? There are no rules on this, not guidelines, and everyone everywhere is doing something slightly different. Whichever approach you might take to versioning your API, it can massively impact the ease of use of your API and how easily your users can adapt to potential changes. Making the initial choice of if and how to version your API that much harder.

## Future Trends

As the technology landscape changes, the different strategies and methodologies around API versioning are likely to change. One trend to consider is the move towards backward-compatible changes, which aims to minimize the need for new versions by [leveraging technologies such as GraphQL](https://blog.treblle.com/rest-soap-or-graphql/). This allows you to introduce new features or fields without disrupting existing integrations. Another one to consider is using something such as gRPC, which is a contract based versioning where APIs are designed around specific contracts. When the contract changes, it is much easier to recognise breaking changes and adjust version accordingly. Automated tooling and AI could play a bigger role in years to come when it comes to API Versioning, predicting the impact of changes on dependent systems and alerting developers about potential conflicts. Micro-services while not currently the hottest of topics, could see another spike in popularity, decentralising the versioning approach allows granular control of services and integrations allowing them to move independently of each other. While the basic strategies of API versioning will remain with us; tools, practices, and technologies are all ready to adapt to the next phase of API versioning.

## Summary: Mastering API Versioning for Seamless growth

Mastering API Versioning is crucial to ensure seamless growth in your API. As your product evolves and expands, the underlying APIs need to accommodate new features, improvements, and changes - all without disrupting your users and existing integrations. Effective API versioning ensure the backward-compatibility, enabling older applications to function even as newer ones leverage more advanced features. It requires a careful balance of introducing newer versions all while maintaining older ones, all while keeping your code clean and maintainable. Strategic communication around version changes, clearer documentations, and understandable deprecation warnings will further help you to enhance the experience for your users. Ultimately, by mastering the intricacies of API versioning you can pace the way for innovation ensuring that growth and evolution can coexist in your products with causing friction.
