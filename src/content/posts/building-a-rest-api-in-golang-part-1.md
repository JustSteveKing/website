---
title: Building a REST API in GoLang - Part 1
pubDate: 2020-07-24
image: building-a-rest-api-in-golang-part-1.png
description: Discover the process of building a REST API in GoLang, from setting up Docker containers to structuring and scaling your application effectively.
---

I have been building APIs for production environments for many years now,
predominently in PHP. The last 3 years however, I have been hard at work
getting to grips with GoLang - so I thought I would change the pace and share
a post on GoLang.

For the past 4 weeks I have been using GoLang as my primary language with one of my clients, after an initial consultation on their requirements and talking about where they were seeing botlenecks in their business - some modernisation was needed. I initially went through an Event Storming session to see the sort of business events that were common in their business, to see if it would highlight any additional (hidden) issues. After a successful session it was clear that their systems were no cohesive enough, and speed was a major issue. This seemed like a perfect opportunity to use GoLang to help solve their problems.

This post will walk through an approach I have taken to build a REST API in GoLang, and why I do things a certain way. I am not saying this is *the* way to build REST APIs in the language, but coming from other languages this way made the most sense after some trial and error. For the purpose of being to the point, I will not be following how I would usually build an API. I would usually take the Design first API approach - using openapi specifications to design my API before writting code, and I also will not be writting tests because there are 100s of examples of writting tests out there. This is a concise post about how I go about building APIs in GoLang.

My first step in any API build, is to create a Docker container to run my API on. I love docker for many reasons, but that is another blog post. When building docker containers I tend to stick to the rule of one service per container - meaning if you have a cache layer, database layer, and an application layer you should have 3 containers running together. Here is the base **Dockerfile** that I use for my GoLang service:

```docker
# Create our container from a very lightweight image
FROM golang:alpine

# Set our working directory for the container
WORKDIR /app

# Copy our entire application into the Working Directory
COPY ./ /app

# Install our Go Modules
RUN go mod download

# Set the entry point for our application
ENTRYPOINT go run cmd/rest-api/server.go
```

What we have here is a nice lightweight GoLang container for us to inject our API into. The next step is to create our **docker-compose.yml** file to define our services, I prefer using the docker-compose approach while building applications. Here is an example of my docker-compose file:

```yaml
version: "3"

networks:
    api:

services:
    go_api:
        build:
        context: .
        dockerfile: Dockerfile
        container_name: go_rest_api
        networks:
        - api
        ports:
        - 8080:8080
        volumes:
        - ./:/app
```

What we are doing here is creating a network for our REST API, creating a container and giving it a name, giving the container build instructions from our Dockerfile, and setting the container post and mounting volumes. I won't go into too much detail here, as this is a tutorial on GoLang not docker.

Our next step once we have docker ready to go, is to start our project with Go! My first step is to alsways start by initialising go modules:

```bash
go mod init github.com/JustSteveKing/go-rest-api
```

This step sets your working directory are the root for a Go module at the specified URL. Our next step is to look at the directory structure. There are many approaches to how you could do this, a lot of developers will tell you for something simple you should just use the flat structure where everything is in one root directory. **I do not like this approach**. I come from other programming languages where separation of concerns is often done through namespacing and directory separation. As you can probably already guess from my Dockerfile - I have a **cmd** directory as my entrypoint. Let me explain.

A Go program needs an entry script to run, you don't want one really big file called **main.go** where all you application code lives - this like any other language would be difficult to manage. My approach is to have 2 root directories: **cmd** and **pkg**. My CMD directory is the entrypoint to the application, I would usually structure it using: `cmd/{ project-name }/server.go` so I have a command to run, inside of a project, which runs a server. If this was a CLI application I would change **server.go** to **cli.go** so it makes sense to any develop looking at the code.

Our **pkg** directory is where we keep all the code for this package. This is a relatively common concept in the Go world, as each application is a package. From this point, the application code lives inside pkg. Some developers will repeat the project name approach inside the pkg directory, but I am not a fan of that. I am not deploying multiple packages in this project - just the one. The same could be said for the **cmd** directory - but I digress. I like what I like.

When building my entry point code in server.go I want it to remain relatively clean. I dont't want my main running to be full of set up code and declarations! This to me doesn't feel like a good developer experience. I have used frameworks such as Laravel in the past, and my favourite thing about the framework is the attention to detail and the quality of developer experience. You can achieve a lot and the code remains clean and readable. In Go this is even more true, as you would typically build this application into an executable program for your environment.

