import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/services/**', 'src/routes/**', 'src/middlewares/**'],
    },
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@pitchdeck/shared-types': '../../packages/shared-types/src/index.ts',
    },
  },
});
