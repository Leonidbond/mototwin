import { VehicleDetailClient } from "../vehicle-detail-client";

type VehicleNodesPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function VehicleNodesPage({ params }: VehicleNodesPageProps) {
  return <VehicleDetailClient params={params} pageView="nodeTree" />;
}
