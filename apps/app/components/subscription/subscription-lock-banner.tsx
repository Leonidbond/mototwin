import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import type { SubscriptionPlan } from "@mototwin/types";

type SubscriptionLockBannerProps = {
  title: string;
  description: string;
  requiredPlan?: Exclude<SubscriptionPlan, "FREE">;
  actionLabel?: string;
  /** Карточка в стиле экрана гаража / дерева узлов. */
  variant?: "default" | "surface";
};

export function SubscriptionLockBanner({
  title,
  description,
  requiredPlan,
  actionLabel = "Сравнить тарифы",
  variant = "default",
}: SubscriptionLockBannerProps) {
  const router = useRouter();
  const surface = variant === "surface";

  return (
    <View style={[styles.wrap, surface && styles.wrapSurface]}>
      <Text style={[styles.title, surface && styles.titleSurface]}>{title}</Text>
      <Text style={[styles.description, surface && styles.descriptionSurface]}>{description}</Text>
      {requiredPlan ? (
        <Text style={[styles.planLine, surface && styles.planLineSurface]}>
          Требуется тариф: <Text style={[styles.planStrong, surface && styles.planStrongSurface]}>{requiredPlan}</Text>
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/subscription")}
        style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
      >
        <Text style={[styles.linkText, surface && styles.linkTextSurface]}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: "rgba(251, 146, 60, 0.35)",
    backgroundColor: "rgba(251, 146, 60, 0.12)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: c.textPrimary,
  },
  description: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
  planLine: {
    fontSize: 12,
    color: c.textSecondary,
  },
  planStrong: {
    fontWeight: "700",
    color: c.textPrimary,
  },
  link: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingVertical: 2,
  },
  linkPressed: {
    opacity: 0.75,
  },
  linkText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400e",
  },
  wrapSurface: {
    borderColor: c.border,
    backgroundColor: c.cardMuted,
  },
  titleSurface: {
    color: c.textPrimary,
  },
  descriptionSurface: {
    color: c.textSecondary,
  },
  planLineSurface: {
    color: c.textMuted,
  },
  planStrongSurface: {
    color: c.textPrimary,
  },
  linkTextSurface: {
    color: c.primaryAction,
  },
});