Let me show you an example of my **server.go** file and then I can walk through what is going on:

```go
// cmd/rest-api/server.go
package main

import (
    "github.com/joho/godotenv"
    "github.com/JustSteveKing/go-rest-api/pkg/infrastructure/kernel"
)

func init() {
    if err := godotenv.Load(); err != nil {
        panic("No .env file found")
    }
}

func main() {
    // Boot our application
    app := kernel.Boot()

    // Build our application services, passing in our application itself
    // We will add our services here later

    // Run our application
    go func () {
        app.Run()
    }()

    // Wait for termination signals
    app.WaitForShutdown()
}
```

So what we have here is a simple entrypoint to our application, we load out environment variables before we run the application itself - we won't want to panic and crash our application halfway through processing because we didn't load our environement. The next step is to tell our application kernal to boot, basically create all relevant services that are needed to run the application and create and return the application itself. We the start a goroutine to run our application in, so that our main thread is responsible for starting and closing our application, but we have a separate thread for our application to run in. We then tell our application to listen for any termination signals that may occur. As you can see from our import statements, we are pulling in 2 new files from our application. Our **kernel** and our **manager** - what I am doing here is separating how the application is loaded and following some relatively basic Domain Driven Design principles.

Our next step in building this application out is going to be creating our application kernel itself, as this is the first thing to load:

```go
// pkg/infrastructure/kernel/app-kernel.go
package kernel

import (
    gohandlers "github.com/gorilla/handlers"
    "github.com/JustSteveKing/go-rest-api/pkg/infrastructure/factories"
    "github.com/JustSteveKing/go-rest-api/pkg/infrastructure/providers"
)

// Boot our application and it's services
func Boot() *factories.Application {
    // Build our configration
    config := providers.ConfigProvider()

    // Build our router
    router := providers.RouteProvider()

    // Build our application logger
    logger := providers.LoggerProvider()

    // Set up CORS protection
    corsHandler := gohandlers.CORS(gohandlers.AllowedOrigins([]string{"*"}))

    // return a built application
    return &factories.Application{
        Server: &http.Server{
        Addr:              ":" + config.App.Port,
        Handler:           corsHandler(router),
        ReadTimeout:       1 * time.Second,
        WriteTimeout:      1 * time.Second,
        IdleTimeout:       120 * time.Second,
        },
        Router: router,
        Logger: logger,
        Config: config,
    }
}
```

So what we are doing here is booting our application, and returning a built Application. To start with, we create our configuration, routing and logging from our service providers - which we will build shortly. We then use gorilla/mux to add CORS protection around our routing. You might ask why are we adding all of this here, but this will become clear when we start adding application services to our domain/context. One of the key things here is to add sensible defaults to our http Server itself, this could be config/environment driven if you wanted to - but these are relatively sensible defaults so I tend to hard code these.

Service Providers? This is a well known approach to scale in an application that uses dependency injection. I am not using DI in this example however, these providers are responsible for building and returning specific structures for our application. This could be seen as early over engineering - but it isn't many lines of code, and I like to start as I mean to go on when writting code.

Our configuration provider looks like this:

```go
// pkg/infrastructure/providers/config-provider.go
package providers

import "github.com/JustSteveKing/go-rest-api/pkg/infrastructure/factories"

// ConfigProvider will run and create a new Config struct from the Config Factory
func ConfigProvider() *factories.Config {
    return factories.ConfigFactory()
}
```

As you can see the only job of this provider is to create our Config struct from our configuration factory. What this allows us to do, should we need to, is add extra configuratino options to inject into our factory when we are creating it. So it is flexible and extendable to a point.

Let's take a quick moment to look at our Config Factory to see what it is:

```go
// pkg/infrastructure/factories/config-factory.go
package factories

import "os"

// AppConfig is the Application configuration struct
type AppConfig struct {
    Name    string
    Version string
    Port    string
}

// HTTPConfig is the Application HTTP configuration
type HTTPConfig struct {
    Content string
    Problem string
}

// Config is the Configuration struct
type Config struct {
    App  AppConfig
    HTTP HTTPConfig
}

// ConfigFactory returns a new Config Struct
func ConfigFactory() *Config {
    return &Config{
        App: AppConfig{
            Name:    env("APP_NAME", "Go App"),
            Version: env("APP_VERSION", "v1.0"),
            Port:    env("APP_PORT", ":8080"),
        },
        HTTP: HTTPConfig{
            Content: env("HTTP_CONTENT_TYPE", "application/json"),
            Problem: env("HTTP_PROBLEM", "application/problem+json"),
        },
    }
}

// env is a simple helper function to read an environment variable or return a default value
func env(key string, defaultValue string) string {
    if value, exists := os.LookupEnv(key); exists {
        return value
    }

    return defaultValue
}
```

