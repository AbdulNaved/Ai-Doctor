import type { NextConfig } from "next";
import type { Configuration as WebpackConfig } from "webpack";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "localhost" },
      { hostname: "randomuser.me" },
      { hostname: "images.unsplash.com" },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack(config: WebpackConfig) {
    config.watchOptions = {
      ignored: [
        "**/node_modules",
        "**/.git",
        "C:/Users/91860/Application Data/**",
      ],
    };

    return config;
  },
};

export default nextConfig;

// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   images: {
//     remotePatterns: [
//       { hostname: "localhost" },
//       { hostname: "randomuser.me" },
//       { hostname: "images.unsplash.com" },
//     ],
//   },
// };

// export default nextConfig;
