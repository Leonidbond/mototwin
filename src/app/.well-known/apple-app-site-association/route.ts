/**
 * iOS Universal Links (AASA). Requires MOTOTWIN_APPLE_TEAM_ID on the VPS.
 * Paths under /oauth/* open the native app for Yandex OAuth callback (MT-SEC-010).
 */
export async function GET() {
  const teamId = process.env.MOTOTWIN_APPLE_TEAM_ID?.trim();
  const bundleId = process.env.APPLE_CLIENT_ID?.trim() ?? "ru.mototwin.app";

  const payload =
    teamId != null && teamId.length > 0
      ? {
          applinks: {
            apps: [],
            details: [
              {
                appID: `${teamId}.${bundleId}`,
                paths: ["/oauth/yandex/callback", "/oauth/yandex/callback/*"],
              },
            ],
          },
        }
      : { applinks: { apps: [], details: [] } };

  return Response.json(payload, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
