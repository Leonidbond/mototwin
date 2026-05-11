"use client";

import { NodePickerModal, type SharedNodePickerOption } from "../../node-picker/NodePickerModal";

export type AddNodeSheetProps = {
  open: boolean;
  onClose: () => void;
  options: SharedNodePickerOption[];
  topOptions?: SharedNodePickerOption[];
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
