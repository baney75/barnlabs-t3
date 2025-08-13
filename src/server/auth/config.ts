import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

import { db } from "~/server/db";
import { env } from "~/env";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role?: "USER" | "EMPLOYEE" | "ADMIN";
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
const providers = [
  // Conditionally include Google only if configured
  ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? [
        Google({
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        }),
      ]
    : []),
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (credentials) => {
      const email = credentials?.email as string | undefined;
      const password = credentials?.password as string | undefined;
      if (!email || !password) return null;
      const user = await db.user.findUnique({
        where: { email },
      });
      if (!user?.passwordHash) return null;
      const valid = await compare(password, user.passwordHash);
      if (!valid) return null;
      return { id: user.id, name: user.name, email: user.email };
    },
  }),
] as NextAuthConfig["providers"];

export const authConfig = {
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  providers,
  adapter: PrismaAdapter(db),
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Persist custom fields on the token
        (token as Record<string, unknown>).role = (
          user as unknown as { role?: "USER" | "EMPLOYEE" | "ADMIN" }
        ).role;
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
          id: (token.sub ?? session.user!.id)!,
          role: (token as unknown as { role?: "USER" | "EMPLOYEE" | "ADMIN" })
            .role,
        },
      };
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
} satisfies NextAuthConfig;
