import type { SessionUser } from "@/provider/SessionProvider";

export function buildSessionHeaders(user: SessionUser | null) {
  if (!user) {
    return {
      "Content-Type": "application/json",
    };
  }

  return {
    "Content-Type": "application/json",
    "x-user-id": user.id,
    "x-user-email": user.email,
    "x-user-name": user.name,
  };
}