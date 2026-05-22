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
