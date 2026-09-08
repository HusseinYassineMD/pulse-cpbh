import fs from "fs";
import path from "path";

export function generateStaticParams() {
  const file = path.join(process.cwd(), "public/data/stories.json");
  if (!fs.existsSync(file)) return [];
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as { items: { id: string }[] };
  return data.items.map((story) => ({ id: story.id }));
}

export default function StoryDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
