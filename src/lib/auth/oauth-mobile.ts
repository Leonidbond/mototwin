import { OAuth2Client } from "google-auth-library";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { AuthServiceError } from "./session-service";

const googleClient = new OAuth2Client();
const appleJwks = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

type MobileOAuthPayload = {
  provider: "google" | "apple" | "yandex";
  idToken?: string;
  accessToken?: string;
};

export async function resolveMobileOAuthProfile(input: MobileOAuthPayload): Promise<{
  provider: string;
  providerAccountId: string;
  email: string | null;
  displayName: string | null;
}> {
  if (input.provider === "google") {
    return verifyGoogle(input.idToken);
  }
  if (input.provider === "apple") {
    return verifyApple(input.idToken);
  }
  return verifyYandex(input.accessToken);
}

async function verifyGoogle(idToken?: string) {
  if (!idToken?.trim()) {
    throw new AuthServiceError("INVALID_OAUTH_TOKEN", 400, "Google idToken обязателен.");
  }
  const audience = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  if (!audience) {
    throw new AuthServiceError("GOOGLE_CONFIG_MISSING", 500, "Не настроен GOOGLE_OAUTH_CLIENT_ID.");
  }
  const ticket = await googleClient.verifyIdToken({
    idToken: idToken.trim(),
    audience,
  });
  const payload = ticket.getPayload();
  const sub = payload?.sub;
  if (!sub) {
    throw new AuthServiceError("INVALID_OAUTH_TOKEN", 401, "Google токен недействителен.");
  }
  return {
    provider: "google",
    providerAccountId: sub,
    email: payload?.email ?? null,
    displayName: payload?.name ?? null,
  };
}

async function verifyApple(identityToken?: string) {
  if (!identityToken?.trim()) {
    throw new AuthServiceError("INVALID_OAUTH_TOKEN", 400, "Apple identityToken обязателен.");
  }
  const audience = process.env.APPLE_CLIENT_ID?.trim();
  if (!audience) {
    throw new AuthServiceError("APPLE_CONFIG_MISSING", 500, "Не настроен APPLE_CLIENT_ID.");
  }
  const { payload } = await jwtVerify(identityToken.trim(), appleJwks, {
    issuer: "https://appleid.apple.com",
    audience,
  });
  const sub = payload.sub;
  if (!sub) {
    throw new AuthServiceError("INVALID_OAUTH_TOKEN", 401, "Apple токен недействителен.");
  }
  return {
    provider: "apple",
    providerAccountId: sub,
    email: typeof payload.email === "string" ? payload.email : null,
    displayName: null,
  };
}

async function verifyYandex(accessToken?: string) {
  if (!accessToken?.trim()) {
    throw new AuthServiceError("INVALID_OAUTH_TOKEN", 400, "Yandex accessToken обязателен.");
  }
  const response = await fetch("https://login.yandex.ru/info?format=json", {
    headers: {
      Authorization: `OAuth ${accessToken.trim()}`,
    },
  });
  if (!response.ok) {
    throw new AuthServiceError("INVALID_OAUTH_TOKEN", 401, "Yandex токен недействителен.");
  }
  const profile = (await response.json()) as {
    id?: string;
    default_email?: string;
    real_name?: string;
    display_name?: string;
  };
  if (!profile.id) {
    throw new AuthServiceError("INVALID_OAUTH_TOKEN", 401, "Не удалось получить профиль Yandex.");
  }
  return {
    provider: "yandex",
    providerAccountId: profile.id,
    email: profile.default_email ?? null,
    displayName: profile.real_name ?? profile.display_name ?? null,
  };
}
