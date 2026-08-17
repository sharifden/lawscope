import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';

// Modern Keystatic admin runs alongside Lawscope's existing static build.
// Lawscope's public site still builds via `npm run build` -> generated/ (Vercel)
// Keystatic admin runs via `npm run keystatic:dev` -> http://localhost:4321/keystatic
// No conflict: Astro only serves /keystatic in dev; production build excludes it.

const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  // Astro content is not used for Lawscope public pages — keep src minimal
  srcDir: './src',
  integrations: [
    react(),
    // Disable Keystatic in production builds so `npm run build` (lawscope) isn't affected
    ...(isProd ? [] : [keystatic()]),
  ],
  server: { port: 4321, host: '0.0.0.0', allowedHosts: true },
  vite: { server: { allowedHosts: true } },
});
