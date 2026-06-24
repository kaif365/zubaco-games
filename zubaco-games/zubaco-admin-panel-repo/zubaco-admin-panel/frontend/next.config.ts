import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  env: {
    API_BASE_URL: process.env.API_BASE_URL,
  },
  allowedDevOrigins: [
    'average-thieving-vitally.ngrok-free.dev',
    'sybil-nonmetaphorical-unspirally.ngrok-free.',
  ],
};

export default nextConfig;
