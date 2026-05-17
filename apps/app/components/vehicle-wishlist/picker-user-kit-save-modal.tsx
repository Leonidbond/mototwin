import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  advancedServiceKitSnapshotFromPickerLines,
  stripAddServiceEventFormValuesForUserTemplate,
} from "@mototwin/domain";
import type { CreateUserServiceEventFormTemplateBody, PartSkuViewModel } from "@mototwin/types";
import { productSemanticColors as c } from "@mototwin/design-tokens";

export type PickerUserKitSaveLine = {
  nodeId: string | null;
  sku: PartSkuViewModel;
  quantity: number;
};

export function PickerUserKitSaveModal(props: {
  visible: boolean;
  onClose: () => void;
  initialTitle: string;
  lines: PickerUserKitSaveLine[];
  onSubmit: (body: CreateUserServiceEventFormTemplateBody) => Promise<unknown>;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [includeInPicker, setIncludeInPicker] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (props.visible) {
      setName(props.initialTitle.trim() || "Мой комплект");
      setIncludeInPicker(true);
      setErr("");
      setBusy(false);
    }
  }, [props.visible, props.initialTitle]);

  const handleSubmit = async () => {
    if (props.lines.length === 0) {
      setErr("Добавьте в корзину хотя бы одну деталь с привязкой к узлу.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const snap = advancedServiceKitSnapshotFromPickerLines({
        title: name.trim() || "Мой комплект",
        lines: props.lines.map((l) => ({
          nodeId: l.nodeId,
          sku: l.sku,
          quantity: l.quantity,
        })),
      });
      if (!snap) {
        setErr(
          "Не удалось собрать комплект: у позиций должен быть узел (или primaryNode у SKU)."
        );
        return;
      }
      const stripped = stripAddServiceEventFormValuesForUserTemplate(snap);
      await props.onSubmit({
        baseTitle: name.trim() || null,
        formSnapshot: stripped,
        includeInPartPicker: includeInPicker,
      });
      props.onSuccess();
      props.onClose();
    } catch (e) {
      setErr(
        e instanceof Error && e.message.trim()
          ? e.message.trim()
          : "Не удалось сохранить комплект."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={props.visible} animationType="fade" transparent onRequestClose={props.onClose}>
      <KeyboardAvoidingView
        style={styles.kavRoot}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => !busy && props.onClose()} />
        <View style={styles.card}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.title}>Сохранить как комплект</Text>
            <Text style={styles.hint}>
              Комплект появится в разделе «Мои комплекты» и как шаблон подробного режима в журнале
              обслуживания.
            </Text>

            <Text style={styles.label}>Название</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              maxLength={200}
              editable={!busy}
              placeholder="Мой комплект"
              placeholderTextColor={c.textMuted}
              style={styles.input}
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>
                Показывать в подборе деталей как комплект обслуживания
              </Text>
              <Switch
                value={includeInPicker}
                onValueChange={setIncludeInPicker}
                disabled={busy}
              />
            </View>

            <Text style={styles.countLine}>Позиций в комплекте: {props.lines.length}</Text>

            {err ? <Text style={styles.err}>{err}</Text> : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              onPress={() => !busy && props.onClose()}
              disabled={busy}
              style={({ pressed }) => [styles.btnSecondary, pressed && !busy && { opacity: 0.88 }]}
            >
              <Text style={styles.btnSecondaryText}>Отмена</Text>
            </Pressable>
            <Pressable
              onPress={() => void handleSubmit()}
              disabled={busy || props.lines.length === 0}
              style={({ pressed }) => [
                styles.btnPrimary,
                (busy || props.lines.length === 0) && styles.btnPrimaryDisabled,
                pressed && !busy && props.lines.length > 0 && { opacity: 0.92 },
              ]}
            >
              <Text style={styles.btnPrimaryText}>{busy ? "Сохраняем…" : "Сохранить"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kavRoot: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: "rgba(3, 7, 18, 0.72)",
  },
  card: {
    maxHeight: "88%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.card,
    overflow: "hidden",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: c.textPrimary,
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: c.textMuted,
    lineHeight: 17,
  },
  label: {
    marginTop: 14,
    fontSize: 12,
    fontWeight: "700",
    color: c.textSecondary,
  },
  input: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.cardSubtle,
    color: c.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  switchRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  switchLabel: {
    flex: 1,
    fontSize: 12,
    color: c.textMuted,
    lineHeight: 16,
  },
  countLine: {
    marginTop: 10,
    fontSize: 11,
    color: c.textMuted,
  },
  err: {
    marginTop: 10,
    fontSize: 12,
    color: c.error,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: c.borderStrong,
  },
  btnSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.borderStrong,
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: c.textPrimary,
  },
  btnPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: c.primaryAction,
  },
  btnPrimaryDisabled: { opacity: 0.5 },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: "800",
    color: c.onPrimaryAction,
  },
});
