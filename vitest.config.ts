import { defineConfig } from 'vitest/config';

export default defineConfig({
  css: {
    // Disable PostCSS processing in tests to avoid Tailwind v4 plugin issues
    postcss: { plugins: [] },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
});
