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
    // Prevent build from failing because of lint errors in generated files (Prisma)
    ignoreDuringBuilds: true,
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
