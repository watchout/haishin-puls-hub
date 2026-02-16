import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '~': resolve(__dirname, '.'),
      '@': resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    exclude: ['tests/e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: [
        'types/**',
        '**/*.types.ts',
        '**/*.config.*',
        '**/*.d.ts',
        'server/database/migrations/**',
        'server/database/seed.ts',
        '.nuxt/**',
        '.output/**',
      ],
    },
  },
});
