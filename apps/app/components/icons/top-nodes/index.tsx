import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  TOP_NODE_MATERIAL_COMMUNITY_ICONS,
  type TopNodeIconKey,
} from "@mototwin/icons";

export interface TopNodeIconProps {
  iconKey: TopNodeIconKey;
  size?: number;
  color?: string;
}

/**
 * Shared Expo renderer for top-node icons.
 * Until we add `react-native-svg`, this maps the unified icon keys to
 * MaterialCommunityIcons glyphs from one centralized table.
 */
export function TopNodeIcon({
  iconKey,
  size = 18,
  color = "#9AA7B4",
}: TopNodeIconProps) {
  return (
    <MaterialCommunityIcons
      name={TOP_NODE_MATERIAL_COMMUNITY_ICONS[iconKey] as never}
      size={size}
      color={color}
    />
  );
}
