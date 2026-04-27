import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'resources.premierleague.com',
        pathname: '/premierleague/photos/players/**',
      },
    ],
  },
};

export default nextConfig;
