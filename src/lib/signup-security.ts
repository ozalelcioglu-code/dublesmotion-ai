import { sql } from "./db";

type EventType =
  | "signup_success"
  | "signup_blocked_ip_limit"
  | "signup_blocked_fingerprint_limit"
  | "signup_blocked_cooldown"
  | "signup_blocked_disposable_email"
  | "signup_attempt";

export async function logSignupSecurityEvent(params: {
  email?: string;
  ipAddress: string;
  fingerprint?: string;
  userAgent?: string;
  eventType: EventType;
  riskLevel?: "low" | "medium" | "high";
  reason?: string;
}) {
  await sql`
    insert into signup_security_events
    (
      email,
      ip_address,
      fingerprint,
      user_agent,
      event_type,
      risk_level,
      reason
    )
    values
    (
      ${params.email || null},
      ${params.ipAddress},
      ${params.fingerprint || null},
      ${params.userAgent || null},
      ${params.eventType},
      ${params.riskLevel || null},
      ${params.reason || null}
    )
  `;
}

export async function countRecentByIp(ipAddress: string, days = 30) {
  const since = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000
  ).toISOString();

  const rows = await sql`
    select count(*)::int as count
    from signup_security_events
    where ip_address = ${ipAddress}
      and event_type = 'signup_success'
      and created_at >= ${since}::timestamptz
  `;

  return rows[0]?.count ?? 0;
}

export async function countRecentByFingerprint(
  fingerprint: string,
  days = 30
) {
  const since = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000
  ).toISOString();

  const rows = await sql`
    select count(*)::int as count
    from signup_security_events
    where fingerprint = ${fingerprint}
      and event_type = 'signup_success'
      and created_at >= ${since}::timestamptz
  `;

  return rows[0]?.count ?? 0;
}

export async function countRecentAttemptsByIp(ipAddress: string, minutes = 30) {
  const since = new Date(
    Date.now() - minutes * 60 * 1000
  ).toISOString();

  const rows = await sql`
    select count(*)::int as count
    from signup_security_events
    where ip_address = ${ipAddress}
      and created_at >= ${since}::timestamptz
  `;

  return rows[0]?.count ?? 0;
}

export async function evaluateSignupRisk(params: {
  ipAddress: string;
  fingerprint: string;
}) {
  const [ipSignupCount, fingerprintSignupCount, recentAttemptCount] =
    await Promise.all([
      countRecentByIp(params.ipAddress, 30),
      countRecentByFingerprint(params.fingerprint, 30),
      countRecentAttemptsByIp(params.ipAddress, 30),
    ]);

  if (ipSignupCount >= 3) {
    return {
      allowed: false,
      code: "IP_SIGNUP_LIMIT_REACHED",
      riskLevel: "high" as const,
      reason:
        "Aynı IP üzerinden son 30 gün içinde maksimum kayıt sınırına ulaşıldı.",
    };
  }

  if (fingerprintSignupCount >= 2) {
    return {
      allowed: false,
      code: "FINGERPRINT_SIGNUP_LIMIT_REACHED",
      riskLevel: "high" as const,
      reason:
        "Aynı cihaz/fingerprint üzerinden son 30 gün içinde maksimum kayıt sınırına ulaşıldı.",
    };
  }

  if (recentAttemptCount >= 8) {
    return {
      allowed: false,
      code: "SIGNUP_COOLDOWN_ACTIVE",
      riskLevel: "medium" as const,
      reason:
        "Bu IP üzerinden kısa süre içinde çok fazla kayıt denemesi yapıldı.",
    };
  }

  return {
    allowed: true,
    code: "OK",
    riskLevel: "low" as const,
    reason: "",
  };
}