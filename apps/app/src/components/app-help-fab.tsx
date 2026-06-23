import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Constants from "expo-constants";
import { usePathname, useSegments } from "expo-router";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import {
  getPageHelp,
  resolvePageKeyFromMobileRoute,
  type FeedbackTypeKey,
} from "@mototwin/domain";
import { createMobileApiClient } from "../create-mobile-api-client";

const FALLBACK_HELP = {
  title: "Помощь по MotoTwin",
  summary:
    "MotoTwin — цифровой двойник мотоцикла: ведите ТО, расходы и список покупок по каждому мотоциклу.",
  steps: [
    "Откройте мотоцикл из «Мой гараж».",
    "Проверьте «Требует внимания» и дерево узлов.",
    "Добавляйте сервисные события и позиции в список покупок.",
  ],
  tips: undefined as string[] | undefined,
};

const FEEDBACK_TYPES: { value: FeedbackTypeKey; label: string }[] = [
  { value: "PROBLEM", label: "Проблема" },
  { value: "IDEA", label: "Идея" },
  { value: "QUESTION", label: "Вопрос" },
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
  const size = props.size ?? 28;
  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? "Помощь и обратная связь"}
      hitSlop={8}
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

type Mode = "help" | "feedback";

function HelpModal(props: { visible: boolean; onClose: () => void }) {
  const segments = useSegments();
  const pathname = usePathname() || "/";
  const [mode, setMode] = useState<Mode>("help");

  const help = useMemo(() => {
    const key = resolvePageKeyFromMobileRoute(segments as string[]);
    const resolved = key ? getPageHelp(key, "mobile") : null;
    return resolved ? { title: resolved.title, ...resolved.content } : FALLBACK_HELP;
  }, [segments]);

  const pageKey = useMemo(
    () => resolvePageKeyFromMobileRoute(segments as string[]),
    [segments]
  );

  const close = () => {
    setMode("help");
    props.onClose();
  };

  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.overlay} onPress={close}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{help.title}</Text>
            <Pressable
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel="Закрыть"
              style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.tabs}>
            <TabButton active={mode === "help"} onPress={() => setMode("help")} label="Помощь" />
            <TabButton
              active={mode === "feedback"}
              onPress={() => setMode("feedback")}
              label="Обратная связь"
            />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {mode === "help" ? (
              <HelpContent help={help} />
            ) : (
              <FeedbackForm
                pageKey={pageKey}
                routePath={pathname}
                vehicleId={extractVehicleId(pathname)}
                onDone={close}
              />
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function extractVehicleId(pathname: string): string | null {
  const match = pathname.match(/\/vehicles\/([^/]+)/);
  if (!match?.[1]) return null;
  const id = match[1];
  return id === "new" || id.startsWith("[") ? null : id;
}

function HelpContent({
  help,
}: {
  help: { summary: string; steps: string[]; tips?: string[] };
}) {
  return (
    <View>
      <Text style={styles.subtitle}>{help.summary}</Text>
      <Text style={styles.sectionTitle}>Что можно сделать</Text>
      <View style={styles.stepsWrap}>
        {help.steps.map((step, index) => (
          <Text key={step} style={styles.stepText}>
            {index + 1}) {step}
          </Text>
        ))}
      </View>
      {help.tips && help.tips.length > 0 ? (
        <View style={styles.tipsBox}>
          {help.tips.map((tip) => (
            <Text key={tip} style={styles.tipText}>
              💡 {tip}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function FeedbackForm(props: {
  pageKey: string | null;
  routePath: string;
  vehicleId: string | null;
  onDone: () => void;
}) {
  const [type, setType] = useState<FeedbackTypeKey>("PROBLEM");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const platform = Platform.OS === "ios" ? "ios" : "android";
  const appVersion =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? null;

  const submit = async () => {
    const trimmed = message.trim();
    if (trimmed.length < 5) {
      setError("Опишите подробнее — минимум 5 символов.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const api = createMobileApiClient();
      await api.submitFeedback({
        type,
        message: trimmed,
        pageKey: props.pageKey ?? "home",
        platform,
        routePath: props.routePath,
        appVersion,
        locale: "ru-RU",
        vehicleId: props.vehicleId,
      });
      setDone(true);
      setMessage("");
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "";
      if (messageText.includes("401") || messageText.toLowerCase().includes("вход")) {
        setError("Чтобы отправить обратную связь, войдите в аккаунт.");
      } else {
        setError("Не удалось отправить. Попробуйте позже.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <View style={styles.doneBox}>
        <Text style={styles.doneText}>
          Спасибо! Обращение отправлено — мы его обязательно прочитаем.
        </Text>
        <Pressable
          onPress={props.onDone}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
        >
          <Text style={styles.primaryButtonText}>Закрыть</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.subtitle}>
        Расскажите о проблеме или идее — данные о текущей странице подставятся автоматически.
      </Text>
      <View style={styles.typeRow}>
        {FEEDBACK_TYPES.map((option) => {
          const active = type === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setType(option.value)}
              style={[styles.typeChip, active && styles.typeChipActive]}
            >
              <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={5}
        maxLength={5000}
        placeholder="Опишите, что случилось или что хотелось бы улучшить…"
        placeholderTextColor={c.textMuted}
        style={styles.textArea}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Pressable
        onPress={submit}
        disabled={submitting}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.primaryButtonPressed,
          submitting && styles.primaryButtonDisabled,
        ]}
      >
        {submitting ? (
          <ActivityIndicator color={c.onPrimaryAction} />
        ) : (
          <Text style={styles.primaryButtonText}>Отправить</Text>
        )}
      </Pressable>
    </View>
  );
}

function TabButton(props: { active: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={props.onPress}
      style={[styles.tabButton, props.active && styles.tabButtonActive]}
    >
      <Text style={[styles.tabButtonText, props.active && styles.tabButtonTextActive]}>
        {props.label}
      </Text>
    </Pressable>
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
    maxHeight: "88%",
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
  tabs: {
    flexDirection: "row",
    gap: 4,
    marginTop: 12,
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    alignSelf: "flex-start",
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: c.primaryAction,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: c.textSecondary,
  },
  tabButtonTextActive: {
    color: c.onPrimaryAction,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textSecondary,
  },
  sectionTitle: {
    marginTop: 14,
    marginBottom: 8,
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
    lineHeight: 19,
    color: c.textPrimary,
  },
  tipsBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: c.cardMuted,
    gap: 4,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    alignItems: "center",
  },
  typeChipActive: {
    borderColor: c.primaryAction,
    backgroundColor: c.primaryAction,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: c.textSecondary,
  },
  typeChipTextActive: {
    color: c.onPrimaryAction,
  },
  textArea: {
    minHeight: 110,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
    color: c.textPrimary,
    padding: 10,
    fontSize: 14,
    textAlignVertical: "top",
  },
  errorText: {
    fontSize: 12,
    color: c.error,
  },
  primaryButton: {
    height: 44,
    borderRadius: 10,
    backgroundColor: c.primaryAction,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: c.onPrimaryAction,
  },
  doneBox: {
    gap: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: c.cardMuted,
  },
  doneText: {
    fontSize: 14,
    lineHeight: 20,
    color: c.textPrimary,
  },
});
