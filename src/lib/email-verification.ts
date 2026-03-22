export function getVerificationRolloutDate() {
  const raw = process.env.EMAIL_VERIFICATION_REQUIRED_FROM;

  if (!raw) {
    return null;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export function resolveRawEmailVerified(user: any) {
  if (typeof user?.emailVerified === "boolean") {
    return user.emailVerified;
  }

  if (typeof user?.email_verified === "boolean") {
    return user.email_verified;
  }

  if (user?.emailVerifiedAt || user?.email_verified_at) {
    return true;
  }

  return false;
}

export function isGrandfatheredUser(user: any) {
  const rolloutDate = getVerificationRolloutDate();
  if (!rolloutDate) {
    return false;
  }

  const createdAtRaw = user?.createdAt || user?.created_at;
  if (!createdAtRaw) {
    return false;
  }

  const createdAt = new Date(createdAtRaw);
  if (Number.isNaN(createdAt.getTime())) {
    return false;
  }

  return createdAt < rolloutDate;
}

export function resolveEffectiveEmailVerified(user: any) {
  if (isGrandfatheredUser(user)) {
    return true;
  }

  return resolveRawEmailVerified(user);
}