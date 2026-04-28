"use client";

import { useParams } from "next/navigation";
import { ExpensesPageClient } from "../../../expenses/ExpensesPageClient";

export default function VehicleExpensesPage() {
  const params = useParams<{ id: string }>();
  const vehicleId = params.id;
  return (
    <ExpensesPageClient
      vehicleId={vehicleId}
      title="Расходы мотоцикла"
      subtitle="Только технические расходы по этому мотоциклу: обслуживание, запчасти, ремонт, диагностика и работа сервиса."
      backHref={`/vehicles/${vehicleId}`}
    />
  );
}
