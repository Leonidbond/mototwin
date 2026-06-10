import NextAuth, { type NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth/next";
import type { DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { appleWebProvider } from "./apple-web-provider";
import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers/oauth";

type Provider = NonNullable<NextAuthOptions["providers"]>[number];
import { mototwinPrismaAdapter } from "./prisma-auth-adapter";
import { ensureUserBootstrap } from "./user-bootstrap";
import {
  assertUserNotBlocked,
  AuthServiceError,
} from "./session-service";

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

/** Apple OAuth uses response_mode=form_post; cross-site POST needs SameSite=None cookies. */
function buildAuthCookies(): NextAuthOptions["cookies"] {
  const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;
  const prefix = useSecureCookies ? "__Secure-" : "";
  const crossSite = {
    httpOnly: true,
    sameSite: "none" as const,
    path: "/",
    secure: useSecureCookies,
  };

  return {
    pkceCodeVerifier: {
      name: `${prefix}next-auth.pkce.code_verifier`,
      options: { ...crossSite, maxAge: 60 * 15 },
    },
    state: {
      name: `${prefix}next-auth.state`,
      options: { ...crossSite, maxAge: 60 * 15 },
    },
    callbackUrl: {
      name: `${prefix}next-auth.callback-url`,
      options: crossSite,
    },
  };
}

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  adapter: mototwinPrismaAdapter(),
  session: { strategy: "database" },
  cookies: buildAuthCookies(),
  providers: buildProviders(),
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async signIn({ user }) {
      if (!user.id) {
        return true;
      }
      try {
        await assertUserNotBlocked(user.id);
        return true;
      } catch (error) {
        if (error instanceof AuthServiceError && error.code === "ACCOUNT_BLOCKED") {
          return false;
        }
        throw error;
      }
    },
  },
  events: {
    // OAuth signIn callback runs before PrismaAdapter persists a new user;
    // bootstrap here so garages_ownerUserId_fkey is satisfied.
    async signIn({ user }) {
      if (!user.id) {
        return;
      }
      try {
        await ensureUserBootstrap(user.id);
      } catch (error) {
        console.error("[auth] ensureUserBootstrap failed after OAuth signIn", {
          userId: user.id,
          error,
        });
      }
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
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
  const providers: Provider[] = [];

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
      appleWebProvider({
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
