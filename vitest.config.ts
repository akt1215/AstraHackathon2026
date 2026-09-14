import { defineConfig } from 'vitest/config';

// Each archived prototype owns its dependencies and test runner.
export default defineConfig({
  test: { include: ['{client,server,shared}/**/*.{test,spec}.{js,ts}'] },
});
