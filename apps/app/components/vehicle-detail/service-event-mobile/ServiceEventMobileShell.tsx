import type { ReactNode } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import type { AddServiceEventFormValues, ServiceEventMode } from "@mototwin/types";

export function ServiceEventModeSegment({
  mode,
  onChange,
  detailedAllowed = true,
  onBlockedDetailed,
}: {
  mode: ServiceEventMode;
  onChange: (mode: ServiceEventMode) => void;
  /** False on Free — «Подробно» (ADVANCED / DETAILED entryMode) недоступен. */
  detailedAllowed?: boolean;
  onBlockedDetailed?: () => void;
}) {
  return (
    <View style={shellStyles.modeGrid}>
      <ModeTile
        active={mode === "BASIC"}
        icon="bolt"
        title="Быстро"
        subtitle="Просто отметить обслуживание"
        onPress={() => onChange("BASIC")}
      />
      <ModeTile
        active={mode === "ADVANCED"}
        icon="schedule"
        title="Подробно"
        subtitle="С деталями и запчастями"
        visuallyDisabled={!detailedAllowed}
        onPress={() => {
          if (!detailedAllowed) {
            onBlockedDetailed?.();
            return;
          }
          onChange("ADVANCED");
        }}
      />
    </View>
  );
}

function ModeTile({
  active,
  icon,
  title,
  subtitle,
  onPress,
  visuallyDisabled,
}: {
  active: boolean;
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  /** Затемнение без `disabled` — иначе onPress не сработает для paywall. */
  visuallyDisabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: Boolean(visuallyDisabled) }}
      onPress={onPress}
      style={({ pressed }) => [
        shellStyles.modeTile,
        active && shellStyles.modeTileActive,
        visuallyDisabled && shellStyles.disabled,
        pressed && !visuallyDisabled && shellStyles.pressed,
      ]}
    >
      <MaterialIcons
        name={icon}
        size={20}
        color={active ? c.primaryAction : c.textMuted}
      />
      <View style={{ flex: 1 }}>
        <Text style={[shellStyles.modeTitle, active && shellStyles.modeTitleActive]}>
          {title}
        </Text>
        <Text style={shellStyles.modeSubtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

export function ServiceEventCard({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  /** Подзаголовок под заголовком (как «Выбрано узлов: N» на web). */
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={shellStyles.card}>
      <View style={shellStyles.cardHeader}>
        <View style={shellStyles.cardTitleBlock}>
          <Text style={shellStyles.cardTitle}>{title}</Text>
          {subtitle ? <Text style={shellStyles.cardSubtitle}>{subtitle}</Text> : null}
        </View>
        {right ? <View style={shellStyles.cardRight}>{right}</View> : null}
      </View>
      {children}
    </View>
  );
}

export function ToggleRow({
  icon,
  title,
  subtitle,
  active,
  onToggle,
  disabled,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle?: string;
  active: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: active, disabled }}
      disabled={disabled}
      onPress={onToggle}
      style={({ pressed }) => [
        shellStyles.toggleRow,
        disabled && shellStyles.disabled,
        pressed && !disabled && shellStyles.pressed,
      ]}
    >
      <View style={shellStyles.toggleIconBox}>
        <MaterialIcons name={icon} size={18} color={active ? c.primaryAction : c.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={shellStyles.toggleTitle}>{title}</Text>
        {subtitle ? <Text style={shellStyles.toggleSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={[shellStyles.switchTrack, active && shellStyles.switchTrackOn]}>
        <View style={[shellStyles.switchKnob, active && shellStyles.switchKnobOn]} />
      </View>
    </Pressable>
  );
}

export function SummaryFooter({
  partsLine,
  laborLine,
  totalLine,
  isSubmitting,
  isEditMode,
  onSave,
  onPreview,
}: {
  partsLine: string | null;
  laborLine: string | null;
  totalLine: string | null;
  isSubmitting: boolean;
  isEditMode: boolean;
  onSave: () => void;
  onPreview?: () => void;
}) {
  return (
    <View style={shellStyles.summaryCard}>
      <Text style={shellStyles.summaryTitle}>Предварительный итог</Text>
      <View style={shellStyles.summaryGrid}>
        <SummaryCell label="Детали" value={partsLine ?? "—"} />
        <Text style={shellStyles.summaryOp}>+</Text>
        <SummaryCell label="Работа" value={laborLine ?? "—"} />
        <Text style={shellStyles.summaryOp}>=</Text>
        <SummaryCell label="Итого" value={totalLine ?? "—"} accent />
      </View>
      <View style={shellStyles.summaryActions}>
        <Pressable
          onPress={onPreview}
          disabled={!onPreview}
          style={({ pressed }) => [
            shellStyles.previewButton,
            !onPreview && shellStyles.disabled,
            pressed && onPreview && shellStyles.pressed,
          ]}
        >
          <MaterialIcons name="visibility" size={16} color={onPreview ? c.textSecondary : c.textMuted} />
          <Text style={shellStyles.previewButtonText}>Предпросмотр</Text>
        </Pressable>
        <Pressable
          onPress={onSave}
          disabled={isSubmitting}
          style={({ pressed }) => [
            shellStyles.saveButton,
            isSubmitting && shellStyles.disabled,
            pressed && !isSubmitting && shellStyles.pressed,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color={c.onPrimaryAction} />
          ) : (
            <Text style={shellStyles.saveButtonText}>
              {isEditMode ? "Сохранить изменения" : "Сохранить событие"}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export function ServiceEventPreviewSheet({
  visible,
  form,
  totalLine,
  onClose,
}: {
  visible: boolean;
  form: AddServiceEventFormValues;
  totalLine: string | null;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={shellStyles.previewOverlay} onPress={onClose}>
        <Pressable style={shellStyles.previewSheet} onPress={(event) => event.stopPropagation()}>
          <View style={shellStyles.previewHeader}>
            <Text style={shellStyles.previewTitle}>Предпросмотр</Text>
            <Pressable onPress={onClose} style={shellStyles.previewClose}>
              <Text style={shellStyles.previewCloseText}>×</Text>
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 430 }}>
            <PreviewRow label="Название" value={form.title.trim() || "—"} />
            <PreviewRow label="Режим" value={form.mode === "BASIC" ? "Быстро" : "Подробно"} />
            <PreviewRow label="Дата" value={form.eventDate.trim() || "—"} />
            <PreviewRow label="Пробег" value={form.odometer.trim() || "—"} />
            <PreviewRow label="Моточасы" value={form.engineHours.trim() || "—"} />
            <PreviewRow label="Исполнитель" value={performedByPreviewLabel(form.performedBy)} />
            {form.serviceProviderNote.trim() ? (
              <PreviewRow label="Сервис" value={form.serviceProviderNote.trim()} />
            ) : null}

            <PreviewRow label="Узлов" value={String(form.items.filter((it) => it.nodeId.trim()).length)} />
            {totalLine ? <PreviewRow label="Итого" value={totalLine} accent /> : null}
            {form.nextReminderEnabled ? (
              <View style={shellStyles.previewBlock}>
                <Text style={shellStyles.previewBlockTitle}>Напоминание о следующем ТО</Text>
                <Text style={shellStyles.previewBlockText}>
                  {[
                    form.nextReminderDate.trim() ? `дата ${form.nextReminderDate.trim()}` : null,
                    form.nextReminderOdometer.trim() ? `пробег ${form.nextReminderOdometer.trim()}` : null,
                    form.nextReminderEngineHours.trim()
                      ? `моточасы ${form.nextReminderEngineHours.trim()}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </Text>
              </View>
            ) : null}
            {form.comment.trim() ? (
              <View style={shellStyles.previewBlock}>
                <Text style={shellStyles.previewBlockTitle}>Комментарий</Text>
                <Text style={shellStyles.previewBlockText}>{form.comment.trim()}</Text>
              </View>
            ) : null}
          </ScrollView>
          <Pressable onPress={onClose} style={shellStyles.previewDone}>
            <Text style={shellStyles.previewDoneText}>Закрыть</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function performedByPreviewLabel(value: AddServiceEventFormValues["performedBy"]): string {
  if (value === "SELF") return "Сам";
  if (value === "SERVICE") return "Сервис";
  return "Другое";
}

function PreviewRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={shellStyles.previewRow}>
      <Text style={shellStyles.previewRowLabel}>{label}</Text>
      <Text style={[shellStyles.previewRowValue, accent && shellStyles.previewRowAccent]}>
        {value}
      </Text>
    </View>
  );
}

function SummaryCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={shellStyles.summaryCell}>
      <Text style={shellStyles.summaryLabel}>{label}</Text>
      <Text style={[shellStyles.summaryValue, accent && shellStyles.summaryValueAccent]}>
        {value}
      </Text>
    </View>
  );
}

const shellStyles = StyleSheet.create({
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.55,
  },
  modeGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  modeTile: {
    flex: 1,
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: c.card,
  },
  modeTileActive: {
    borderColor: c.primaryAction,
    backgroundColor: c.cardSubtle,
  },
  modeTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: c.textSecondary,
  },
  modeTitleActive: {
    color: c.primaryAction,
  },
  modeSubtitle: {
    marginTop: 2,
    fontSize: 10,
    color: c.textMuted,
  },
  card: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: c.card,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  cardTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: c.textPrimary,
    letterSpacing: -0.05,
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "600",
    color: c.textMuted,
  },
  cardRight: {
    flexShrink: 0,
    maxWidth: "52%",
  },
  toggleRow: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    paddingVertical: 10,
  },
  toggleIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.cardMuted,
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: c.textPrimary,
  },
  toggleSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: c.textMuted,
  },
  switchTrack: {
    width: 42,
    height: 24,
    borderRadius: 999,
    padding: 3,
    backgroundColor: c.cardMuted,
    borderWidth: 1,
    borderColor: c.border,
  },
  switchTrackOn: {
    backgroundColor: c.primaryAction,
    borderColor: c.primaryAction,
  },
  switchKnob: {
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: c.textMuted,
  },
  switchKnobOn: {
    transform: [{ translateX: 18 }],
    backgroundColor: c.onPrimaryAction,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 12,
    marginTop: 2,
    backgroundColor: c.card,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: c.textPrimary,
    marginBottom: 10,
  },
  summaryGrid: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryCell: {
    flex: 1,
    minWidth: 0,
  },
  summaryLabel: {
    fontSize: 11,
    color: c.textMuted,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "800",
    color: c.textPrimary,
  },
  summaryValueAccent: {
    color: c.primaryAction,
    fontSize: 16,
  },
  summaryOp: {
    fontSize: 16,
    color: c.textMuted,
    fontWeight: "700",
  },
  summaryActions: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  previewButton: {
    minHeight: 44,
    minWidth: 120,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    backgroundColor: c.cardMuted,
  },
  previewButtonText: {
    color: c.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: c.overlayModal,
    justifyContent: "center",
    padding: 18,
  },
  previewSheet: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    padding: 16,
    backgroundColor: c.card,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: c.textPrimary,
  },
  previewClose: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    backgroundColor: c.cardMuted,
  },
  previewCloseText: {
    fontSize: 20,
    color: c.textMuted,
    lineHeight: 22,
    fontWeight: "800",
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  previewRowLabel: {
    color: c.textSecondary,
    fontSize: 13,
  },
  previewRowValue: {
    flex: 1,
    textAlign: "right",
    color: c.textPrimary,
    fontWeight: "700",
    fontSize: 13,
  },
  previewRowAccent: {
    color: c.primaryAction,
  },
  previewBlock: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  previewBlockTitle: {
    color: c.textMeta,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 4,
  },
  previewBlockText: {
    color: c.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  previewDone: {
    marginTop: 14,
    minHeight: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.primaryAction,
  },
  previewDoneText: {
    color: c.onPrimaryAction,
    fontWeight: "800",
  },
  saveButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: c.primaryAction,
  },
  saveButtonText: {
    color: c.onPrimaryAction,
    fontWeight: "800",
    fontSize: 13,
  },
});
