import { YandexOAuthCallbackScreen } from "../../../components/auth/yandex-oauth-callback-screen";

/** Deep link: mototwin://oauth/yandex?code=… */
export default function YandexOAuthDeepLinkScreen() {
  return <YandexOAuthCallbackScreen />;
}
