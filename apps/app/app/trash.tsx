import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import { buildTrashedVehicleViewModel } from "@mototwin/domain";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { getApiBaseUrl } from "../src/api-base-url";
import { ScreenHeader } from "./components/screen-header";

export default function TrashScreen() {
  const apiBaseUrl = getApiBaseUrl();
  const [items, setItems] = useState<Array<ReturnType<typeof buildTrashedVehicleViewModel>>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyVehicleId, setBusyVehicleId] = useState("");

  const loadTrash = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const endpoints = createMotoTwinEndpoints(createApiClient({ baseUrl: apiBaseUrl }));
      const response = await endpoints.getTrashedVehicles();
      setItems((response.vehicles ?? []).map((item) => buildTrashedVehicleViewModel(item)));
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось загрузить Свалку.");
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    void loadTrash();
  }, [loadTrash]);

  const restore = async (vehicleId: string) => {
    try {
      setBusyVehicleId(vehicleId);
      const endpoints = createMotoTwinEndpoints(createApiClient({ baseUrl: apiBaseUrl }));
      await endpoints.restoreVehicleFromTrash(vehicleId);
      setItems((prev) => prev.filter((item) => item.id !== vehicleId));
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось восстановить мотоцикл.");
    } finally {
      setBusyVehicleId("");
    }
  };

  const permanentlyDelete = (vehicleId: string) => {
    Alert.alert("Удалить мотоцикл окончательно?", "Это действие нельзя отменить", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              setBusyVehicleId(vehicleId);
              const endpoints = createMotoTwinEndpoints(createApiClient({ baseUrl: apiBaseUrl }));
              await endpoints.permanentlyDeleteVehicle(vehicleId);
              setItems((prev) => prev.filter((item) => item.id !== vehicleId));
            } catch (requestError) {
              console.error(requestError);
              setError("Не удалось удалить мотоцикл окончательно.");
            } finally {
              setBusyVehicleId("");
            }
          })();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader title="Свалка" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          Здесь хранятся удаленные мотоциклы перед окончательным удалением
        </Text>

        {isLoading ? <Text style={styles.stateText}>Загрузка Свалки...</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!isLoading && !error && items.length === 0 ? (
          <Text style={styles.stateText}>На Свалке пусто</Text>
        ) : null}

        {items.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            <Text style={styles.metaText}>Перемещен: {item.trashedAtLabel}</Text>
            <Text style={styles.metaText}>
              Хранение до: {item.expiresAtLabel}{" "}
              {item.isExpired ? "(Срок хранения истек)" : item.daysRemaining != null ? `(${item.daysRemaining} дн.)` : ""}
            </Text>
            <View style={styles.actionsRow}>
              <Pressable
                onPress={() => void restore(item.id)}
                disabled={busyVehicleId === item.id}
                style={styles.restoreButton}
                accessibilityRole="button"
                accessibilityLabel="Восстановить"
              >
                <MaterialIcons name="undo" size={14} color="#15803d" />
              </Pressable>
              <Pressable
                onPress={() => permanentlyDelete(item.id)}
                disabled={busyVehicleId === item.id}
                style={styles.deleteButton}
                accessibilityRole="button"
                accessibilityLabel="Удалить окончательно"
              >
                <MaterialIcons name="delete-outline" size={14} color="#be123c" />
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: c.canvas },
  content: { padding: 16, gap: 10, paddingBottom: 24 },
  subtitle: { fontSize: 13, color: c.textSecondary },
  stateText: { fontSize: 13, color: c.textSecondary },
  errorText: { fontSize: 13, color: c.error },
  card: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    backgroundColor: c.card,
    padding: 12,
    gap: 4,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: c.textPrimary },
  cardSubtitle: { fontSize: 12, color: c.textSecondary },
  metaText: { fontSize: 11, color: c.textMuted },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  restoreButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#86efac",
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  deleteButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fff1f2",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
