/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bullmq"],
  },
};

export default nextConfig;
