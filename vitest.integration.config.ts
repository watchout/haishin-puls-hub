import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
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
