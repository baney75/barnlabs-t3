import NextAuth from "next-auth";
import { cache } from "react";

import { authConfig } from "./config";

const { auth: uncachedAuth, handlers, signIn, signOut } = NextAuth(authConfig);

const auth = cache(uncachedAuth);

export { auth, handlers, signIn, signOut };

export async function getRequiredSession() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function getRequiredRole(requiredRole: "ADMIN" | "EMPLOYEE") {
  const session = await getRequiredSession();
  const role = (session.user as { role?: "USER" | "EMPLOYEE" | "ADMIN" } | undefined)?.role;
  if (requiredRole === "ADMIN") {
    if (role !== "ADMIN") throw new Error("FORBIDDEN");
  } else {
    if (!(role === "EMPLOYEE" || role === "ADMIN")) throw new Error("FORBIDDEN");
  }
  return session;
}
