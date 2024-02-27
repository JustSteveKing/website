import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import partytown from "@astrojs/partytown";
import mdx from "@astrojs/mdx";
import webmanifest from "astro-webmanifest";
import vue from '@astrojs/vue';


import {
  SITE_TITLE,
  SITE_DESCRIPTION,
} from './src/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.juststeveking.uk',
  prefetch: true,
  redirects: {
    "/blog/[...slug]": "/articles/[...slug]"
  },
  integrations: [
    tailwind(),
    partytown(),
    mdx(),
    webmanifest({
      name: SITE_TITLE,
      description: SITE_DESCRIPTION,
      start_url: '/',
      icon: 'public/favicon.svg',
      display: 'standalone',
      theme_color: '#2dd4bf',
      background_color: '#fafafa'
    }),
    vue(),
  ]
});