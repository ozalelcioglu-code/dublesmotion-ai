"use client";

import { useRouter } from "next/navigation";
import { authClient } from "../lib/auth-client";
import { useSession } from "../provider/SessionProvider";

export default function AccountPanel() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, clearSession } = useSession();

  const handleLogout = async () => {
    try {
      await authClient.signOut();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      clearSession();
      router.replace("/login");
      router.refresh();
    }
  };

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(15,23,42,0.08)",
        borderRadius: 24,
        padding: 16,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 12 }}>
        ACCOUNT
      </div>

      {isLoading ? (
        <div style={{ color: "#64748b", fontSize: 14 }}>Loading...</div>
      ) : isAuthenticated ? (
        <>
          <div style={{ fontSize: 14, color: "#334155", marginBottom: 12 }}>
            {user?.email}
            <br />
            Plan: {user?.planLabel ?? "Free"}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => router.push("/pricing")}>Plans</button>
            <button onClick={handleLogout}>Logout</button>
          </div>
        </>
      ) : (
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => router.push("/login")}>Login</button>
          <button onClick={() => router.push("/pricing")}>Plans</button>
        </div>
      )}
    </div>
  );
}