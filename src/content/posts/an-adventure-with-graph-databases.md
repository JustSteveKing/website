---
title: An adventure with Graph Databases
pubDate: 2020-05-28
image: an-adventure-with-graph-databases.png
description: Explore open-source PHP packages for Neo4j graph database, offering fresh solutions to outdated or abandoned integrations.
---

From code to node, was the idea I wanted to accomplish when I first started
designing some open source packages 4 days ago. [neo4j](https://neo4j.com/) is
a fantastic graph database, and their query language
[Cypher](https://neo4j.com/developer/cypher-query-language/) is really nice to
work with! Unfortunately all of the official packages and the packages I could
find were either super out of data, or had been completely abandoned. This
frustrated me! How are us PHP developers meant to work with this amazing
database, if there is no package available!

So, I wanted to solve this problem for the collective herd. How would I go about doing it is another story competely. To start with I knew that using the neo4j bolt protocol would be quite a hard win, so I concentrated on their [HTTP API](https://neo4j.com/docs/http-api/current/).

To split this out, I started with a **[Connection Manager](https://packagist.org/packages/juststeveking/graph-connection)** which would allow me to register connection to work with in a single place - all which follow a specific interface to control and protect access. The connection manager itself is a relative simple container style class with stores all adapters inside a class called **[ParameterBag](https://packagist.org/packages/juststeveking/parameterbag)** which I have previously blogged about [here](https://www.juststeveking.uk/parameter-bag-my-latest-open-source-package/). You can specify which connection you want to use and then you are down to other vendor specific code.

I knew that to go alongside the connection manager, I will need an adapter to connect to and use. This is where the original idea of a **[HTTP API Adapter](https://packagist.org/packages/juststeveking/neo4j-http-adapter)** came from. This package will allow you to pass in all the specific around your database, from connection string to database name. From there it is as simple as adding queries onto the pipeline to send over in one transaction. This is one of the more complicated packages, but all the work is done under the hood. All the separate methods used to build up this functionality has been left as *public* so that behaviour can be customised where needed.

To send queries across to the database server itself through the adapter, no matter if it were the bolt or HTTP API, I knew I would need to be able to create queries. Now I could write these queries by hand, but why? This is 2020 - we can build things that build things for us! So I decided to build a **[Cypher Query Builder](https://packagist.org/packages/juststeveking/cypher-query-builder)** which in simple terms is a string builder. You can build up you query (although limited) and perform operations such as *MATCH*, *SET*, *CREATE*, *DELETE*, *REMOVE*, and *WHERE*,

The completed packages combine, or don't, to create a simple way to work with the neo4j http API v4. What I wanted to do was create a way so that all the components were opt-in. If all you need to do is work with the HTTP API, you need one package. If you want to also build up your queries using a fluent builder, you use 2 packages. If you start to scale and have multiple neo4j databases - or want to communicate in different ways depending on the work needed - you can use all 3. Eventually I will be expanding this past just neo4j and the http API - but for now I am content having solved a problem I found.
