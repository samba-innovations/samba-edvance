import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '5mb' },
    // Limita workers de pré-renderização — evita múltiplos pools Prisma em build
    workerThreads: false,
    cpus: 1,
  },
  serverExternalPackages: ['pdfkit'],
};

export default nextConfig;
