"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";

export async function signInWithGoogle() {
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const { data, error } = await auth.signIn.social({
    provider: "google",
    callbackURL: `${origin}/`,
  });
  if (error || !data?.url) {
    redirect("/auth/sign-in?error=1");
  }
  redirect(data.url);
}

export async function signOut() {
  await auth.signOut();
  redirect("/auth/sign-in");
}
