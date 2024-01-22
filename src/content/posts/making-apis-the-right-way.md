---
title: Making APIs the Right Way
pubDate: 2023-10-30
image: making-apis-the-right-way.png
partner: Devto
source: https://dev.to/juststevemcd/making-apis-the-right-way-with-api-platform-565p
description: All you need to know about API Versioning. What is it, what types of versioning exist, how are they used and why you might need it?
---

<iframe class="aspect-video w-full" src="https://www.youtube.com/embed/NpfnnXi1CHI?si=DlDlJkhfNy7DTvfw" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

I have confession to make: Until I recently had the unique chance to live-stream with the creator of API platform, I realized I've been building APIs incorrectly for far too long! Most importantly, this experience made me wish I had used API platform all those years ago. Now, why the hesitation to use it? The answer lies in an underlying misconception.

## Busting The Misconception: PHP vs Symfony

The most common misunderstanding about API platform usually stems from the belief that you need in-depth knowledge of Symfony to get started. This couldn’t be further from the truth. The reality is that API platform is fundamentally based on PHP. How it is delivered? Now that's where Symfony hops in. So the directionality matters, the API platform is not Symfony's extension, rather Symfony facilitates the delivery of the API platform.

## Anatomy of an API Platform Project

If you peek into the API source entities, you find that the platform offers full Create, Read, Update, and Delete (CRUD) functionalities right out of the box. No additional segments are required. 

## Winning Factor: Ease of Use

Simplicity and efficiency are what ultimately won me over to API platform. With just three or four commands, you're up, running, and ready to launch your API. Couple more commands, and you have some highly functional endpoints up for grabs. Just a tad bit of effort, and you're all set. No further actions required.

## Sticking Points: Remembering the Commands

Being a Laravel developer, I’m accustomed to “PHP artisan this” and “PHP artisan that,” so the challenge of API platform comes from remembering its different command formats. In the API platform, tasks are executed in Docker using a Symfony console, akin to how it is done in Laravel - We are calling different things. The differentiation lies in the command usage.

## Final Thoughts: Why Not API Platform?

So, circling back to our original question - Why aren't you using API platform yet? Is it because you, like me, once erroneously believed it required solid Symfony knowledge to start?

> If that's the case, let me tell you: it is not.

API Platform is a robust, user-friendly environment that makes building APIs in PHP an absolute breeze. So let's try and use API platform more, because if you're crafting an API in PHP, you've got no excuse to not use API Platform.