This is a simple struct building factory, which will give us our applications configuration, it also has the helper functino **env** for nicer loading and providing a default when there isn't an entry in our **env** file - this was inspired by Laravel.

Back to the application. We have seen how we use providers, and how our factories work and why. This is basically just a nice way to work. Eventually I would like to move some of this basic code out of the project and into go modules that I can centrally manage and pull into applications when I need them. But that is a task for another day.

Moving back to our Application and the application factory we have seen mentioned. This is a simple and easy way to build the application we want to be running:

```go
// pkg/infrastructure/factories/application-factory.go
package factories

import (
    "context"
    "github.com/gorilla/mux"
    "go.uber.org/zap"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

// Application is out general purpose Application struct which contains a link through to the main services connected
type Application struct {
    Server *http.Server
    Router *mux.Router
    Logger *zap.Logger
    Config *Config
}

// Run will start the application as required
func (app *Application) Run() {
    err := app.Server.ListenAndServe()

    if err != nil {
        panic(err)
    }
}

// WaitForShutdown is a graceful way to handle server shutdown events
func (app *Application) WaitForShutdown() {
    // Create a channel to listen for OS signals
    interruptChan := make(chan os.Signal, 1)
    signal.Notify(interruptChan, os.Interrupt, os.Kill, syscall.SIGINT, syscall.SIGTERM)

    // Block until we receive a signal to our channel
    <-interruptChan

    app.Logger.Info("Received shutdown signal, gracefully terminating")

    ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
    defer cancel()
    app.Server.Shutdown(ctx)
    os.Exit(0)
}
```

So to start with, we define a struct for our application, what do we want our application to be built with? What are the core components in the Application itself outside our domain code. We need a server, a router, a logger and some configuration. So back in our kernel we saw that we run this application. This simple tells our configured application server to listen and serve. We then wait to see if this returns an error for any reason, and if it does - we panic with the error.  This is to code that we run in our goroutine, on the separate thread.

The next thing you will notice is the WaitForShutdown function, which is a graceful way of listening for any interuption signals, and then we can close the application down and exit out program. This code was something that I was advised on by several other developers. I wondered if there was an efficient and "nice" way to exit a program, and this is the end result. I cannot take full credit for this beautiful looking code.

So we have the basics. We have something that will run in our Docker container and listen on a port. The next step is to start looking at our actual application code, not the set up. This could have been majorly simplified to a few functions in a main.go file, but then it would be scalable and we would be blurring the boundaries between infrastructure/application and domain - which is always messy as more hands work on a single code base.

So previously we saw in out server command that we would be adding things to it. The approach I take, is to have basic setup of the application and then service registration in the command itself. After playing with several approaches this is the one that made the most sense to me. This may not work for everyone, but I found it is a nice way to manage features inside an API and from asingle glance you can see what is going on.

So let's take a look at the server.go file again, and see it in a more full form:

```go
// cmd/rest-api/server.go
package main

import (
    "github.com/joho/godotenv"
    "github.com/JustSteveKing/go-rest-api/pkg/application/manager"
    "github.com/JustSteveKing/go-rest-api/pkg/infrastructure/kernel"
)

func init() {
    if err := godotenv.Load(); err != nil {
        panic("No .env file found")
    }
}

func main() {
    app := kernel.Boot()

    // Specific Application Services
    manager.BootPingService(app)
    manager.BootUserServce(app)

    go func() {
        app.Run()
    }()

    app.WaitForShutdown()
}
```

So you can see the new additions of **manager.Boot - something - Service(app)** which is how I do my service registration. For each context/domain I create a new method inside the application manager to boot this service and pass through anything that may be needed.

Let's take a look at one of these Service managers and I will explain what is happening.

```go
// pkg/application/manager/ping-service.go
package manager

import(
    "github.com/JustSteveKing/go-rest-api/pkg/domain/ping"
)

// BootPingService is responsible for setting up all the dependencies for ping
func BootPingService(app *factories.Application) {
    // Create a new Ping Service
    service := ping.NewService(app)

    // Create a new http.Handler
    handler := ping.NewHandler(app, service)

    // Create a service level router
    router := app.Router.Methods(http.MethodGet).PathPrefix("/ping").Subrouter()

    // Register our service level router
    router.HandleFunc("/", handler.Handle).Name("ping:handle")
}
```

