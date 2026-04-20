export type UserPlan = "free" | "starter" | "pro" | "agency";

export type ChatAccess = {
  canUseLiveWeb: boolean;
  canUseDeepResearch: boolean;
  canUseProjectAgent: boolean;
  canEditProjectFiles: boolean;
  canUseVoiceMode: boolean;
  maxWebQueriesPerThread: number;
  liveWebCreditCost: number;
  deepResearchCreditCost: number;
  projectAgentReadCreditCost: number;
  projectAgentEditCreditCost: number;
  maxAgentSteps: number;
  maxProjectFileReads: number;
  maxProjectFileWrites: number;
  maxProjectFileLists: number;
  maxToolOutputChars: number;
  canHandleHeavyTasks: boolean;
};

export function resolveUserPlan(planCode?: string | null): UserPlan {
  if (!planCode) return "free";

  if (planCode === "starter") return "starter";
  if (planCode === "pro") return "pro";
  if (planCode === "agency") return "agency";

  return "free";
}

export function getChatAccess(planCode?: string | null): ChatAccess {
  const plan = resolveUserPlan(planCode);

  switch (plan) {
    case "free":
      return {
        canUseLiveWeb: true,
        canUseDeepResearch: false,
        canUseProjectAgent: false,
        canEditProjectFiles: false,
        canUseVoiceMode: false,
        maxWebQueriesPerThread: 3,
        liveWebCreditCost: 2,
        deepResearchCreditCost: 0,
        projectAgentReadCreditCost: 0,
        projectAgentEditCreditCost: 0,
        maxAgentSteps: 0,
        maxProjectFileReads: 0,
        maxProjectFileWrites: 0,
        maxProjectFileLists: 0,
        maxToolOutputChars: 8_000,
        canHandleHeavyTasks: false,
      };

    case "starter":
      return {
        canUseLiveWeb: true,
        canUseDeepResearch: false,
        canUseProjectAgent: false,
        canEditProjectFiles: false,
        canUseVoiceMode: true,
        maxWebQueriesPerThread: 8,
        liveWebCreditCost: 2,
        deepResearchCreditCost: 0,
        projectAgentReadCreditCost: 0,
        projectAgentEditCreditCost: 0,
        maxAgentSteps: 0,
        maxProjectFileReads: 0,
        maxProjectFileWrites: 0,
        maxProjectFileLists: 0,
        maxToolOutputChars: 10_000,
        canHandleHeavyTasks: false,
      };

    case "pro":
      return {
        canUseLiveWeb: true,
        canUseDeepResearch: true,
        canUseProjectAgent: true,
        canEditProjectFiles: true,
        canUseVoiceMode: true,
        maxWebQueriesPerThread: 15,
        liveWebCreditCost: 2,
        deepResearchCreditCost: 10,
        projectAgentReadCreditCost: 10,
        projectAgentEditCreditCost: 25,
        maxAgentSteps: 10,
        maxProjectFileReads: 20,
        maxProjectFileWrites: 5,
        maxProjectFileLists: 10,
        maxToolOutputChars: 16_000,
        canHandleHeavyTasks: true,
      };

    case "agency":
      return {
        canUseLiveWeb: true,
        canUseDeepResearch: true,
        canUseProjectAgent: true,
        canEditProjectFiles: true,
        canUseVoiceMode: true,
        maxWebQueriesPerThread: 50,
        liveWebCreditCost: 2,
        deepResearchCreditCost: 10,
        projectAgentReadCreditCost: 10,
        projectAgentEditCreditCost: 25,
        maxAgentSteps: 30,
        maxProjectFileReads: 100,
        maxProjectFileWrites: 25,
        maxProjectFileLists: 40,
        maxToolOutputChars: 30_000,
        canHandleHeavyTasks: true,
      };

    default:
      return {
        canUseLiveWeb: true,
        canUseDeepResearch: false,
        canUseProjectAgent: false,
        canEditProjectFiles: false,
        canUseVoiceMode: false,
        maxWebQueriesPerThread: 3,
        liveWebCreditCost: 2,
        deepResearchCreditCost: 0,
        projectAgentReadCreditCost: 0,
        projectAgentEditCreditCost: 0,
        maxAgentSteps: 0,
        maxProjectFileReads: 0,
        maxProjectFileWrites: 0,
        maxProjectFileLists: 0,
        maxToolOutputChars: 8_000,
        canHandleHeavyTasks: false,
      };
  }
}
