import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/super/", "/login", "/invite/"],
      },
    ],
    sitemap: "https://restaurantos.com.br/sitemap.xml",
  };
}
