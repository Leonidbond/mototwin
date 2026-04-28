import { VehicleDetailClient } from "../vehicle-detail-client";

type VehiclePartsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function VehiclePartsPage({ params }: VehiclePartsPageProps) {
  return <VehicleDetailClient params={params} pageView="partsSelection" />;
}
