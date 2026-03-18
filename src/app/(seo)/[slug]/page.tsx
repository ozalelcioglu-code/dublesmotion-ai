import { seoPages } from "@/lib/seo-pages";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return seoPages.map((page) => ({
    slug: page.slug,
  }));
}

export default function SeoPage({
  params,
}: {
  params: { slug: string };
}) {
  const page = seoPages.find((p) => p.slug === params.slug);

  if (!page) return notFound();

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 40 }}>
      <h1>{page.title}</h1>

      <p>{page.description}</p>

      <h2>Generate videos with AI</h2>

      <p>
        Duble-S Motion AI allows you to create cinematic marketing
        videos using artificial intelligence.
      </p>

      <h2>How it works</h2>

      <ul>
        <li>Write a prompt</li>
        <li>AI generates scenes</li>
        <li>Scenes are rendered into video</li>
      </ul>

      <a href="/">Start creating AI videos</a>
    </main>
  );
}