So, what we have done here is create a service, which we will see next. We then create our request handler, a service level sub router restructing this to a certain part prefix, and only accepting certain HTTP methods. We then define our first route of: **/ping/**

Our service is a simple gateway to a Repository. In this specific example it wouldn't be needed as there is no real data that needs retrieving - but I will set it up as an example so that the concept is understood.

```go
// pkg/domain/ping/service.go
package ping

import (
    "github.com/JustSteveKing/go-rest-api/pkg/infrastructure/factories"
    "net/http"
    "sync"
    "time"
)

// Service is the gateway to the Repository that is used to access data
type Service struct {
    Repository *PingRepository
}

// NewService will build and return a new Service
func NewService(app *factories.Application) *Service {
    return &Service{
        Repository: NewRepository(app)
    }
}
```

So what we are doing here is simply creating a new service, with an implementation of a specific repositoy. This could be swapped out for a different repository at any time as and when required. I won't go too far down this route - maybe I will do a second blog post about bits I have skipped over here.

Routing in GoLang is nice, it's clean and it makes sense. I have build 2 go modules for this next part:

* [Go API Problem](https://github.com/JustSteveKing/go-api-problem) - for when you want consistent API error responses.
* [Go HTTP Response](https://github.com/JustSteveKing/go-http-response) - for building API responses in a very specific format.

To start with let's look at the first part, creating a handler

```go
// pkg/domain/ping/endpoints.go
package ping

import(
    "github.com/JustSteveKing/go-rest-api/pkg/infrastructure/factories"
)

// Handler is the http.Handler for this service
type Handler struct {
    App *factories.Application
    Service *Service
}

// NewHandler will create a new Handler to handle any requests
func NewHandler(app *factories.Application, service *Service) *Handler {
    return &Handler{
        App: app,
        Service: service,
    }
}
```

Here we are creating a new http.Handler and passing in both our Application and our specific Service for this Domain. What this allows us to do, is in each route, access our repository through the passed in service to our handler, alternatively you could also access the general application that is also being passed in - should you need to access configuration or any other struct or interface that you add to it.

Now only actually handling a route. This is a typical approach to handling requests in GoLang in most of the router modules available, but this is what I like to do:

```go
// pkg/domain/ping/endpoints.go

/** The other code from above has been omitted here **/

// Handle will handle the /ping route in our application
func (handler *Handler) Handle(response http.ResponseWritter, request *http.Request) {
    // Log the request - add any useful information you want here
    handler.App.Logger.Info("Route Dispatched. Ping service triggered.")

    data, err := doSomthingCool()
    if err != nil {
        responseFactory.Send(
        response,
        http.StatusBadRequest,
        &problem.APIProblem{
            Title:  "Error Message",
            Detail: "Detail on the error",
            Status: strconv.Itoa(http.StatusBadRequest),
            Code:   "ERROR-001-001",
        },
        handler.App.Config.HTTP.Problem,
        )
        
        return
    }

    responseFactory.Send(
        response,
        http.StatusOK,
        &Response{
        Message: "Ping Service Online",
        },
        handler.App.Config.HTTP.Content,
    )

    return
}
```

So now we have some content being returned through our API. It isn't anthing exciting - a simple health check endpoint. However, what this is showing you is an easy to use pattern. When we first hit our endpoint, we log that request - in any way you want to, do any logical processing through the service into the repository that you might need to do, then build up a response and send it back. Sending a response here what we do is pass through the response writter from the current request, pass through the relevant HTTP status code, any sort of interface to be marshalled into an encoding, and we pass through the content type we want to send across. I like to keep the content type in configuration so that I have an application standard response content type (usually **application/vnd.api+json**) I also keep this very similar to any error responses (usually **application/problem+json**).

For now that is all I will be going through, I believe it is a general introduction into REST APIs in GoLang showing how I have approached certain problems and what I have done to make extending and scaling a little easier.

I'd love some feedback, or even recommendations! You can reach out to me on twitter at **@JustSteveKing** where I am always happy to take some constructive feedback. This will eventually be pushed up to GitHub also (same handle as twitter) so please feel free to follow me on there also, if you would like to see the finished code.