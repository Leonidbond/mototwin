/**
 * Next.js instrumentation entry point — runs once when the server boots.
 *
 * We use it to fail-fast on dangerous env configurations (MT-SEC-021,
 * MT-SEC-023, MT-SEC-043) so a misconfigured production deploy is rejected at
 * startup instead of leaking through to runtime auth handlers.
 *
 * See: node_modules/next/dist/docs/01-app/02-guides/instrumentation.md
 */
export async function register(): Promise<void> {
  // Only validate on the Node.js runtime; the Edge runtime does not have full
  // process.env access and runs middleware that doesn't read these flags.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { validateServerEnv, EnvValidationError } = await import("./src/lib/env/server-env");
  try {
    validateServerEnv();
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error("[mototwin] Refusing to start — invalid environment:");
      for (const issue of error.issues) {
        console.error(`  - ${issue}`);
      }
    } else {
      console.error("[mototwin] Unknown env validation failure", error);
    }
    // Hard-stop (throw — process.exit is not allowed in Edge-analyzed bundles).
    throw error instanceof Error
      ? error
      : new Error("[mototwin] Refusing to start — invalid environment");
  }
}
