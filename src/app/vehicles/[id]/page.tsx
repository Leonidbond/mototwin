import { VehicleDetailClient } from "./vehicle-detail-client";

type VehiclePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function VehiclePage({ params }: VehiclePageProps) {
  return <VehicleDetailClient params={params} pageView="dashboard" />;
}
