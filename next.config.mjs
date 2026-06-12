/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from common external sources
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "**" },
    ],
  },

  // Suppress noisy ESM warnings
  experimental: {
    esmExternals: "loose",
  },
};

export default nextConfig;
