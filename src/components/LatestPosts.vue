<script setup lang="ts">
import type { CollectionEntry } from 'astro:content'

const props = defineProps({
  posts: {
    type: Array<CollectionEntry<'posts'>>,
  }
})

const format = (date: Date): string => {
  return date.toLocaleDateString('en-us', {
    weekday: "long",
    month: "short",
    year: "numeric",
    day: "numeric",
  })
}
</script>

<template>
  <div class="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
    <article v-for="post in props.posts" :key="post.id" class="flex flex-col items-start justify-between">
      <div class="relative w-full">
        <img :src="`/images/articles/${post.data.image}`" alt="" class="aspect-[16/9] w-full rounded-2xl bg-gray-100 object-cover sm:aspect-[2/1] lg:aspect-[3/2]" />
        <div class="absolute inset-0 rounded-2xl ring-1 ring-inset ring-gray-900/10" />
      </div>
      <div class="max-w-xl">
        <div class="flex items-center justify-between gap-x-4 text-xs">
          <time :datetime="post.data.pubDate">{{ format(post.data.pubDate) }}</time>
          <template v-if="post.data.partner">
            <a class="relative z-10 rounded-full px-3 py-1.5 font-medium">
              {{ post.data.partner }}
            </a>
          </template>
          
        </div>
        <div class="group relative">
          <h3 class="font-heading font-bold tracking-tight">
            <a class="text-xl">
              <span class="absolute inset-0" />
              {{ post.data.title }}
            </a>
          </h3>
          <p class="mt-5 line-clamp-3 text-lg leading-7">{{ post.data.description }}</p>
        </div>
      </div>
    </article>
  </div>
</template>
