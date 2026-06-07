import { useMemo } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { AppScreenHelpBar } from "../components/expo-shell/app-screen-help-bar";

const features = [
  {
    title: "Профиль мотоцикла",
    description:
      "Храните марку, модель, модификацию, VIN, пробег и профиль эксплуатации в одной структурированной системе.",
  },
  {
    title: "История обслуживания",
    description:
      "Фиксируйте все сервисные события в одном месте: что сделано, когда, на каком пробеге и за какую стоимость.",
  },
  {
    title: "Напоминания по ТО",
    description:
      "Сразу видно, что в порядке, что скоро потребует внимания и что уже просрочено по ключевым узлам.",
  },
  {
    title: "Совместимые детали",
    description:
      "Подбирайте совместимые детали по узлу на основе структурированной fitment-логики, а не догадок.",
  },
  {
    title: "Расходы на владение",
    description:
      "Учитывайте стоимость деталей, работ, расходников и ремонтов, чтобы видеть реальную стоимость владения.",
  },
  {
    title: "Логика для реального владельца",
    description:
      "Продукт построен вокруг реального сценария владения мотоциклом: обслуживание, детали, состояние и расходы.",
  },
] as const;

const benefits = [
  "Меньше ошибок при подборе деталей",
  "Понятная история обслуживания в одной системе",
  "Лучший контроль состояния мотоцикла",
  "Прозрачные расходы на владение",
  "Один интерфейс вместо заметок, чатов и чеков",
] as const;

const audience = [
  "Для владельцев, которые обслуживают мотоцикл сами",
  "Для тех, кто внимательно относится к сервисной истории",
  "Для тех, кто хочет точный подбор деталей без ошибки",
  "Для владельцев, которым нужен контроль над обслуживанием и расходами",
] as const;

const steps = [
  "Добавьте свой мотоцикл",
  "Ведите обслуживание и пробег",
  "Получайте статусы, напоминания и совместимые детали",
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const stepCards = useMemo(
    () =>
      steps.map((step, index) => (
        <View key={step} style={styles.stepRow}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>{index + 1}</Text>
          </View>
          <Text style={styles.stepText}>{step}</Text>
        </View>
      )),
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
              <Text style={styles.heroBadgeText}>MotoTwin | Цифровой гараж для владельца мотоцикла</Text>
            </View>
            <Text style={styles.heroTitle}>MotoTwin | цифровой гараж для вашего мотоцикла</Text>
            <Text style={styles.heroLead}>
              Узлы, история обслуживания, напоминания, совместимые детали и расходы в одном интерфейсе.
            </Text>
            <Text style={styles.heroDescription}>
              MotoTwin это не просто каталог деталей. Это система сопровождения владения мотоциклом: от
              профиля техники до сервиса, расходов и подбора совместимых компонентов.
            </Text>
            <Pressable style={styles.garageButton} onPress={() => router.push("/garage")}>
              <Text style={styles.garageButtonText}>Перейти в гараж</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Что делает сервис</Text>
            <Text style={styles.sectionLead}>
              MotoTwin объединяет ключевой сценарий владения мотоциклом: профиль, обслуживание,
              напоминания, fitment и расходы.
            </Text>
            <View style={styles.cards}>
              {features.map((card) => (
                <View key={card.title} style={styles.card}>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <Text style={styles.cardDescription}>{card.description}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Как это работает</Text>
            <View style={styles.steps}>{stepCards}</View>
          </View>

          <View style={styles.twoCol}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Почему это полезно</Text>
              {benefits.map((item) => (
                <Text key={item} style={styles.bullet}>
                  • {item}
                </Text>
              ))}
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Для кого MotoTwin</Text>
              {audience.map((item) => (
                <Text key={item} style={styles.bullet}>
                  • {item}
                </Text>
              ))}
            </View>
          </View>

          <View style={styles.ctaPanel}>
            <Text style={styles.ctaTitle}>Стартуем с управляемого MVP</Text>
            <Text style={styles.ctaDescription}>
              MotoTwin MVP стартует с BMW и KTM и фокусируется на реальном сервисном сценарии: профиль
              техники, ключевые узлы, журнал обслуживания, напоминания, fitment и расходы на владение.
            </Text>
            <Pressable style={styles.ctaPrimary} onPress={() => router.push("/vehicles/new")}>
              <Text style={styles.ctaPrimaryText}>Добавить мотоцикл</Text>
            </Pressable>
            <Pressable style={styles.ctaSecondary} onPress={() => router.push("/garage")}>
              <Text style={styles.ctaSecondaryText}>Открыть гараж</Text>
            </Pressable>
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
    paddingBottom: 32,
    gap: 20,
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
  heroLead: {
    color: c.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  heroDescription: {
    color: c.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  garageButton: {
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: c.primaryAction,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  garageButtonText: {
    color: c.canvas,
    fontSize: 18,
    fontWeight: "700",
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: c.textPrimary,
    fontSize: 22,
    fontWeight: "700",
  },
  sectionLead: {
    color: c.textMuted,
    fontSize: 15,
    lineHeight: 22,
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
    gap: 6,
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
  steps: {
    gap: 10,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.card,
    padding: 14,
  },
  stepBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.primaryAction,
  },
  stepBadgeText: {
    color: c.canvas,
    fontSize: 14,
    fontWeight: "700",
  },
  stepText: {
    flex: 1,
    color: c.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
  },
  twoCol: {
    gap: 10,
  },
  bullet: {
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  ctaPanel: {
    borderRadius: 24,
    backgroundColor: c.primaryAction,
    padding: 20,
    gap: 12,
  },
  ctaTitle: {
    color: c.canvas,
    fontSize: 22,
    fontWeight: "700",
  },
  ctaDescription: {
    color: c.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  ctaPrimary: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: c.canvas,
    paddingVertical: 13,
  },
  ctaPrimaryText: {
    color: c.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  ctaSecondary: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: 13,
  },
  ctaSecondaryText: {
    color: c.canvas,
    fontSize: 15,
    fontWeight: "700",
  },
});
