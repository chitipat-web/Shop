import { redirect } from "next/navigation";
import { auth } from "./server";
import { getDb } from "@/lib/db";

/** Only these two Google accounts may use the app. */
const PERSON_BY_EMAIL: Record<string, number> = {
  "chitipat.kao@gmail.com": 1,
  "lenghlx1@gmail.com": 2,
};

/** Seeded placeholder names — only these get replaced by the Google name. */
const DEFAULT_NAMES = ["คนที่ 1", "คนที่ 2"];

// Once per server instance per person is enough; manual renames must win.
const nameSynced = new Set<number>();

async function syncNameFromGoogle(personId: number, googleName?: string | null) {
  if (!googleName || nameSynced.has(personId)) return;
  nameSynced.add(personId);
  const db = await getDb();
  const persons = await db.getPersons();
  const me = persons.find((p) => p.id === personId);
  if (me && DEFAULT_NAMES.includes(me.name)) {
    await db.updatePersonName(personId, googleName);
  }
}

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
  await syncNameFromGoogle(personId, session?.user?.name);
  return { personId, email };
}
