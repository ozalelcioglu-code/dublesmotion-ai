export function canDownloadVideo(userPlan: "free" | "pro", downloadable: boolean) {
  if (userPlan !== "pro") return false;
  return downloadable;
}