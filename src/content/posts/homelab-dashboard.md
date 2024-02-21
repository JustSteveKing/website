---
title: Building a Homelab Dashboard with Laravel and Livewire
pubDate: 2024-02-01
image: homelab-dashboard.png
description: Follow my journey as I build a powerful homelab dashboard using Laravel and Livewire, automating and monitoring my setup along the way.
---

So, recently I have been getting into homelab stuff. It kind of brings me back to my Linux System Admin days, and when I would tinker with VMs, servers, and Linux in general.

I have found a treasure trove of content available on YouTube that I have been catching up on, so that I can get as much information as possible. There are some really awesome channels out there, that make me want to up my YouTube game a little ...

But, that's another story. This post is about building a Homelab Dashboard with Laravel and Livewire. Right, title repeated in the content - I class that as an SEO win. Onto the interesting stuff.

While looking into this, I stumbled across some cool management dashboards for homelabs. There are some really cool projects out there! I did find one built in PHP too, which got me thinking. It's called [Heimdall](https://heimdall.site/), and it is built in an older version of Laravel. I had a look through the code base, and if I am honest - it could be a little better.

However, I definitely applaude the developers initiative in building something cool like this using Laravel! So, I thought I would put my money where my mouth is and start building my own Homelab Dashboard. But build it not only the way I would build a Laravel application, but build it in the way that I am would manage my homelab itself. There are some dashboards out there that are super configurable, drag and droppable, and generally just confusing as heck. That doesn't excite me the way it does a front-end developer perhaps. So instead I am going to focus on building something functional to start with, and from there see what I can make fun.

With this being a new project, it needs to start with a Laravel 11 base install. It might not be released yet, but you have to live dangerously sometimes right!? When I think of the role of what the dashboard should do, I instantly think of Livewire. Livewire is a perfect solution for this in my opinion as each component loaded will be able to poll for updates on their own, without having to juggle sockets.

So this is going to be something installed locally, inside a private network, that little to no people will have access to. However, I do have a very curious 9 year old who likes to tinker with settings on _everything_. So for that reason I am going to be adding an authentication layer to ensure that it's protected.

However, I will not be using any of the default packages for authentication. I will have direct access to everything that I need should I need to reset anything. So I will build a simple login form using livewire, and users will have to be added manually.

Most services that you install into a homelab has some sort of health endpoint that you are able to ping to ensure all services are online. So I will likely want to add something like this, that can occasionally ping the services registered to make sure nothing has crashed.

The Spatie SSH package could come in handy here, but that it yet to be decided.

For now, I am gong to end it there, and we will pick this back up once the initial set up has been done. I will likely write a quick post about the setup - explaining what I did and why.