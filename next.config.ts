import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '5mb' },
  },
  serverExternalPackages: ['pdfkit'],
};

export default nextConfig;
