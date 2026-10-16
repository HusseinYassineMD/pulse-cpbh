/** Default is the 3-step student/review/schedule flow. Set NEXT_PUBLIC_FULL_UI=true for the full product nav. */
export function isSimpleUi(): boolean {
  return process.env.NEXT_PUBLIC_FULL_UI !== "true";
}
