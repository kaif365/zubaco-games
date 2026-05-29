import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@app': path.resolve(__dirname, './src/app'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@services': path.resolve(__dirname, './src/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@features': path.resolve(__dirname, './src/features'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
      '@micro-screens': path.resolve(__dirname, './micro-screens'),
    },
  },
   server: {
    allowedHosts: ['arboricultural-incongrously-kasi.ngrok-free.dev', 't62jx590x0yf.shares.zrok.io', "kvxwmy9xd6u3.shares.zrok.io", "unbilled-maddison-syndetically.ngrok-free.dev"]
  }
});
