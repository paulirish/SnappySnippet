import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['lib/tests/browser/**/*.spec.ts'],
});
