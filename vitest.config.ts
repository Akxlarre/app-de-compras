import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';
import path from 'path';

export default defineConfig({
  plugins: [angular()],
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, './src/app/core'),
      '@shared': path.resolve(__dirname, './src/app/shared'),
      '@features': path.resolve(__dirname, './src/app/features'),
      '@layout': path.resolve(__dirname, './src/app/layout'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [
      'zone.js',
      'zone.js/testing',
      'src/test-setup.ts',
    ],
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['src/test-setup.ts', '**/*.spec.ts', '**/*.skeleton.*'],
    },
  },
});
