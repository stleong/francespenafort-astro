import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://francespenafort.com',
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [sitemap()],
  redirects: {
    '/get-a-cert': '/icf-level-1',
    '/programs': '/icf-level-1',
    '/icf-level-1-acc-certification-kuala-lumpur': '/icf-level-1',
    '/about-me': '/about-frances',
    '/podcasts-videos': '/privacy-policy'
  }
});