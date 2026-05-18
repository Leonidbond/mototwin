import { useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
  /** Деклаттер-режим мобильной шапки: compact crumbs + collapse on scroll. */
  declutterMobile?: boolean;
  /** Текущий вертикальный скролл контента для collapse-состояния. */
  scrollOffsetY?: number;
  /** Порог collapse (по умолчанию ~52px). */
  collapseThreshold?: number;
}) {
  const router = useRouter();
  const {
    crumbs,
    title,
    subtitle,
    onBack,
    actions,
    belowNavRow,
    showHelp = true,
    declutterMobile = false,
    scrollOffsetY = 0,
    collapseThreshold = 52,
  } = props;
  const [fullPathOpen, setFullPathOpen] = useState(false);
  const currentCrumb = crumbs.at(-1);
  const isCollapsed = declutterMobile && scrollOffsetY >= collapseThreshold;

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
        {declutterMobile ? (
          <Pressable
            onPress={() => crumbs.length > 1 && setFullPathOpen(true)}
            disabled={crumbs.length <= 1}
            hitSlop={8}
            style={({ pressed }) => [
              styles.compactCrumbButton,
              crumbs.length <= 1 && styles.compactCrumbButtonDisabled,
              pressed && crumbs.length > 1 && styles.compactCrumbButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Открыть полный путь раздела"
          >
            <Text numberOfLines={1} style={[styles.crumbText, styles.crumbCurrent, styles.compactCrumbText]}>
              {currentCrumb?.label ?? title}
            </Text>
            {crumbs.length > 1 ? (
              <MaterialIcons name="unfold-more" size={16} color={c.textMuted} />
            ) : null}
          </Pressable>
        ) : (
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
        )}
      </View>

      {!isCollapsed && belowNavRow ? <View style={styles.belowNavSlot}>{belowNavRow}</View> : null}

      <View style={styles.titleRow}>
        <View style={styles.titleStack}>
          <Text style={styles.title} numberOfLines={isCollapsed ? 1 : 2}>
            {title}
          </Text>
          {!isCollapsed && subtitle ? (
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
      {declutterMobile ? (
        <Modal
          transparent
          visible={fullPathOpen}
          animationType="fade"
          onRequestClose={() => setFullPathOpen(false)}
        >
          <View style={styles.pathModalRoot}>
            <Pressable
              style={styles.pathModalScrim}
              onPress={() => setFullPathOpen(false)}
              accessibilityLabel="Закрыть путь раздела"
            />
            <View style={styles.pathModalCard}>
              <Text style={styles.pathModalTitle}>Путь раздела</Text>
              {crumbs.map((crumb, index) => {
                const isLast = index === crumbs.length - 1;
                return (
                  <Pressable
                    key={`${index}-${crumb.label}`}
                    disabled={!crumb.href || isLast}
                    onPress={() => {
                      if (!crumb.href) return;
                      setFullPathOpen(false);
                      router.push(crumb.href);
                    }}
                    style={({ pressed }) => [
                      styles.pathModalRow,
                      isLast && styles.pathModalRowCurrent,
                      pressed && !isLast && styles.pathModalRowPressed,
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[styles.pathModalLabel, isLast ? styles.pathModalLabelCurrent : styles.pathModalLabelLink]}
                    >
                      {crumb.label}
                    </Text>
                    {!isLast && crumb.href ? (
                      <MaterialIcons name="chevron-right" size={16} color={c.textMuted} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Modal>
      ) : null}
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
  compactCrumbButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  compactCrumbButtonDisabled: {
    opacity: 0.9,
  },
  compactCrumbButtonPressed: {
    opacity: 0.82,
  },
  compactCrumbText: {
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
  pathModalRoot: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  pathModalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  pathModalCard: {
    zIndex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.card,
    overflow: "hidden",
  },
  pathModalTitle: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "800",
    color: c.textPrimary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  pathModalRow: {
    minHeight: 42,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  pathModalRowCurrent: {
    backgroundColor: c.cardMuted,
  },
  pathModalRowPressed: {
    opacity: 0.86,
  },
  pathModalLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: "600",
  },
  pathModalLabelLink: {
    color: c.textSecondary,
  },
  pathModalLabelCurrent: {
    color: c.textPrimary,
  },
});
