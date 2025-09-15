import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    optimizeCss: true,
  },
  // Optimize CSS loading
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Optimize CSS and reduce preload warnings
  optimizeFonts: true,
  // Reduce bundle size and improve loading
  swcMinify: true,
  // Configure webpack for better CSS handling
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Optimize CSS chunks
      config.optimization.splitChunks.cacheGroups.styles = {
        name: 'styles',
        test: /\.(css|scss)$/,
        chunks: 'all',
        enforce: true,
      };
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
