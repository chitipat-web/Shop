import { auth } from "@/lib/auth/server";

export default auth.middleware({
  loginUrl: "/auth/sign-in",
});

export const config = {
  matcher: [
    // Protect everything except auth routes and static assets.
    "/((?!api/auth|auth|_next/static|_next/image|manifest\\.json|icon\\.svg|favicon\\.ico).*)",
  ],
};
