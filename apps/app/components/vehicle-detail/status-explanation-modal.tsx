import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { formatIsoCalendarDateRu, getStatusExplanationTriggeredByLabel } from "@mototwin/domain";
import type { NodeTreeItemViewModel } from "@mototwin/types";
import { productSemanticColors as c } from "@mototwin/design-tokens";

export function StatusExplanationModal(props: {
  visible: boolean;
  node: NodeTreeItemViewModel | null;
  onClose: () => void;
}) {
  const { visible, node, onClose } = props;
  if (!visible) {
    return null;
  }
  const ex = node?.statusExplanation;
  if (!node || !ex) {
    return null;
  }

  const showKmRow =
    ex.current.odometer !== null ||
    ex.lastService?.odometer !== null ||
    ex.rule?.intervalKm !== null ||
    ex.rule?.warningKm !== null ||
    ex.usage?.elapsedKm !== null ||
    ex.usage?.remainingKm !== null;

  const showHoursRow =
    ex.current.engineHours !== null ||
    ex.lastService?.engineHours !== null ||
    ex.rule?.intervalHours !== null ||
    ex.rule?.warningHours !== null ||
    ex.usage?.elapsedHours !== null ||
    ex.usage?.remainingHours !== null;

  const showDaysRow =
    ex.rule?.intervalDays !== null ||
    ex.rule?.warningDays !== null ||
    ex.usage?.elapsedDays !== null ||
    ex.usage?.remainingDays !== null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} accessibilityLabel="Закрыть" />
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Пояснение расчета: {node.name}</Text>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            {ex.reasonShort ? (
              <View style={styles.modalBlock}>
                <Text style={styles.modalKicker}>Кратко</Text>
                <Text style={styles.modalEmphasis}>{ex.reasonShort}</Text>
              </View>
            ) : null}
            {ex.reasonDetailed ? (
              <View style={styles.modalBlock}>
                <Text style={styles.modalKicker}>Подробно</Text>
                <Text style={styles.modalBody}>{ex.reasonDetailed}</Text>
              </View>
            ) : null}
            {ex.triggeredBy ? (
              <View style={styles.modalBlock}>
                <Text style={styles.modalKicker}>Сработавшее измерение</Text>
                <Text style={styles.modalBody}>
                  {getStatusExplanationTriggeredByLabel(ex.triggeredBy)}
                </Text>
              </View>
            ) : null}

            <Text style={styles.modalKicker}>Детали расчета</Text>
            {showKmRow ? (
              <View style={styles.modalTableBlock}>
                <Text style={styles.modalTableTitle}>Пробег</Text>
                <Text style={styles.modalMono}>
                  Текущее:{" "}
                  {ex.current.odometer !== null ? `${ex.current.odometer} км` : "—"}
                  {"\n"}
                  Последний сервис:{" "}
                  {ex.lastService?.odometer != null
                    ? `${ex.lastService.odometer} км`
                    : "—"}
                  {"\n"}
                  Интервал:{" "}
                  {ex.rule?.intervalKm != null ? `${ex.rule.intervalKm} км` : "—"}
                  {"\n"}
                  Warning:{" "}
                  {ex.rule?.warningKm != null ? `${ex.rule.warningKm} км` : "—"}
                  {"\n"}
                  Использовано:{" "}
                  {ex.usage?.elapsedKm != null ? `${ex.usage.elapsedKm} км` : "—"}
                  {"\n"}
                  Осталось:{" "}
                  {ex.usage?.remainingKm != null ? `${ex.usage.remainingKm} км` : "—"}
                </Text>
              </View>
            ) : null}
            {showHoursRow ? (
              <View style={styles.modalTableBlock}>
                <Text style={styles.modalTableTitle}>Моточасы</Text>
                <Text style={styles.modalMono}>
                  Текущее:{" "}
                  {ex.current.engineHours !== null ? `${ex.current.engineHours} ч` : "—"}
                  {"\n"}
                  Последний сервис:{" "}
                  {ex.lastService?.engineHours != null
                    ? `${ex.lastService.engineHours} ч`
                    : "—"}
                  {"\n"}
                  Интервал:{" "}
                  {ex.rule?.intervalHours != null ? `${ex.rule.intervalHours} ч` : "—"}
                  {"\n"}
                  Warning:{" "}
                  {ex.rule?.warningHours != null ? `${ex.rule.warningHours} ч` : "—"}
                  {"\n"}
                  Использовано:{" "}
                  {ex.usage?.elapsedHours != null ? `${ex.usage.elapsedHours} ч` : "—"}
                  {"\n"}
                  Осталось:{" "}
                  {ex.usage?.remainingHours != null ? `${ex.usage.remainingHours} ч` : "—"}
                </Text>
              </View>
            ) : null}
            {showDaysRow ? (
              <View style={styles.modalTableBlock}>
                <Text style={styles.modalTableTitle}>Время</Text>
                <Text style={styles.modalMono}>
                  Интервал:{" "}
                  {ex.rule?.intervalDays != null ? `${ex.rule.intervalDays} дн` : "—"}
                  {"\n"}
                  Warning:{" "}
                  {ex.rule?.warningDays != null ? `${ex.rule.warningDays} дн` : "—"}
                  {"\n"}
                  Использовано:{" "}
                  {ex.usage?.elapsedDays != null ? `${ex.usage.elapsedDays} дн` : "—"}
                  {"\n"}
                  Осталось:{" "}
                  {ex.usage?.remainingDays != null ? `${ex.usage.remainingDays} дн` : "—"}
                </Text>
              </View>
            ) : null}
            <View style={styles.modalTableBlock}>
              <Text style={styles.modalTableTitle}>Дата расчета</Text>
              <Text style={styles.modalMono}>
                {formatIsoCalendarDateRu(ex.current.date)}
                {"\n"}
                Последний сервис:{" "}
                {ex.lastService?.eventDate
                  ? formatIsoCalendarDateRu(ex.lastService.eventDate)
                  : "—"}
                {"\n"}
                Trigger mode: {ex.triggerMode || "—"}
              </Text>
            </View>
          </ScrollView>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.modalCloseButton, pressed && styles.modalCloseButtonPressed]}
          >
            <Text style={styles.modalCloseButtonText}>Закрыть</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: c.overlayModal,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    maxHeight: 560,
    backgroundColor: c.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    overflow: "hidden",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: c.textPrimary,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalScroll: {
    maxHeight: 420,
  },
  modalScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  modalBlock: {
    marginBottom: 14,
  },
  modalKicker: {
    fontSize: 11,
    fontWeight: "600",
    color: c.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  modalEmphasis: {
    fontSize: 14,
    fontWeight: "600",
    color: c.textPrimary,
  },
  modalBody: {
    fontSize: 14,
    color: c.textMeta,
    lineHeight: 20,
  },
  modalTableBlock: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: c.cardSubtle,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
  },
  modalTableTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: c.textPrimary,
    marginBottom: 6,
  },
  modalMono: {
    fontSize: 12,
    color: c.textMeta,
    lineHeight: 18,
  },
  modalCloseButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.borderStrong,
    alignItems: "center",
  },
  modalCloseButtonPressed: {
    backgroundColor: c.divider,
  },
  modalCloseButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: c.textPrimary,
  },
});
