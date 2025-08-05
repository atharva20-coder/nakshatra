import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@node-rs/argon2"],
  images: {
    remotePatterns: [
      // Instagram domains
      {
        protocol: 'https',
        hostname: 'scontent.cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: 'instagram.frpr5-1.fna.fbcdn.net',
      },
      {
        protocol: 'https',
        hostname: 'scontent-iad3-2.cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: 'scontent-iad3-1.cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: '*.cdninstagram.com',
      },
      // Social Media Platforms
      {
        protocol: 'https',
        hostname: '*.fbcdn.net',
      },
      {
        protocol: 'https',
        hostname: '*.twimg.com',
      },
      // Other specific domains
      {
        protocol: 'https',
        hostname: 'img.icons8.com',
      },
      {
        protocol: 'https',
        hostname: 'd365kmhoeske8t.cloudfront.net',
      },
      // Cloud Storage and CDN Providers
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '*.imgix.net',
      },
      {
        protocol: 'https',
        hostname: '*.akamaized.net',
      },
      // Image Hosting Services
      {
        protocol: 'https',
        hostname: '*.imgur.com',
      },
      {
        protocol: 'https',
        hostname: '*.giphy.com',
      },
      // Fallback for any HTTPS domain (use with caution)
      {
        protocol: 'https',
        hostname: '**',
        pathname: '**',
      },
    ],
    // Image optimization configurations
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
