import { useEffect } from "react";
import * as ScreenCapture from "expo-screen-capture";

/**
 * Blocks screenshots / screen recording on private screens (MT-SEC-059).
 */
export function usePrivateScreenProtection(enabled = true): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    void ScreenCapture.preventScreenCaptureAsync();
    return () => {
      void ScreenCapture.allowScreenCaptureAsync();
    };
  }, [enabled]);
}
