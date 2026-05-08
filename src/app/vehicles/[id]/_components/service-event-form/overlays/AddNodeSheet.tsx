"use client";

import { NodePickerModal } from "../../node-picker/NodePickerModal";

export type LeafSelectOption = {
  id: string;
  name: string;
  level: number;
  pathLabel?: string;
};

export type AddNodeSheetProps = {
  open: boolean;
  onClose: () => void;
  options: LeafSelectOption[];
  topOptions?: LeafSelectOption[];
  /** Already-used node ids — excluded from selection. */
  usedNodeIds: Set<string>;
  onConfirm: (nodeIds: string[]) => void;
};

export function AddNodeSheet({ open, onClose, options, topOptions, usedNodeIds, onConfirm }: AddNodeSheetProps) {
  return (
    <NodePickerModal
      open={open}
      title="Добавить узлы"
      mode="multi"
      options={options}
      topOptions={topOptions}
      disabledIds={usedNodeIds}
      confirmLabel="Добавить"
      emptyLabel="Нет доступных узлов для добавления."
      searchPlaceholder="Поиск узла…"
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
