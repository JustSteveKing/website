---
title: My First Go Module - go api problem
pubDate: 2020-07-09
description: Explore the journey of building the first Go Module for error handling in APIs. Simplify error handling in GoLang with this module.
image: my-first-go-module-go-api-problem.png
---

I have been playing with GoLang on and off now for around 3 years, but never
really had chance to use it the way I wanted to. However, recently with a new
client we needed to start building high throughput microservices for their
distributed warehouse system. This was the moment I was waiting for.

I spent a little time designing the architecture for how we were going to achieve the scale and load needed to achieve their goals, a nice mixture of gRPC services with sensibly placed REST APIs for the client facing interfaces. One thing that was obviously clear, was that we would need to find a nice way to handle, track and explain errors that may occur in the system. In PHP I typically use a fantastic package called [API Problem](https://github.com/Crell/ApiProblem) which is RFC compliant and handles errors very nicely.

While getting my initial Go service up and running I had a google around to try and find something similar enough to the PHP package I like so much, but struggled to find anything close enough. So I decided it was time to build my first Go Module. Exciting news for me, not only was I finally getting stuck in with building Go services, but I was also already contributing to the open source community for GoLang!

The basis of the module was quite simple, unlike PHP - there are no classes or objects, so all I really needed was a way to build an API problem message and return this as a response from the API. The things that were going to be useful here were:

* Title: A short human readable error to explain what went wrong
* Detail: A longer form explanation of the error
* Status: The HTTP Status Code for the error
* Code: An internal reference Code that we could document and track through API logs to understand failure points.
* Meta: A simple key value map that could help further explain the problems going on.

So this didn't need to be complicated, but I needed to build something as all of my services would need this functionality if they were public facing APIs.

```go
type APIProblem struct {
  Title string `json:"title,omitempty"`
  Detail string `json:"detail,omitempty"`
  Status string `json:"status,omitempty"`
  Code string `json:"code,omitempty"`
  Meta *map[string]interface{} `json:"meta,omitempty"`
}
```

In essence there was nothing more to do! I had a struct I could build when my API hit an error, and all I needed to do was marshal this into JSON and return response to any client interfaces.

Using this struct was as simple to use as it was to write:

```go
type server struct{}

func main() {
  s := &server{}
  http.Handle("/", func(rw http.ResponseWriter, r *http.Request) {
    if dbc := db.Where("email = ?", "user@email.com").First(&user); dbc.Error != nil {
      respondWithJSON(
        rw,
        http.StatusBadRequest,
        &APIProblem{
          Title:  "Invalid Credentials",
          Detail: "Unable to verify user credentials",
          Status: strconv.Itoa(http.StatusBadRequest),
          Code:   "USER-001-001",
        },
        "application/problem+json",
      )
      return
    }
  })

  log.Fatal(http.ListenAndServe(":8080", nil))
}

func respondWithJSON(rw http.ResponseWriter, code int, payload interface{}, contentType string) {
  response, _ := json.Marshal(payload)
  rw.Header().Set("Content-Type", contentType)
  rw.WriteHeader(code)
  rw.Write(response)
}
```

So for my first Go Module, it was pretty simple - but it solved a problem I knew I was going to face! Feel free to check out the source code and install instructions on the [GitHub Repository](https://github.com/JustSteveKing/go-api-problem)