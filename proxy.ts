import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";

const neonMiddleware = auth.middleware({
  loginUrl: "/auth/sign-in",
});

// AUTH_DISABLED=1 bypasses login for local UI testing only — never set on Vercel.
export default async function proxy(request: NextRequest) {
  if (process.env.AUTH_DISABLED === "1") return NextResponse.next();
  if (request.method === "GET" || request.method === "HEAD") {
    return neonMiddleware(request);
  }
  // The Neon Auth middleware forwards the incoming HTTP method to its
  // get-session upstream call, which only accepts GET — so POSTs (form
  // submits / server actions) always bounce to the login page even with
  // a valid session. Run the session check against a GET clone instead.
  const getClone = new NextRequest(request.url, {
    method: "GET",
    headers: request.headers,
  });
  return neonMiddleware(getClone);
}

export const config = {
  matcher: [
    // Protect everything except auth routes and static assets.
    "/((?!api/auth|auth|_next/static|_next/image|manifest\\.json|icon\\.svg|favicon\\.ico).*)",
  ],
};
