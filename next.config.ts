/** @type {import('next').NextConfig} */
const nextConfig = {
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
  webpack: (config, { isServer }) => {
    // Prevent Webpack from scanning Windows protected folders
    config.snapshot = {
      ...config.snapshot,
      managedPaths: [
        ...(config.snapshot?.managedPaths || []),
        "C:/Users/91860/Cookies",
        "C:/Users/91860/Application Data",
        "C:/Users/91860/AppData",
      ],
    };

    config.watchOptions = {
      ignored: ["**/node_modules", "**/.git", "C:/Users/91860/**"],
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
