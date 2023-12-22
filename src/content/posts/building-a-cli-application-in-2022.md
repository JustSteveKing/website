---
title: Building a CLI application in 2022
pubDate: 2022-05-27
image: building-a-cli-application-in-2022.png
description: Explore the best options for building CLI apps in 2022, including Laravel Zero, Symfony Console, and more, suitable for both PHP and Rust developers.
---

I have been building CLI apps for a long time, from simple bash/perl scripts back when I was a System Admin - and now using things like PHP Go or Rust. Let's walk through options for building CLI apps in 2022

Let's be honest, not all of the options are easy to get started with and some of them require you to know or learn a new language - and that can be daunting! As a PHP developer mainly, my instinct is usually to go straight for a PHP CLI app as I know it is installed at the right version on my machine - and the developers I work with I know they will also have a similar set up. So it is usually a safe bet to just use PHP. However, it isn't always the right choice!

Time to dig in and see what is available for us to use in 2022.

## Laravel Zero (PHP)

![Laravel Zero](https://laravel-zero.com/assets/img/logo-large.png)

If you are in the Laravel world, then you have most likely heard of [Laravel Zero](https://laravel-zero.com/), it is pretty awesome and it very familiar if you are used to working with Laravel itself. To get started all you need to do is use composer create-project and you are good to get going! It is set up for you, with very minimal work needed (beyond renaming your app with one command), and can be built for distributing relatively easily.

There are "apps" available, which basically lets you add additional Laravel behaviour into the CLI micro-framework by installing additional components, such as Database, Http etc etc. So it is very extendable!

Building a CLI application in Laravel Zero is pretty simple, it is very much like writing console commands in Laravel itself. There is next to no difference beyond that, other than you do not run `php artisan` you run `php {your-app-name}` - something that might take you a little time to get used to.


## Symfony Console (PHP)

![Symfony Console ](https://miro.medium.com/max/1400/1*_vwwl1HhdAQ8jPdPHkRs3A.jpeg)

Let's be honest for a moment, both Laravel Zero and Laravels artisan console is based off of the [Symfony Console Component](https://symfony.com/doc/current/components/console.html) which is one of the reasons they are so good. So we cannot forget to metion this one, it just wouldn't be right would it. It is the defacto standard when it comes to console applications in PHP - a standard we all expect and aim for. It is without a doubt, powerful and extendable. There is a simple approach to installing, however it isn't templated like Laravel Zero is - it leaves that part up to you. Some people might like this approach, others perhaps not.

It goes without saying that the Symfony Console Component is good, but the developer experience is lacking compared to something like Laravel Zero. This isn't an opinion, it is a fact. The development experience in the Laravel ecosystem is focused on being good, it is why Laravel is so popular. That doesn't mean you shouldn't use this CLI app though, it is more lightweight than Laravel Zero. It is more a measure of what is important to you, and what you are more comfortable with.

## Minicli (PHP)

![Minicli](https://pbs.twimg.com/card_img/1528920124417261573/HlrzKLDO?format=jpg&name=900x900)

I can't talk about PHP CLI application without mentioning this awesome, lightweight package by [Erika Heidi](https://github.com/erikaheidi). Minicli has been around for a little while now, and was Erikas approach at building a CLI application with zero dependencies, just using native PHP. It is quite an achievement, and there has been a lot of thought and work gone into this framework. It isn't as polished as others like Symfony Console is, but it is a lot lighter and faster because of it.

If I am building a utility tool, that doesn't require any sort of framework then this is my go to. If I just want to take user input, fetch data from an API and display some information - this is what I use. Also, it is themeable! 

There isn't too much to say about [Minicli](https://docs.minicli.dev/en/latest/) - it is what you use when you feel like you need to declutter your head from dependency nightmares and just build a CLI app. It is simple to use and build upon, and there is a sample application you can use as a template to get started. If you are looking for a fast, dependency free cli application that is better than just running PHP scripts manually - this is for you. 

## Wena (Rust)

![Wena](https://raw.githubusercontent.com/wena-cli/wena/main/art/logo.png)

This project is very new and is brought to us by [Nuno Maduro](https://github.com/nunomaduro) from the Laravel team. Recently he has been learning Rust, and has built a CLI framework. It is still classed as a work in progress, but it has a lot of promise. If you do not know Nuno, then you really should. He is the original author of so many CLI application and tools that his experience is going to make [Wena](https://github.com/wena-cli/wena) a very good CLI framework to use.

Now when I first started learning Rust, it was quite intimidating as a language. It felt strange to write and use - the syntax took me awhile to get used to. I always say that it takes me awhile to get into "rust mode". However, looking through the documentation of Wena - it is a lot nicer to approach. As it is still quite new, there isn't too much that can be said about it, however it is definitely one to consider if you are using or learning Rust. I always find CLI apps are great for learning a language, so why not dip your toe?

## Seahorse (Rust)

![Seahorse](https://repository-images.githubusercontent.com/226840735/d3e77500-51a0-11ea-845e-3cc87714278b)

There aren't that many CLI frameworks in the Rust world. There are some amazing argument parsers, but it appears that the Rust community is at the stage PHP was years ago where everyone implemented there own packages to fit their standard. This isn't exactly a bad thing, it means that there is a lot of creativity to be had and standards to find. It isn't hard to build your own CLI application in Rust itself, but if you aren't used to the language or the most confident with it - then it is best to look for a framework.

[Seahorse](https://docs.rs/seahorse/latest/seahorse/) is built by [Keisuke Toyota](https://github.com/ksk001100) and the documentation seems a little light, however it also looks like a very straight forward framework to use. It is very similar to how Wena works, you can add multiple commands or single command applications really easily. Again, this framework makes working with CLI applications in Rust less intimidating - which is always a plus in my eyes.

## Cobra (Go)

![Cobra](https://cloud.githubusercontent.com/assets/173412/10886352/ad566232-814f-11e5-9cd0-aa101788c117.png)

Cobra is a cli framework written in Go, and is one I have used personally. It is relatively simple to use, especially if you are used to writting Go itself. It is super simple to install and get started with, and there is also a generator you can use to get started if you find that approach easier. There is extensive documentation, and a lot of CLI apps you might know of or use, actually uses this package. Tools such as Hugo, Kubernetes, and the GitHub CLI tool are all built using this library, so as you can imagine it is stable, and can be used on any platform.

The beauty of Go CLI apps, is that they can be built for any target operating system. As a framwork [Cobra](https://cobra.dev/) is easy to get started with, and easy to build for releases. I would go as far as saying that if I were to build a CLI application today, I would use Cobra - because it is fast, nice to build with, and super simple to build releases for.

