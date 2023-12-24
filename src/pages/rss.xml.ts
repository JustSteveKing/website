import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import {
	SITE_TITLE,
	SITE_DESCRIPTION,
} from './../config'

const posts = await getCollection('posts');

export function GET(context) {
  return rss({
    // `<title>` field in output xml
    title: SITE_TITLE,
    // `<description>` field in output xml
    description: SITE_DESCRIPTION,
    // Pull in your project "site" from the endpoint context
    // https://docs.astro.build/en/reference/api-reference/#contextsite
    site: context.site,
    // Array of `<item>`s in output xml
    // See "Generating items" section for examples using content collections and glob imports
    items: posts.map((post) => ({
			title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      // Compute RSS link from post `slug`
      // This example assumes all posts are rendered as `/articles/[slug]` routes
      link: `/articles/${post.slug}/`,
		})),
    // (optional) inject custom xml
    customData: `<language>en-us</language>`,
  });
}