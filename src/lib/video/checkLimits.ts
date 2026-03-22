type UserPlan = "free" | "pro";

export function checkVideoLimits(userPlan: UserPlan, totalDurationSec: number) {
  if (userPlan === "free") {
    if (totalDurationSec > 10) {
      throw new Error("Free kullanıcılar en fazla 10 saniyelik video oluşturabilir.");
    }

    return {
      allowed: true,
      mode: "free",
      downloadable: false,
      isPaid: false,
    };
  }

  if (userPlan === "pro") {
    if (totalDurationSec > 30) {
      throw new Error("Pro kullanıcılar en fazla 30 saniyelik video oluşturabilir.");
    }

    return {
      allowed: true,
      mode: "pro",
      downloadable: true,
      isPaid: true,
    };
  }

  throw new Error("Geçersiz kullanıcı planı.");
}