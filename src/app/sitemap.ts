import type { MetadataRoute } from "next";

const siteUrl = "https://www.dublesmotion.com";

const routes = [
  "",
  "/chat",
  "/text-to-video",
  "/text-to-image",
  "/image-to-video",
  "/music",
  "/video-clone",
  "/editor",
  "/billing",
  "/login",
  "/register",
  "/history",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : route === "/chat" ? 0.9 : 0.8,
  }));
}
