import { OAUTH_PROVIDER_SVG, type OauthProviderKey } from "@mototwin/icons/oauth-providers";

export type OauthProviderIconProps = {
  provider: OauthProviderKey;
  size?: number;
  className?: string;
};

export function OauthProviderIcon({ provider, size = 20, className }: OauthProviderIconProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className ?? ""}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: OAUTH_PROVIDER_SVG[provider] }}
    />
  );
}
