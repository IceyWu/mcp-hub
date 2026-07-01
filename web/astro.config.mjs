// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  i18n: {
    defaultLocale: 'zh-CN',
    locales: ['zh-CN', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
