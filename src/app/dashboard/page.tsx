import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppPageShell } from "../../components/AppPageShell";
import { DashboardClient } from "../../components/DashboardClient";
import { auth } from "../../lib/auth";
import {
  ensureUserProfile,
  getResolvedUserPlan,
} from "../../lib/user-profile-repository";
import { getDashboardStats } from "../../lib/dashboard-repository";

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
    title: "Panel",
    subtitle:
      "Planınızı, aylık kullanımınızı, kalan kredilerinizi ve son oluşturulan videoları takip edin.",
  },

  en: {
    title: "Dashboard",
    subtitle:
      "Track your plan, monthly usage, remaining credits, and recently generated videos.",
  },

  de: {
    title: "Dashboard",
    subtitle:
      "Verfolgen Sie Ihren Plan, die monatliche Nutzung, verbleibende Credits und zuletzt generierte Videos.",
  },
};

export default async function DashboardPage() {
  const h = await headers();

  const session = await auth.api.getSession({
    headers: h,
  });

  const userId = session?.user?.id;
  const userEmail = session?.user?.email;
  const userName = session?.user?.name;

  if (!userId || !userEmail) {
    redirect("/login");
  }

  await ensureUserProfile({
    userId,
    email: userEmail,
    fullName: userName ?? null,
  });

  const planInfo = await getResolvedUserPlan(userId);
  const dashboardStats = await getDashboardStats(userId);

  const lang = getLanguageFromHeaders(h) as "tr" | "en" | "de";

  const t = TEXT[lang];

  return (
    <AppPageShell
      title={t.title}
      subtitle={t.subtitle}
    >
      <DashboardClient
        planLabel={planInfo.planLabel}
        usedThisMonth={planInfo.usedThisMonth}
        remainingCredits={planInfo.remainingCredits}
        maxDurationSec={planInfo.maxDurationSec}
        monthlyVideoLimit={planInfo.monthlyVideoLimit}
        totalVideos={dashboardStats.totalVideos}
        recentVideos={dashboardStats.recentVideos as any[]}
      />
    </AppPageShell>
  );
}