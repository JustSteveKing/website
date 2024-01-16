<script setup lang="ts">
import type { CollectionEntry } from 'astro:content'

const props = defineProps({
  posts: {
    type: Array<CollectionEntry<'posts'>>,
  }
})
</script>

<script lang="ts">
export default {
  methods: {
    format(date: Date): string {
      return date.toLocaleDateString('en-us', {
        weekday: "long",
        month: "short",
        year: "numeric",
        day: "numeric",
      })
    },
    datetime(date: Date): string {
      return date.toISOString()
    }
  }
}
</script>

<template>
  <div class="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
    <article v-for="post in posts" :key="post.id" class="flex flex-col items-start justify-start">
      <a :href="`/articles/${post.slug}`" class="relative w-full">
        <img
          :src="`/images/articles/${post.data.image}`"
          alt="" class="aspect-[16/9] w-full rounded-2xl object-cover sm:aspect-[2/1] lg:aspect-[3/2]">
      </a>
      <div class="max-w-xl space-y-4">
        <div class="mt-8 flex items-center gap-x-4 text-xs">
          <time datetime="{{ datetime(post.data.pubDate) }}">{{ format(post.data.pubDate) }}</time>
          <a :href="`/articles/${post.slug}`" class="relative z-10 rounded-full px-3 py-1.5 font-medium">
            {{ post.data.partner ? post.data.partner : 'original' }}
          </a>
        </div>
        <div class="group">
          <h3 class="text-lg font-semibold leading-6">
            <a :href="`/articles/${post.slug}`">
              {{ post.data.title }}
            </a>
          </h3>
          <p class="text-sm leading-6">
            {{ post.data.description }}
          </p>
        </div>
    </div>
  </article>
</div>
</template>
