/** Google native OAuth redirect for Expo AuthSession (Android/iOS standalone). */
export function getGoogleNativeRedirectUri(clientId: string | undefined): string | undefined {
  if (!clientId?.trim()) {
    return undefined;
  }
  const prefix = clientId.trim().replace(/\.apps\.googleusercontent\.com$/i, "");
  // Google native-app OAuth expects /oauth2redirect (not /oauthredirect). Do NOT register
  // this URI on the Web client — only package + SHA-1 on the Android OAuth client.
  return `com.googleusercontent.apps.${prefix}:/oauth2redirect`;
}

export function getGoogleNativeRedirectScheme(clientId: string | undefined): string | undefined {
  if (!clientId?.trim()) {
    return undefined;
  }
  const prefix = clientId.trim().replace(/\.apps\.googleusercontent\.com$/i, "");
  return `com.googleusercontent.apps.${prefix}`;
}
