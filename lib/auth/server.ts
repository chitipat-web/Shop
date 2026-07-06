import { createNeonAuth } from "@neondatabase/auth/next/server";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    // Lax so the OAuth challenge cookie survives the cross-site redirect
    // back from Google/Neon; Strict (the default) drops it and the
    // session exchange never happens.
    sameSite: "lax",
  },
});
