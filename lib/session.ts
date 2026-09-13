import "server-only";
import { auth } from "@/lib/auth";

export class UnauthorizedError extends Error {}

/** Every API route handling owned data calls this first — there is no global read path. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError("Not signed in");
  }
  return session.user.id;
}
