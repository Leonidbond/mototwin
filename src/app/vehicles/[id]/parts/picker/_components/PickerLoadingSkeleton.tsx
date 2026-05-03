"use client";

import { pickerColors } from "./picker-styles";

/**
 * Каркас страницы подбора на время загрузки мотоцикла и дерева узлов.
 */
export function PickerLoadingSkeleton() {
  const bar = "animate-pulse rounded-lg";
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Загрузка подбора">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2">
        <div className={`${bar} h-[52px]`} style={{ backgroundColor: pickerColors.surfaceMuted }} />
        <div className={`${bar} h-[52px]`} style={{ backgroundColor: pickerColors.surfaceMuted }} />
        <div className={`${bar} h-[52px]`} style={{ backgroundColor: pickerColors.surfaceMuted }} />
      </div>
      <div className={`${bar} h-12 w-full max-w-xl`} style={{ backgroundColor: pickerColors.surfaceMuted }} />
      <div className={`${bar} h-36 w-full`} style={{ backgroundColor: pickerColors.surfaceMuted }} />
      <div className={`${bar} h-28 w-full`} style={{ backgroundColor: pickerColors.surfaceMuted }} />
      <div className={`${bar} h-48 w-full`} style={{ backgroundColor: pickerColors.surfaceMuted }} />
    </div>
  );
}
