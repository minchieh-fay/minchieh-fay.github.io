import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://minchieh-fay.github.io',
  output: 'static',
  markdown: {
    shikiConfig: {
      theme: 'github-light'
    }
  }
});
