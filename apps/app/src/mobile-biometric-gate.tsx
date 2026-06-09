import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { readAuthTokens } from "./auth-storage";

type Props = {
  children: ReactNode;
};

/**
 * Requires device biometrics (or device passcode) once per cold start when a
 * session is stored — MT-SEC-057.
 */
export function MobileBiometricGate({ children }: Props) {
  const [phase, setPhase] = useState<"checking" | "locked" | "unlocked">("checking");
  const [error, setError] = useState("");

  const runUnlock = useCallback(async () => {
    setError("");
    setPhase("checking");
    const tokens = await readAuthTokens();
    if (!tokens) {
      setPhase("unlocked");
      return;
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !isEnrolled) {
      setPhase("unlocked");
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Разблокировать MotoTwin",
      cancelLabel: "Отмена",
      disableDeviceFallback: false,
    });

    if (result.success) {
      setPhase("unlocked");
      return;
    }

    setError("Не удалось подтвердить личность. Повторите попытку.");
    setPhase("locked");
  }, []);

  useEffect(() => {
    void runUnlock();
  }, [runUnlock]);

  if (phase === "checking") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={c.primaryAction} />
      </View>
    );
  }

  if (phase === "locked") {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>MotoTwin заблокирован</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.button} onPress={() => void runUnlock()}>
          <Text style={styles.buttonText}>Разблокировать</Text>
        </Pressable>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: c.canvas,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  title: {
    color: c.textPrimary,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  error: {
    color: c.error,
    fontSize: 14,
    textAlign: "center",
  },
  button: {
    marginTop: 8,
    backgroundColor: c.primaryAction,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: {
    color: c.canvas,
    fontWeight: "600",
  },
});
