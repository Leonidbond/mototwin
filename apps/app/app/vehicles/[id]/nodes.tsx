import { VehicleDetailScreen } from "./index";

/**
 * Путь `/vehicles/[id]/nodes` открывает полный экран состояния узлов.
 */
export default function VehicleNodesRoute() {
  return <VehicleDetailScreen forcedView="nodes" />;
}
