import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import type { SubscriptionCurrentResponse, SubscriptionPlan } from "@mototwin/types";
import { createMobileApiClient } from "../src/create-mobile-api-client";
import { ScreenHeader } from "../components/expo-shell/screen-header";

const PLANS: Array<{ id: SubscriptionPlan; title: string; lines: string[] }> = [
  {
    id: "FREE",
    title: "Free",
    lines: ["1 мотоцикл", "ТОП-узлы (read-only)", "Последние 10 сервисных событий"],
  },
  {
    id: "RIDER",
    title: "Rider",
    lines: ["До 3 мотоциклов", "Выбор ТОП-узлов", "Журнал без лимита"],
  },
  {
    id: "PRO",
    title: "Pro",
    lines: ["Без лимита мотоциклов", "Все узлы", "Журнал без лимита"],
  },
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<SubscriptionCurrentResponse | null>(null);
  const [error, setError] = useState("");

  const closeScreen = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/garage");
  };

  useEffect(() => {
    let cancelled = false;
    const endpoints = createMobileApiClient();
    void endpoints
      .getSubscriptionCurrent()
      .then((value) => {
        if (!cancelled) {
          setSubscription(value);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Не удалось загрузить подписку.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectPlan = async (plan: SubscriptionPlan) => {
    try {
      const endpoints = createMobileApiClient();
      const updated = await endpoints.updateSubscriptionPlan({ plan });
      setSubscription(updated);
      setError("");
    } catch {
      setError("Не удалось обновить тариф.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScreenHeader
        title="Подписка"
        onBack={closeScreen}
        showHelp={false}
        rightSlot={
          <Pressable
            onPress={closeScreen}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Закрыть"
            style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
          >
            <Text style={styles.closeButtonText}>Закрыть</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>Сравнение тарифов</Text>
          <Text style={styles.headerText}>Текущий: {subscription?.plan ?? "FREE"}</Text>
          <Text style={styles.headerHint}>
            В Free отображаются последние 10 сервисных событий. Старые записи сохраняются.
          </Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
        {PLANS.map((plan) => {
          const isActive = subscription?.plan === plan.id;
          return (
            <View key={plan.id} style={[styles.planCard, isActive && styles.planCardActive]}>
              <Text style={styles.planTitle}>{plan.title}</Text>
              {plan.lines.map((line) => (
                <Text key={line} style={styles.planLine}>
                  • {line}
                </Text>
              ))}
              <Pressable style={styles.planButton} onPress={() => void selectPlan(plan.id)}>
                <Text style={styles.planButtonText}>{isActive ? "Активен" : `Выбрать ${plan.title}`}</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: c.canvas },
  content: { padding: 16, gap: 10 },
  headerCard: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    backgroundColor: c.card,
    padding: 12,
    gap: 4,
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: c.textPrimary },
  headerText: { fontSize: 13, color: c.textSecondary },
  headerHint: { fontSize: 12, color: c.textMuted },
  errorText: { fontSize: 12, color: c.error },
  planCard: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    backgroundColor: c.card,
    padding: 12,
    gap: 4,
  },
  planCardActive: { borderColor: c.primaryAction },
  closeButton: {
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: "center",
    backgroundColor: c.card,
  },
  closeButtonPressed: { backgroundColor: c.cardMuted },
  closeButtonText: { fontSize: 13, fontWeight: "600", color: c.textPrimary },
  planTitle: { fontSize: 16, fontWeight: "700", color: c.textPrimary },
  planLine: { fontSize: 13, color: c.textSecondary },
  planButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: c.cardMuted,
  },
  planButtonText: { fontSize: 13, fontWeight: "600", color: c.textPrimary },
});
