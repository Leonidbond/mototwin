import Apple, { type AppleProfile } from "next-auth/providers/apple";
import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers/oauth";

type AppleWebProviderConfig = OAuthUserConfig<AppleProfile> & {
  clientSecret: string;
};

/**
 * Apple web Sign In uses response_mode=form_post. Browser PKCE/state cookies are
 * unreliable on the cross-site POST callback; exchange the code directly with the
 * JWT client_secret instead of openid-client callback (which requires checks.state).
 */
export function appleWebProvider(config: AppleWebProviderConfig): OAuthConfig<AppleProfile> {
  const base = Apple({
    ...config,
    allowDangerousEmailAccountLinking: config.allowDangerousEmailAccountLinking ?? true,
  });

  return {
    ...base,
    checks: [],
    token: {
      async request({ provider, params }) {
        const code = typeof params.code === "string" ? params.code : null;
        if (!code) {
          throw new Error("Apple authorization code is missing.");
        }

        const clientId = provider.clientId;
        const clientSecret = provider.clientSecret;
        if (!clientId || !clientSecret) {
          throw new Error("Apple OAuth client credentials are not configured.");
        }

        const redirectUri =
          typeof provider.callbackUrl === "string"
            ? provider.callbackUrl
            : `${process.env.NEXTAUTH_URL ?? process.env.AUTH_BASE_URL}/api/auth/callback/apple`;

        const response = await fetch("https://appleid.apple.com/auth/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: "authorization_code",
            redirect_uri: redirectUri,
          }),
        });

        const tokens = (await response.json()) as Record<string, unknown>;
        if (!response.ok) {
          const message =
            (typeof tokens.error_description === "string" && tokens.error_description) ||
            (typeof tokens.error === "string" && tokens.error) ||
            `Apple token exchange failed (${response.status})`;
          throw new Error(message);
        }

        return { tokens };
      },
    },
  };
}
