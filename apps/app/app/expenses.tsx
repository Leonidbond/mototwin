import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { buildExpenseAnalyticsFromItems, formatExpenseAmountRu } from "@mototwin/domain";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import type { ExpenseItem } from "@mototwin/types";
import { createMobileApiClient } from "../src/create-mobile-api-client";
import { withAuthGuard } from "../src/mobile-auth-guard";
import { readLastViewedVehicleId } from "../src/ui-last-viewed-vehicle";
import { AppScreenHelpBar } from "../components/expo-shell/app-screen-help-bar";
import { GarageBottomNav } from "../components/garage/GarageBottomNav";
import { InternalScreenChrome } from "../components/expo-shell/internal-screen-chrome";

export default function GarageExpensesScreen() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [years, setYears] = useState<number[]>([currentYear]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const navVehicleId = readLastViewedVehicleId();

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const endpoints = createMobileApiClient();
      const result = await withAuthGuard(
        () => endpoints.getExpenses({ year: selectedYear }),
        () => router.replace("/login")
      );
      if (!result) return;
      setExpenses(result.expenses ?? []);
      setYears(result.years?.length ? result.years : [selectedYear]);
    } catch {
      setError("Не удалось загрузить расходы гаража.");
    } finally {
      setIsLoading(false);
    }
  }, [router, selectedYear]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const analytics = useMemo(
    () => buildExpenseAnalyticsFromItems(expenses, selectedYear),
    [expenses, selectedYear]
  );
  const primaryCurrency = analytics.selectedYearTotalsByCurrency[0]?.currency ?? "RUB";
  const totalLabel = `${formatExpenseAmountRu(
    analytics.selectedYearTotalsByCurrency.find((row) => row.currency === primaryCurrency)
      ?.totalAmount ?? 0
  )} ${primaryCurrency}`;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.screen}>
        <AppScreenHelpBar />
        <InternalScreenChrome
          crumbs={[{ label: "Мой гараж", href: "/garage" }, { label: "Расходы" }]}
          title="Расходы гаража"
          subtitle="Технические расходы по всем мотоциклам"
          onBack={() => router.back()}
        />
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={c.textPrimary} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.yearRow}>
              {years.map((year) => (
                <Pressable
                  key={year}
                  onPress={() => setSelectedYear(year)}
                  style={[styles.yearChip, selectedYear === year && styles.yearChipActive]}
                >
                  <Text style={[styles.yearChipText, selectedYear === year && styles.yearChipTextActive]}>
                    {year}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Итого за {selectedYear}</Text>
              <Text style={styles.kpiValue}>{totalLabel}</Text>
              <Text style={styles.kpiMeta}>{expenses.length} записей</Text>
            </View>
            {expenses.length === 0 ? (
              <Text style={styles.empty}>За выбранный год расходов пока нет.</Text>
            ) : (
              expenses.slice(0, 50).map((expense) => (
                <Pressable
                  key={expense.id}
                  onPress={() => router.push(`/vehicles/${expense.vehicleId}/expenses?year=${selectedYear}`)}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                >
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {expense.title}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {formatExpenseAmountRu(expense.amount)} {expense.currency} · {expense.expenseDate.slice(0, 10)}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        )}
        <GarageBottomNav
          activeKey="expenses"
          hasVehicleContext={Boolean(navVehicleId)}
          currentVehicleId={navVehicleId}
          onOpenGarage={() => router.push("/garage")}
          onOpenNodes={() => navVehicleId && router.push(`/vehicles/${navVehicleId}/nodes`)}
          onOpenJournal={() => navVehicleId && router.push(`/vehicles/${navVehicleId}/service-log`)}
          onOpenPicker={() => navVehicleId && router.push(`/vehicles/${navVehicleId}/wishlist`)}
          onOpenExpenses={() => router.push("/expenses")}
          onOpenProfile={() => router.push("/profile")}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: c.canvas },
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 24, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  error: { color: c.error, textAlign: "center" },
  yearRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  yearChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
  },
  yearChipActive: { borderColor: c.primaryAction, backgroundColor: "rgba(249,115,22,0.12)" },
  yearChipText: { color: c.textMuted, fontWeight: "600", fontSize: 13 },
  yearChipTextActive: { color: c.primaryAction },
  kpiCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
    gap: 4,
  },
  kpiLabel: { color: c.textMuted, fontSize: 13 },
  kpiValue: { color: c.textPrimary, fontSize: 28, fontWeight: "800" },
  kpiMeta: { color: c.textSecondary, fontSize: 12 },
  empty: { color: c.textMuted, fontSize: 14 },
  row: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    gap: 4,
  },
  rowPressed: { opacity: 0.85 },
  rowTitle: { color: c.textPrimary, fontWeight: "700", fontSize: 14 },
  rowMeta: { color: c.textMuted, fontSize: 12 },
});
