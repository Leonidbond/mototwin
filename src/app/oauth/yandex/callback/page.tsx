import { productSemanticColors as c } from "@mototwin/design-tokens";

/**
 * Fallback page when Yandex OAuth callback opens in a browser without the app installed.
 * Installed apps intercept https://mototwin.space/oauth/yandex/callback via App Links.
 */
export default function YandexOAuthCallbackPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: c.canvas,
        color: c.textPrimary,
        fontFamily: "system-ui, sans-serif",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>MotoTwin</h1>
        <p style={{ color: c.textMuted, maxWidth: 360 }}>
          Если приложение установлено, вход через Yandex продолжится автоматически. Иначе
          установите MotoTwin из App Store или Google Play.
        </p>
      </div>
    </main>
  );
}
