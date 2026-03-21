const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "10minutemail.com",
  "guerrillamail.com",
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "yopmail.com",
  "sharklasers.com",
  "grr.la",
  "guerrillamailblock.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamail.biz",
  "fakeinbox.com",
  "trashmail.com",
  "getnada.com",
  "dropmail.me",
  "dispostable.com",
  "mintemail.com",
  "maildrop.cc",
  "moakt.com",
  "tmpmail.org",
  "tempail.com",
  "throwawaymail.com",
  "emailondeck.com",
  "mytemp.email",
]);

export function getEmailDomain(email: string) {
  const normalized = String(email || "").trim().toLowerCase();
  const parts = normalized.split("@");
  if (parts.length !== 2) return "";
  return parts[1].trim();
}

export function isDisposableEmail(email: string) {
  const domain = getEmailDomain(email);
  if (!domain) return false;
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

export function isLikelyInvalidEmail(email: string) {
  const normalized = String(email || "").trim().toLowerCase();

  if (!normalized.includes("@")) return true;

  const [local, domain] = normalized.split("@");

  if (!local || !domain) return true;
  if (!domain.includes(".")) return true;
  if (local.length < 1 || domain.length < 3) return true;

  return false;
}