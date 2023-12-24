import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import partytown from "@astrojs/partytown";
import prefetch from "@astrojs/prefetch";
import mdx from "@astrojs/mdx";
import compress from "astro-compress";
import webmanifest from "astro-webmanifest";

import {
  SITE_TITLE,
  SITE_DESCRIPTION,
} from './src/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.juststeveking.uk',
  integrations: [
    tailwind(),
    partytown(),
    prefetch(),
    mdx(),
    compress(),
    webmanifest({
      name: SITE_TITLE,
      description: SITE_DESCRIPTION,
      start_url: '/',
      icon: 'public/favicon.svg',
      display: 'standalone',
      theme_color: '#2dd4bf',
      background_color: '#fafafa'
    }),
  ]
});