import { redirect } from "next/navigation";

export default function PostsPage() {
  redirect("/board?tab=posts");
}
