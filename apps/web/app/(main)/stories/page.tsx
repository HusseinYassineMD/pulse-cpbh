import { redirect } from "next/navigation";

export default function StoriesPage() {
  redirect("/board?tab=stories");
}
