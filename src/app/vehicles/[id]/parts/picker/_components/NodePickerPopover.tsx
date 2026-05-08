"use client";

import {
  NodePickerModal,
  type SharedNodePickerOption,
} from "../../../_components/node-picker/NodePickerModal";

export type NodePickerOption = SharedNodePickerOption & { pathLabel: string };

export function NodePickerPopover(props: {
  isOpen: boolean;
  options: NodePickerOption[];
  /** When set and non-empty, shows «Топ-узлы» toggle filtered to this list. */
  topLeafOptions?: NodePickerOption[];
  onSelect: (nodeId: string) => void;
  onClose: () => void;
}) {
  return (
    <NodePickerModal
      open={props.isOpen}
      options={props.options}
      topOptions={props.topLeafOptions}
      onSelect={props.onSelect}
      onClose={props.onClose}
    />
  );
}
