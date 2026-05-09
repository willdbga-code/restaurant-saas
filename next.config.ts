import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Fix: rotas sem /admin/ prefix → redirect para /admin/*
      { source: "/kds", destination: "/admin/kds", permanent: true },
      { source: "/bar", destination: "/admin/bar", permanent: true },
      { source: "/pdv", destination: "/admin/pdv", permanent: true },
      { source: "/pdv/:path*", destination: "/admin/pdv/:path*", permanent: true },
      { source: "/settings", destination: "/admin/settings", permanent: true },
      { source: "/settings/:path*", destination: "/admin/settings/:path*", permanent: true },
      { source: "/products", destination: "/admin/products", permanent: true },
      { source: "/categories", destination: "/admin/categories", permanent: true },
      { source: "/tables", destination: "/admin/tables", permanent: true },
      { source: "/staff", destination: "/admin/staff", permanent: true },
      { source: "/billing", destination: "/admin/billing", permanent: true },
      { source: "/branding", destination: "/admin/branding", permanent: true },
      { source: "/sales-report", destination: "/admin/sales-report", permanent: true },
    ];
  },
};

export default nextConfig;
