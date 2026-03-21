import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getClientIp, buildRequestFingerprint } from "@/lib/request-security";
import {
  evaluateSignupRisk,
  logSignupSecurityEvent,
} from "@/lib/signup-security";
import { sendSecurityAlertEmail } from "@/lib/security-alert";
import {
  isDisposableEmail,
  isLikelyInvalidEmail,
} from "@/lib/email-security";

function getGeoHeaders(req: NextRequest) {
  return {
    country:
      req.headers.get("x-vercel-ip-country") ||
      req.headers.get("cf-ipcountry") ||
      "",
    region: req.headers.get("x-vercel-ip-country-region") || "",
    city: req.headers.get("x-vercel-ip-city") || "",
    referer: req.headers.get("referer") || "",
    origin: req.headers.get("origin") || "",
    host: req.headers.get("host") || "",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(body?.password || "");
    const name = String(body?.name || "").trim();

    if (!email || !password) {
      return NextResponse.json(
        {
          ok: false,
          error: "Email ve şifre zorunlu.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          ok: false,
          error: "Şifre en az 8 karakter olmalı.",
          code: "WEAK_PASSWORD",
        },
        { status: 400 }
      );
    }

    if (isLikelyInvalidEmail(email)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Geçerli bir email adresi girin.",
          code: "INVALID_EMAIL_FORMAT",
        },
        { status: 400 }
      );
    }

    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || "unknown";
    const acceptLanguage = req.headers.get("accept-language") || "";
    const geo = getGeoHeaders(req);

    const fingerprint = buildRequestFingerprint({
      ip,
      userAgent,
      acceptLanguage,
      email,
    });

    if (isDisposableEmail(email)) {
      await logSignupSecurityEvent({
        email,
        ipAddress: ip,
        fingerprint,
        userAgent,
        eventType: "signup_blocked_disposable_email",
        riskLevel: "medium",
        reason: "Disposable email blocked",
      });

      try {
        await sendSecurityAlertEmail({
          timestamp: new Date().toISOString(),
          ip,
          userAgent,
          country: geo.country,
          region: geo.region,
          city: geo.city,
          referer: geo.referer,
          origin: geo.origin,
          host: geo.host,
          page: "signup",
          userName: name,
          userEmail: email,
          plan: "free",
          adminMode: false,
          message: `Disposable email blocked for signup: ${email}`,
          flags: ["disposable_email_blocked"],
          riskLevel: "medium",
          reason: "Disposable or temporary email domain detected.",
          fingerprint,
        });
      } catch (mailError) {
        console.error("Disposable email alert failed:", mailError);
      }

      return NextResponse.json(
        {
          ok: false,
          error:
            "Geçici veya tek kullanımlık email adresleriyle kayıt yapılamaz.",
          code: "DISPOSABLE_EMAIL_BLOCKED",
        },
        { status: 400 }
      );
    }

    await logSignupSecurityEvent({
      email,
      ipAddress: ip,
      fingerprint,
      userAgent,
      eventType: "signup_attempt",
      riskLevel: "low",
      reason: "Signup request received",
    });

    const risk = await evaluateSignupRisk({
      ipAddress: ip,
      fingerprint,
    });

    if (!risk.allowed) {
      const blockedEventType =
        risk.code === "IP_SIGNUP_LIMIT_REACHED"
          ? "signup_blocked_ip_limit"
          : risk.code === "FINGERPRINT_SIGNUP_LIMIT_REACHED"
          ? "signup_blocked_fingerprint_limit"
          : "signup_blocked_cooldown";

      await logSignupSecurityEvent({
        email,
        ipAddress: ip,
        fingerprint,
        userAgent,
        eventType: blockedEventType,
        riskLevel: risk.riskLevel,
        reason: risk.reason,
      });

      try {
        await sendSecurityAlertEmail({
          timestamp: new Date().toISOString(),
          ip,
          userAgent,
          country: geo.country,
          region: geo.region,
          city: geo.city,
          referer: geo.referer,
          origin: geo.origin,
          host: geo.host,
          page: "signup",
          userName: name,
          userEmail: email,
          plan: "free",
          adminMode: false,
          message: `Blocked signup attempt for ${email}`,
          flags: [risk.code],
          riskLevel: risk.riskLevel,
          reason: risk.reason,
          fingerprint,
        });
      } catch (mailError) {
        console.error("Security alert email failed:", mailError);
      }

      return NextResponse.json(
        {
          ok: false,
          error:
            risk.code === "IP_SIGNUP_LIMIT_REACHED"
              ? "Bu ağ üzerinden oluşturulabilecek maksimum hesap sayısına ulaşıldı."
              : risk.code === "FINGERPRINT_SIGNUP_LIMIT_REACHED"
              ? "Bu cihaz üzerinden oluşturulabilecek maksimum hesap sayısına ulaşıldı."
              : "Kısa süre içinde çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.",
          code: risk.code,
        },
        { status: 429 }
      );
    }

    // Better Auth server-side signup
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    });

    await logSignupSecurityEvent({
      email,
      ipAddress: ip,
      fingerprint,
      userAgent,
      eventType: "signup_success",
      riskLevel: "low",
      reason: "Signup completed successfully",
    });

    return NextResponse.json({
  ok: true,
  user: result?.user ?? null,
  requiresEmailVerification: true,
  message: "Kayıt oluşturuldu. Devam etmek için email adresinizi doğrulayın.",
});
  } catch (error: any) {
    console.error("signup route error:", error);

    const message =
      typeof error?.message === "string" && error.message.trim()
        ? error.message
        : "Kayıt başarısız oldu.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
        code: "SIGNUP_FAILED",
      },
      { status: 400 }
    );
  }
}