import type { Metadata } from "next";
import DeveloperPortalClient from "./DeveloperPortalClient";

export const metadata: Metadata = {
  title: "Developer API",
  description:
    "Create Duble-S Motion API keys and connect AI video, image, music, avatar, and research generation to your own software.",
};

export default function DevelopersPage() {
  return <DeveloperPortalClient />;
}
