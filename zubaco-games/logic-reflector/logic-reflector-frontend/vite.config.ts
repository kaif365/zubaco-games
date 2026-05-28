import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      include: [
        'src/app/**/*.ts',
        'src/app/**/*.tsx',
        'src/components/**/*.tsx',
        'src/hooks/**/*.ts',
        'src/lib/**/*.ts',
        'src/services/**/*.ts',
        'src/types/**/*.ts',
      ],
    },
  },
})
