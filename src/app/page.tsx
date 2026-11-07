import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const instant = false;

export default async function RootPage() {
  const session = await auth();
  redirect(session ? "/dashboard" : "/login");
}