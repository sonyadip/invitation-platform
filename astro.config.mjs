import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://senadda.id',
  output: 'server',
  adapter: cloudflare(),
  integrations: [
    sitemap({
      filter: (page) => page === 'https://senadda.id/'
    })
  ]
});
