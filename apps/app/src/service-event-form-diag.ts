/** Release-visible diagnostics for service event form (shows in adb logcat as ReactNativeJS). */
const PREFIX = "[MotoTwin][service-events/new]";

export function logServiceEventFormDiag(event: string, details?: Record<string, unknown>): void {
  if (details && Object.keys(details).length > 0) {
    console.warn(`${PREFIX} ${event}`, details);
    return;
  }
  console.warn(`${PREFIX} ${event}`);
}
