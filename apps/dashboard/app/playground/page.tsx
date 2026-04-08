import { redirect } from "next/navigation";

export default function PlaygroundIndex() {
  redirect("/dashboard/explorer");
}
