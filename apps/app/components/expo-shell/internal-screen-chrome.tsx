import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { HelpTriggerButton } from "../../src/components/app-help-fab";

export type InternalScreenCrumb = {
  label: string;
  /** Expo Router path, e.g. `/` or `/vehicles/[id]` */
  href?: string;
};

export function InternalScreenChrome(props: {
  crumbs: InternalScreenCrumb[];
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: ReactNode;
  /** Под строкой с крошками, над заголовком (например плашка мотоцикла). */
  belowNavRow?: ReactNode;
  showHelp?: boolean;
}) {
  const router = useRouter();
  const { crumbs, title, subtitle, onBack, actions, belowNavRow, showHelp = true } = props;

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.navRow}>
        <Pressable
          onPress={handleBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Назад"
          style={({ pressed }) => [styles.backPill, pressed && styles.backPillPressed]}
        >
          <MaterialIcons name="chevron-left" size={20} color={c.textPrimary} />
        </Pressable>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.crumbsScroll}
          contentContainerStyle={styles.crumbsContent}
        >
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            const key = `${index}-${crumb.label}`;
            return (
              <View key={key} style={styles.crumbSegment}>
                {index > 0 ? (
                  <MaterialIcons name="chevron-right" size={14} color={c.textMuted} style={styles.crumbSep} />
                ) : null}
                {crumb.href ? (
                  <Pressable
                    onPress={() => router.push(crumb.href)}
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    accessibilityRole="link"
                    accessibilityLabel={crumb.label}
                  >
                    <Text numberOfLines={1} style={[styles.crumbText, styles.crumbLink]}>
                      {crumb.label}
                    </Text>
                  </Pressable>
                ) : (
                  <Text
                    numberOfLines={1}
                    style={[styles.crumbText, isLast ? styles.crumbCurrent : styles.crumbMuted]}
                  >
                    {crumb.label}
                  </Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>

      {belowNavRow ? <View style={styles.belowNavSlot}>{belowNavRow}</View> : null}

      <View style={styles.titleRow}>
        <View style={styles.titleStack}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={3}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.titleActions}>
          {actions ?? null}
          {showHelp ? <HelpTriggerButton size={28} /> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    backgroundColor: c.canvas,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 0,
    paddingBottom: 4,
    minHeight: 36,
  },
  backPill: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.card,
  },
  backPillPressed: {
    backgroundColor: c.cardMuted,
  },
  crumbsScroll: {
    flex: 1,
    minWidth: 0,
  },
  crumbsContent: {
    flexDirection: "row",
    alignItems: "center",
    flexGrow: 1,
    paddingRight: 4,
  },
  crumbSegment: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 220,
  },
  crumbSep: {
    marginHorizontal: 2,
    opacity: 0.65,
  },
  crumbText: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  crumbLink: {
    color: c.textSecondary,
    textDecorationLine: "underline",
  },
  crumbMuted: {
    color: c.textMuted,
  },
  crumbCurrent: {
    color: c.textPrimary,
  },
  belowNavSlot: {
    width: "100%",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingTop: 2,
    paddingBottom: 10,
  },
  titleStack: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: c.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    color: c.textSecondary,
  },
  titleActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
});
