import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://senadda.id',
  output: 'server',
  adapter: cloudflare(),
  devToolbar: {
    enabled: false
  },
  vite: {
    server: {
      allowedHosts: true
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler'
        }
      }
    }
  },
  integrations: [
    sitemap({
      filter: (page) => page === 'https://senadda.id/'
    })
  ]
});
