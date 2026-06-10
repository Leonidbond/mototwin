---
name: mototwin-android-device-install
description: >-
  Build the current MotoTwin Android app (EAS preview APK against mototwin.space)
  and install it on a phone connected to the Mac via USB or wireless adb. Use when
  the user asks to update/install the Android app on a device, rebuild mobile APK,
  «обнови андроид», «установи на телефон», «собери apk», or test the latest app
  on a physical phone.
---

# MotoTwin — Android build + install on device

## Goal

Ship **current workspace code** (including uncommitted changes) to a **physical Android phone** linked to the laptop. Output: installed `ru.mototwin.app` with production API.

## Default path (use this)

Run the repo script from **any directory**:

```bash
bash apps/app/scripts/build-and-install-android-device.sh
```

What it does:

1. Verifies `adb` sees at least one device in `device` state
2. `eas build -p android --profile preview --non-interactive --wait --json` from `apps/app`
3. Downloads the finished APK from EAS artifacts
4. `adb install -r` on the connected phone

Typical runtime: **15–60 min** (EAS queue + cloud build). Do not cancel unless the user asks.

### Agent requirements

- Run with `required_permissions: ["all"]` (network + adb + eas credentials)
- Do **not** commit unless the user asked
- Report: build URL on expo.dev, APK size, `adb install` result, app version from build output

## Prerequisites (user machine)

| Item | Notes |
|------|--------|
| `eas-cli` | `npm i -g eas-cli`; logged in (`eas whoami`) |
| EAS project | `apps/app` — org `mototwin`, slug `mototwin` |
| `adb` | Default: `$HOME/Library/Android/sdk/platform-tools/adb` |
| Phone | USB debugging **or** wireless pairing; `adb devices` shows `device` |

Wireless adb (if needed): Android → Developer options → Wireless debugging → pair on Mac.

## Build profile

| Profile | Artifact | Use |
|---------|----------|-----|
| **preview** (default) | APK, internal | Device install — **this skill** |
| production | AAB | Google Play only — see [google-play.md](../../docs/deploy/google-play.md) |

Env baked in at build time (`apps/app/eas.json` → preview): `EXPO_PUBLIC_API_BASE_URL=https://mototwin.space`, Google/Yandex OAuth client IDs.

Override profile: `EAS_BUILD_PROFILE=preview bash apps/app/scripts/build-and-install-android-device.sh`

## Manual steps (if script fails)

```bash
export PATH="$HOME/Library/Android/sdk/platform-tools:$PATH"
adb devices

cd apps/app
eas build -p android --profile preview --non-interactive --wait

# After finish — take Application Archive URL from build page or:
eas build:view <BUILD_ID>

curl -fsSL -o /tmp/mototwin.apk "<APK_URL>"
adb install -r /tmp/mototwin.apk
```

Install link / QR (no adb): open the build page on the phone — `https://expo.dev/accounts/mototwin/projects/mototwin/builds/<BUILD_ID>`.

## Local Gradle fallback (optional)

Only if EAS is unavailable **and** Gradle can reach `dl.google.com`:

```bash
cd apps/app/android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export NODE_ENV=production
export EXPO_PUBLIC_API_BASE_URL=https://mototwin.space
# + EXPO_PUBLIC_GOOGLE_* / YANDEX from eas.json preview env
./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
```

On this Mac, local release builds often fail with **TLS handshake** to Google Maven — prefer EAS.

## Troubleshooting

| Symptom | Action |
|---------|--------|
| `no Android device` | USB cable / authorize debugging; or pair wireless adb |
| `adb: command not found` | `export PATH="$HOME/Library/Android/sdk/platform-tools:$PATH"` or set `ADB=...` |
| EAS `in queue` long | Normal; poll `eas build:view <id>` |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | Uninstall old debug build or mismatched signing; `adb uninstall ru.mototwin.app` then reinstall |
| `DEVELOPER_ERROR` on Google login | Release SHA-1 in Google Console — `bash apps/app/scripts/print-android-oauth-sha1.sh` |
| White screen / no data | Wrong profile or missing `EXPO_PUBLIC_API_BASE_URL` in eas.json env |

## After install — quick smoke

1. Login (email or Google)
2. Garage loads
3. If testing a specific fix — reproduce user flow (e.g. Корзина → Установить → форма ТО prefilled)

## Related docs

- [docs/mobile-build.md](../../docs/mobile-build.md) — full mobile build matrix
- [docs/deploy/google-play.md](../../docs/deploy/google-play.md) — Play Store AAB/submit
