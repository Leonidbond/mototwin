import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { productSemanticColors as c } from "@mototwin/design-tokens";

const HELP_ICONS = [
  { icon: "✏️", label: "Редактировать" },
  { icon: "🗑️", label: "Удалить / Свалка" },
  { icon: "↩️", label: "Восстановить из Свалки" },
  { icon: "🕘", label: "Журнал обслуживания" },
  { icon: "🛒", label: "Добавить в список покупок" },
  { icon: "🔧", label: "Добавить сервисное событие" },
  { icon: "📦", label: "Добавить комплект" },
  { icon: "↗️", label: "Открыть контекст узла" },
];

const WORKFLOW_STEPS = [
  "1) Откройте мотоцикл из «Мой гараж».",
  "2) Проверьте «Требует внимания» и дерево узлов.",
  "3) Добавьте сервисное событие или позицию в список покупок.",
  "4) При установке позиции переведите ее в «Установлено» и сохраните событие.",
  "5) Обновляйте «Текущее состояние» и ведите журнал обслуживания.",
];

type AppHelpContextValue = {
  open: () => void;
  close: () => void;
};

const AppHelpContext = createContext<AppHelpContextValue | null>(null);

export function AppHelpProvider(props: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const value = useMemo<AppHelpContextValue>(
    () => ({ open: () => setIsOpen(true), close: () => setIsOpen(false) }),
    []
  );
  return (
    <AppHelpContext.Provider value={value}>
      {props.children}
      <HelpModal visible={isOpen} onClose={() => setIsOpen(false)} />
    </AppHelpContext.Provider>
  );
}

export function useAppHelp(): AppHelpContextValue {
  const ctx = useContext(AppHelpContext);
  if (!ctx) {
    return { open: () => {}, close: () => {} };
  }
  return ctx;
}

export function HelpTriggerButton(props: { size?: number; accessibilityLabel?: string }) {
  const { open } = useAppHelp();
  const size = props.size ?? 32;
  return (
    <Pressable
      onPress={open}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? "Открыть подсказки"}
      style={({ pressed }) => [
        triggerStyles.button,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && triggerStyles.buttonPressed,
      ]}
    >
      <Text style={triggerStyles.text}>?</Text>
    </Pressable>
  );
}

function HelpModal(props: { visible: boolean; onClose: () => void }) {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
      <Pressable style={styles.overlay} onPress={props.onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Подсказки по интерфейсу</Text>
            <Pressable
              onPress={props.onClose}
              accessibilityRole="button"
              accessibilityLabel="Закрыть подсказки"
              style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.subtitle}>Основные иконки и порядок работы в MotoTwin.</Text>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.iconsGrid}>
              {HELP_ICONS.map((item) => (
                <View key={item.label} style={styles.iconCard}>
                  <Text style={styles.iconEmoji}>{item.icon}</Text>
                  <Text style={styles.iconLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Порядок работы</Text>
            <View style={styles.stepsWrap}>
              {WORKFLOW_STEPS.map((step) => (
                <Text key={step} style={styles.stepText}>
                  {step}
                </Text>
              ))}
            </View>

            <Text style={styles.footerText}>MotoTwin {currentYear}</Text>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const triggerStyles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.card,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.85,
    backgroundColor: c.cardMuted,
  },
  text: {
    fontSize: 14,
    fontWeight: "700",
    color: c.textPrimary,
    lineHeight: 16,
  },
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: c.overlayModal,
    justifyContent: "flex-end",
    padding: 12,
  },
  sheet: {
    maxHeight: "84%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    padding: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: c.textPrimary,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonPressed: {
    backgroundColor: c.cardMuted,
  },
  closeButtonText: {
    fontSize: 16,
    color: c.textSecondary,
    fontWeight: "600",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: c.textSecondary,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 2,
    gap: 12,
  },
  iconsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  iconCard: {
    width: "48%",
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: c.cardMuted,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconEmoji: {
    fontSize: 15,
  },
  iconLabel: {
    flex: 1,
    fontSize: 12,
    color: c.textPrimary,
    fontWeight: "500",
  },
  sectionTitle: {
    marginTop: 4,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: c.textMuted,
    fontWeight: "700",
  },
  stepsWrap: {
    gap: 6,
  },
  stepText: {
    fontSize: 13,
    lineHeight: 18,
    color: c.textSecondary,
  },
  footerText: {
    marginTop: 2,
    fontSize: 11,
    color: c.textTertiary,
  },
});
