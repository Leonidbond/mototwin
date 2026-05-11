"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import styles from "./InternalPageChrome.module.css";

export type InternalPageBreadcrumb = {
  label: string;
  href?: string;
};

export type InternalPageChromeVariant = "garageDark" | "journalRef" | "expenses" | "garageTokens";

export type InternalPageChromeProps = {
  variant: InternalPageChromeVariant;
  onBack: () => void;
  backLabel?: string;
  breadcrumbs: InternalPageBreadcrumb[];
  title?: ReactNode;
  /** Сразу под заголовком (например переключатель режима формы ТО). */
  belowTitle?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  titleExtra?: ReactNode;
  navRowEnd?: ReactNode;
  omitTitleBand?: boolean;
  /** `belowTitleBand` — кнопки под заголовком/подзаголовком, не справа от них (корзина, журнал). */
  actionsPlacement?: "besideTitle" | "belowTitleBand";
};

export function InternalPageChrome({
  variant,
  onBack,
  backLabel = "Назад",
  breadcrumbs,
  title,
  belowTitle,
  subtitle,
  actions,
  titleExtra,
  navRowEnd,
  omitTitleBand = false,
  actionsPlacement = "besideTitle",
}: InternalPageChromeProps) {
  const rootClass = [
    styles.root,
    variant === "garageDark" && styles.variantGarageDark,
    variant === "journalRef" && styles.variantJournalRef,
    variant === "expenses" && styles.variantExpenses,
    variant === "garageTokens" && styles.variantGarageTokens,
    omitTitleBand && variant === "garageTokens" && styles.omitTitleBand,
  ]
    .filter(Boolean)
    .join(" ");

  const tokenCrumbLink = variant === "garageTokens" ? { color: c.textSecondary } : undefined;
  const tokenCrumbCurrent = variant === "garageTokens" ? { color: c.textPrimary } : undefined;
  const tokenBack = variant === "garageTokens" ? { color: c.textSecondary } : undefined;

  const subtitleStyle =
    variant === "journalRef"
      ? { color: c.textMuted }
      : variant === "expenses"
        ? { color: c.textSecondary }
        : undefined;

  return (
    <div className={rootClass}>
      <div className={styles.navBlock}>
        <div className={styles.navLeft}>
          <button
            type="button"
            className={styles.backBtn}
            style={tokenBack}
            onClick={onBack}
            aria-label={backLabel}
          >
            ←
          </button>
          <span className="sr-only">{backLabel}</span>
          <ol className={styles.crumbs}>
            {breadcrumbs.map((crumb, i) => (
              <li key={`${i}-${crumb.label}`} className={styles.crumbItem}>
                {i > 0 ? (
                  <span className={styles.crumbSep} aria-hidden>
                    /
                  </span>
                ) : null}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className={styles.crumbLink}
                    style={tokenCrumbLink}
                    prefetch={false}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className={styles.crumbCurrent}
                    style={tokenCrumbCurrent}
                    aria-current="page"
                  >
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
        {navRowEnd ? <div className={styles.navEnd}>{navRowEnd}</div> : null}
      </div>

      {!omitTitleBand ? (
        <div
          className={
            actionsPlacement === "belowTitleBand"
              ? `${styles.titleBlock} ${styles.titleBlockActionsBelow}`
              : styles.titleBlock
          }
        >
          <div className={styles.titleStack}>
            {title != null && title !== "" ? <h1 className={styles.title}>{title}</h1> : null}
            {belowTitle ? <div className={styles.belowTitle}>{belowTitle}</div> : null}
            {subtitle ? (
              <p className={styles.subtitle} style={subtitleStyle}>
                {subtitle}
              </p>
            ) : null}
            {titleExtra ? <div className={styles.titleExtra}>{titleExtra}</div> : null}
          </div>
          {actions ? (
            <div
              className={
                actionsPlacement === "belowTitleBand" ? styles.titleActionsBelow : styles.titleActions
              }
            >
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
