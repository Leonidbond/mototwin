/**
 * Android App Links verification file (Digital Asset Links).
 * Set MOTOTWIN_ANDROID_RELEASE_SHA256_FINGERPRINTS on the VPS — comma-separated
 * SHA-256 cert fingerprints from `eas credentials -p android` (release keystore).
 *
 * MT-SEC-010 / Android Verified Links for Yandex OAuth callback.
 */
export async function GET() {
  const fingerprints =
    process.env.MOTOTWIN_ANDROID_RELEASE_SHA256_FINGERPRINTS?.split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean) ?? [];

  if (fingerprints.length === 0) {
    return Response.json([], {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  return Response.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "ru.mototwin.app",
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    }
  );
}
