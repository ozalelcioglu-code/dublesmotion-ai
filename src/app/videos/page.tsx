import { headers } from "next/headers";
import { redirect } from "next/navigation";
import  AppPageShell  from "../../components/AppPageShell";
import { MyVideosClient } from "../../components/MyVideosClient";
import { listVideosByUserId } from "../../lib/video-repository";
import { auth } from "../../lib/auth";

export const dynamic = "force-dynamic";

function getLanguageFromHeaders(h: Headers) {
  const cookie = h.get("cookie") || "";

  const match = cookie.match(/app-language=(tr|en|de)/);
  if (match) return match[1];

  const accept = h.get("accept-language") || "";

  if (accept.startsWith("tr")) return "tr";
  if (accept.startsWith("de")) return "de";

  return "en";
}

const TEXT = {
  tr: {
    title: "Videolarım",
    subtitle:
      "Hesabınız altında oluşturulan videoları görüntüleyin, oynatın, indirin ve yönetin.",
  },

  en: {
    title: "My Videos",
    subtitle:
      "Browse, play, download, and manage videos created under your account.",
  },

  de: {
    title: "Meine Videos",
    subtitle:
      "Durchsuchen, abspielen, herunterladen und verwalten Sie die unter Ihrem Konto erstellten Videos.",
  },
};

export default async function VideosPage() {
  const h = await headers();

  const session = await auth.api.getSession({
    headers: h,
  });

  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const videos = await listVideosByUserId(userId);

  const lang = getLanguageFromHeaders(h) as "tr" | "en" | "de";
  const t = TEXT[lang];

  return (
    <AppPageShell title={t.title} subtitle={t.subtitle}>
      <MyVideosClient initialVideos={videos as any[]} />
    </AppPageShell>
  );
}