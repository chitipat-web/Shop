import { auth } from "@/lib/auth/server";

// Resolved per-request instead of at module scope, so evaluating this route
// at build time never constructs the auth client (no env vars there).
type Handlers = ReturnType<typeof auth.handler>;

export const GET = (...args: Parameters<Handlers["GET"]>) =>
  auth.handler().GET(...args);
export const POST = (...args: Parameters<Handlers["POST"]>) =>
  auth.handler().POST(...args);
