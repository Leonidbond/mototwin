export const MOBILE_CLIENT_HEADER = "x-mototwin-client";
export const MOBILE_CLIENT_EXPO = "expo";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
};

export type AuthMeResponse = {
  user: AuthUser;
  garageId: string;
  garageTitle: string;
  planType: "FREE" | "PRO";
};

export type AuthLoginResponse = {
  user: AuthUser;
  garageId: string;
  garageTitle: string;
  /** Present for Expo / mobile clients */
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
};

export type AuthRegisterInput = {
  email: string;
  password: string;
  displayName?: string;
};

export type AuthLoginInput = {
  email: string;
  password: string;
};

export type AuthRefreshInput = {
  refreshToken: string;
};

export type AuthRefreshResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
};

export type OAuthProvider = "google" | "apple" | "yandex";

export type MobileOAuthInput = {
  provider: OAuthProvider;
  idToken?: string;
  accessToken?: string;
  /**
   * Raw (un-hashed) nonce for the Apple Sign-In flow. The client generates a
   * cryptographically random string, computes SHA-256(rawNonce), and passes
   * the digest as `nonce` to AppleAuthentication.signInAsync. The server then
   * verifies that the JWT's `nonce` claim equals SHA-256(rawNonce).
   *
   * MT-SEC-003 in docs/security/findings.md.
   */
  rawNonce?: string;
};

export type ForgotPasswordInput = {
  email: string;
};

export type ForgotPasswordResponse = {
  ok: boolean;
  message: string;
};

export type ResetPasswordInput = {
  token: string;
  password: string;
};

export type ResetPasswordResponse = {
  ok: boolean;
};
