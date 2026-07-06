import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";

const neonMiddleware = auth.middleware({
  loginUrl: "/auth/sign-in",
});

// AUTH_DISABLED=1 bypasses login for local UI testing only — never set on Vercel.
const middleware =
  process.env.AUTH_DISABLED === "1" ? () => NextResponse.next() : neonMiddleware;

export default middleware;

export const config = {
  matcher: [
    // Protect everything except auth routes and static assets.
    "/((?!api/auth|auth|_next/static|_next/image|manifest\\.json|icon\\.svg|favicon\\.ico).*)",
  ],
};
