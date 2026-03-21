import { NextRequest } from "next/server";
import crypto from "crypto";

export function getClientIp(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function buildRequestFingerprint(input: {
  ip: string;
  userAgent: string;
  acceptLanguage?: string;
  email?: string;
}) {
  return crypto
    .createHash("sha256")
    .update(
      `${input.ip}|${input.userAgent}|${input.acceptLanguage || ""}|${
        input.email || ""
      }`
    )
    .digest("hex")
    .slice(0, 24);
}