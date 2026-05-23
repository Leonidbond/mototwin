import { useMemo } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { AppScreenHelpBar } from "../components/expo-shell/app-screen-help-bar";

export default function HomeScreen() {
  const router = useRouter();
  const featureCards = useMemo(
    () => [
      {
        title: "История обслуживания",
        description: "Все ТО и работы по мотоциклу в одном месте.",
      },
      {
        title: "Контроль расходов",
        description: "Понимайте реальную стоимость владения техникой.",
      },
      {
        title: "Узлы и детали",
        description: "Быстро переходите к ключевой информации по мотоциклу.",
      },
    ],
    []
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="light" />
      <View style={styles.screen}>
        <AppScreenHelpBar />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.hero}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>MotoTwin | Цифровой гараж</Text>
            </View>
            <Text style={styles.heroTitle}>MotoTwin для вашего мотоцикла</Text>
            <Text style={styles.heroDescription}>
              Профиль техники, сервис, расходы и важные напоминания в одном мобильном интерфейсе.
            </Text>
            <Pressable style={styles.primaryButton} onPress={() => router.push("/garage")}>
              <Text style={styles.primaryButtonText}>Перейти в гараж</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => router.push("/profile")}>
              <Text style={styles.secondaryButtonText}>Профиль</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Что внутри</Text>
            <View style={styles.cards}>
              {featureCards.map((card) => (
                <View key={card.title} style={styles.card}>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <Text style={styles.cardDescription}>{card.description}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.canvas,
  },
  screen: {
    flex: 1,
    backgroundColor: c.canvas,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 16,
  },
  hero: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.card,
    padding: 20,
    gap: 12,
  },
  heroBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroBadgeText: {
    color: c.textMuted,
    fontSize: 12,
    fontWeight: "500",
  },
  heroTitle: {
    color: c.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
  heroDescription: {
    color: c.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  primaryButton: {
    marginTop: 6,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: c.primaryAction,
    paddingVertical: 13,
  },
  primaryButtonText: {
    color: c.canvas,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.cardSubtle,
    paddingVertical: 13,
  },
  secondaryButtonText: {
    color: c.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: c.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  cards: {
    gap: 10,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.card,
    padding: 14,
    gap: 4,
  },
  cardTitle: {
    color: c.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  cardDescription: {
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
