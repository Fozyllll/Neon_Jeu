import { defineConfig } from 'vitest/config';

// base "./" : les chemins restent relatifs, la build fonctionne donc sur GitHub Pages
// quel que soit le nom du dépôt (https://<user>.github.io/<repo>/).
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
