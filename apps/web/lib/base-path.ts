export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function assetPath(path: string): string {
  if (!path.startsWith("/")) return path;
  return `${BASE_PATH}${path}`;
}

export const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
