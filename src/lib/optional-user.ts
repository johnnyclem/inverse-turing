import { createMiddleware } from "@tanstack/react-start";

/**
 * Forwards the live-preview bearer and resolves a user id when present.
 * Unlike authMiddleware, signed-out callers are allowed (userId = null).
 */
export const optionalUserMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getBearerToken } = await import("@/lib/auth/client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const user = await getSessionUser(context.bearerToken);
    return next({ context: { userId: user?.id ?? null } });
  });
