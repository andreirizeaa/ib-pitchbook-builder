import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    reporters: ['default', 'html'],
    outputFile: { html: './test-report/index.html' },
    testTimeout: 10000,
  },
});
