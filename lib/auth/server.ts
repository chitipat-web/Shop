import { createNeonAuth } from "@neondatabase/auth/next/server";

type NeonAuth = ReturnType<typeof createNeonAuth>;
let cached: NeonAuth | null = null;

function getAuth(): NeonAuth {
  if (!cached) {
    cached = createNeonAuth({
      baseUrl: process.env.NEON_AUTH_BASE_URL!,
      cookies: {
        secret: process.env.NEON_AUTH_COOKIE_SECRET!,
        // Lax so the OAuth challenge cookie survives the cross-site redirect
        // back from Google/Neon; Strict (the default) drops it and the
        // session exchange never happens.
        sameSite: "lax",
      },
    });
  }
  return cached;
}

// Lazy proxy: importing this module must never require the auth env vars,
// because Next evaluates route modules at build time (page-data collection)
// where no secrets exist. Auth is only constructed on first real use.
export const auth = new Proxy({} as NeonAuth, {
  get(_target, prop) {
    return getAuth()[prop as keyof NeonAuth];
  },
});
