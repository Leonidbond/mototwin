import { SvgXml } from "react-native-svg";
import { OAUTH_PROVIDER_SVG, type OauthProviderKey } from "@mototwin/icons/oauth-providers";

export type OauthProviderIconProps = {
  provider: OauthProviderKey;
  size?: number;
};

export function OauthProviderIcon({ provider, size = 20 }: OauthProviderIconProps) {
  return <SvgXml xml={OAUTH_PROVIDER_SVG[provider]} width={size} height={size} />;
}
