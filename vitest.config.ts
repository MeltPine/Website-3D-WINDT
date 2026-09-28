import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Page components are rendered to HTML in tests (react-jsx, like tsconfig.app.json).
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 60_000,
  },
});
