import { z, defineCollection, reference } from "astro:content";

const events = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    year: z.number(),
    location: z.string(),
  }),
});

const hardware = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    spec: z.string(),
    description: z.string(),
  }),
});

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    image: z.string().optional(),
    partner: z.string().optional(),
    source: z.string().optional(),
    pubDate: z.date(),
  }),
});

const services = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    description: z.string(),
  }),
});

const software = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    description: z.string(),
  }),
});

const sponsors = defineCollection({
  type: 'data',
  schema: (({image}) => z.object({
    name: z.string(),
    logo: image(),
    website: z.string(),
  })),
});

const talks = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    type: z.string(),
    image: z.string(),
    events: z.array(reference('events'))
  }),
});

const testimonials = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    role: z.string(),
    company: z.string(),
    avatar: z.string(),
    content: z.string(),
  }),
});

export const collections = {
  events,
  hardware,
  posts,
  services,
  software,
  sponsors,
  talks,
  testimonials,
};
