import { redirect } from "next/navigation";
import { auth } from "./server";

/** Only these two Google accounts may use the app. */
const PERSON_BY_EMAIL: Record<string, number> = {
  "chitipat.kao@gmail.com": 1,
  "lenghlx1@gmail.com": 2,
};

export type CurrentUser = { personId: number; email: string };

/**
 * Resolve the signed-in user to person 1 or 2.
 * Redirects to sign-in when logged out, or to /auth/denied for
 * any Google account outside the allowlist.
 */
export async function requireUser(): Promise<CurrentUser> {
  if (process.env.AUTH_DISABLED === "1") {
    return { personId: 1, email: "dev@localhost" };
  }
  const { data: session } = await auth.getSession();
  const email = session?.user?.email?.toLowerCase();
  if (!email) redirect("/auth/sign-in");
  const personId = PERSON_BY_EMAIL[email];
  if (!personId) redirect("/auth/denied");
  return { personId, email };
}
