import NextAuth, { type NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth/next";
import type { DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";
import type { Provider } from "next-auth/providers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { ensureUserBootstrap } from "./user-bootstrap";
import { assertUserNotBlocked, verifyUserCredentials } from "./session-service";

function YandexProvider(config: OAuthUserConfig<Record<string, never>>): OAuthConfig<Record<string, never>> {
  return {
    id: "yandex",
    name: "Yandex",
    type: "oauth",
    authorization: "https://oauth.yandex.ru/authorize?scope=login:email+login:info",
    token: "https://oauth.yandex.ru/token",
    userinfo: "https://login.yandex.ru/info?format=json",
    profile(profile) {
      const data = profile as Record<string, unknown>;
      return {
        id: String(data.id ?? ""),
        name: typeof data.real_name === "string" ? data.real_name : null,
        email: typeof data.default_email === "string" ? data.default_email : null,
      };
    },
    ...config,
  };
}

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: buildProviders(),
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async signIn({ user }) {
      if (user.id) {
        await assertUserNotBlocked(user.id);
        await ensureUserBootstrap(user.id);
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
};

const nextAuthHandler = NextAuth(authOptions);

export const handlers = {
  GET: nextAuthHandler,
  POST: nextAuthHandler,
};

export async function auth() {
  return getServerSession(authOptions);
}

function buildProviders(): Provider[] {
  const providers: Provider[] = [
    Credentials({
      name: "Email/password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) {
          return null;
        }
        const user = await verifyUserCredentials(email, password);
        await ensureUserBootstrap(user.userId);
        return {
          id: user.userId,
          email: user.email,
          name: user.displayName,
        };
      },
    }),
  ];

  if (process.env.AUTH_GOOGLE_CLIENT_ID && process.env.AUTH_GOOGLE_CLIENT_SECRET) {
    providers.push(
      Google({
        clientId: process.env.AUTH_GOOGLE_CLIENT_ID,
        clientSecret: process.env.AUTH_GOOGLE_CLIENT_SECRET,
        allowDangerousEmailAccountLinking: true,
      })
    );
  }

  if (process.env.AUTH_APPLE_CLIENT_ID && process.env.AUTH_APPLE_CLIENT_SECRET) {
    providers.push(
      Apple({
        clientId: process.env.AUTH_APPLE_CLIENT_ID,
        clientSecret: process.env.AUTH_APPLE_CLIENT_SECRET,
        allowDangerousEmailAccountLinking: true,
      })
    );
  }

  if (process.env.YANDEX_CLIENT_ID && process.env.YANDEX_CLIENT_SECRET) {
    providers.push(
      // Yandex /info does not return an `email_verified` claim. Treating it as
      // verified would let any Yandex user hijack a local account that shares
      // the same `default_email` — see MT-SEC-005 in docs/security/findings.md.
      // Linking is therefore explicit and goes through the dedicated UX.
      YandexProvider({
        allowDangerousEmailAccountLinking: false,
        clientId: process.env.YANDEX_CLIENT_ID,
        clientSecret: process.env.YANDEX_CLIENT_SECRET,
      })
    );
  }

  return providers;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
