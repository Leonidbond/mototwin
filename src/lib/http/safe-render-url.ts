/**
 * Server-side URL sanitizer for legacy data stored before MT-SEC-065 input
 * validation landed. Used when reading user-supplied URLs out of the DB to
 * make sure dangerous schemes (`javascript:`, `data:`, `vbscript:`) cannot
 * leak into client `<a href>` / `<Image src>` even via stored records.
 *
 * Returns the original URL when safe, or `null` when it must be dropped.
 * Pairs with the `safeUrl` zod helper used on the input path.
 */
const SAFE_PROTOCOLS = new Set(["http:", "https:"]);

export function safeRenderUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (trimmed === "") return null;
  if (trimmed.length > 4_096) return null;
  try {
    const url = new URL(trimmed);
    if (!SAFE_PROTOCOLS.has(url.protocol)) return null;
    return url.toString();
  } catch {
    // Relative URLs are allowed (no scheme) — assume they point at our own
    // origin via Next.js' default base.
    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
      return trimmed;
    }
    return null;
  }
}
