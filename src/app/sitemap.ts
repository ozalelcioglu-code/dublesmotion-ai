import { seoPages } from "@/lib/seo-pages";

export default function sitemap() {
  const baseUrl = "https://dublesmotion.com";

  const pages = seoPages.map((page) => ({
    url: `${baseUrl}/${page.slug}`,
  }));

  return [
    {
      url: baseUrl,
    },
    ...pages,
  ];
}