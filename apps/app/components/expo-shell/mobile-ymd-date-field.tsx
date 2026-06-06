import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { formatIsoCalendarDateRu } from "@mototwin/domain";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { localDateToYmd, parseYmdToLocalDate } from "../../src/mobile-ymd-date";

export function MobileYmdDateField(props: {
  label: string;
  value: string;
  onChange: (ymd: string) => void;
  placeholder?: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const trimmed = props.value.trim();
  const displayLabel = trimmed
    ? formatIsoCalendarDateRu(`${trimmed.slice(0, 10)}T12:00:00`)
    : (props.placeholder ?? "Выберите дату");

  return (
    <View style={styles.root}>
      <Text style={styles.label}>{props.label}</Text>
      <Pressable
        onPress={() => setPickerOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
        accessibilityRole="button"
        accessibilityLabel={props.label}
      >
        <Text style={[styles.triggerText, !trimmed && styles.triggerPlaceholder]}>{displayLabel}</Text>
      </Pressable>
      {pickerOpen ? (
        <View style={styles.pickerBlock}>
          <DateTimePicker
            value={parseYmdToLocalDate(trimmed)}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            {...(Platform.OS === "ios"
              ? {
                  themeVariant: "dark" as const,
                  textColor: c.textPrimary,
                  accentColor: c.primaryAction,
                }
              : { accentColor: c.primaryAction })}
            onChange={(ev, date) => {
              if (Platform.OS === "android") {
                setPickerOpen(false);
                if (ev.type === "dismissed" || !date) {
                  return;
                }
                props.onChange(localDateToYmd(date));
                return;
              }
              if (date) {
                props.onChange(localDateToYmd(date));
              }
            }}
          />
          {Platform.OS === "ios" ? (
            <Pressable style={styles.doneBtn} onPress={() => setPickerOpen(false)}>
              <Text style={styles.doneBtnText}>Готово</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    color: c.textMuted,
    marginBottom: 0,
  },
  trigger: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  triggerPressed: {
    opacity: 0.88,
  },
  triggerText: {
    fontSize: 14,
    color: c.textPrimary,
    fontWeight: "600",
  },
  triggerPlaceholder: {
    color: c.textMuted,
    fontWeight: "500",
  },
  pickerBlock: {
    marginTop: 4,
  },
  doneBtn: {
    marginTop: 8,
    alignSelf: "flex-end",
    borderRadius: 10,
    backgroundColor: c.primaryAction,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  doneBtnText: {
    color: c.onPrimaryAction,
    fontSize: 13,
    fontWeight: "800",
  },
});
