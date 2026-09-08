import fs from "fs";
import path from "path";

export function generateStaticParams() {
  const file = path.join(process.cwd(), "public/data/posts.json");
  if (!fs.existsSync(file)) return [];
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as { items: { id: string }[] };
  return data.items.map((post) => ({ id: post.id }));
}

export default function PostDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
