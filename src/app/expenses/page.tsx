import { ExpensesPageClient } from "./ExpensesPageClient";

export default function ExpensesPage() {
  return (
    <ExpensesPageClient
      title="Расходы гаража"
      subtitle="Только технические расходы: обслуживание, запчасти, ремонт, диагностика и работа сервиса. Бензин, страховка, штрафы, парковка, мойка и экипировка не включаются."
    />
  );
}
