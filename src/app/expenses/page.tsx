import { Suspense } from "react";
import { ExpensesPageClient } from "./ExpensesPageClient";

export default function ExpensesPage() {
  return (
    <Suspense fallback={null}>
      <ExpensesPageClient
        title="Расходы гаража"
        subtitle="Только технические расходы: обслуживание, запчасти, ремонт, диагностика и работа сервиса. Бензин, страховка, штрафы, парковка, мойка и экипировка не включаются."
      />
    </Suspense>
  );
}
