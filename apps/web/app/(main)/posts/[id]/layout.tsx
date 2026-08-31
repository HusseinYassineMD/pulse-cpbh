import { DEMO_POST_IDS } from "@/lib/demo-data";

export function generateStaticParams() {
  return DEMO_POST_IDS.map((id) => ({ id }));
}

export default function PostDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
