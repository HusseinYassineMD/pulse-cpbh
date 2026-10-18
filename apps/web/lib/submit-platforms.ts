export const SUBMIT_PLATFORMS = [
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "linkedin", label: "LinkedIn" },
] as const;

export type SubmitPlatformId = (typeof SUBMIT_PLATFORMS)[number]["id"];
