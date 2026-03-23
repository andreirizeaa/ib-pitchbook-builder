import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'apps/service/vitest.config.ts',
  'apps/web/vitest.config.ts',
  'apps/powerpoint-addin/vitest.config.ts',
]);
