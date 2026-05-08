import { Suspense } from "react";
import { ServiceEventEditClient } from "./ServiceEventEditClient";

export default function ServiceEventEditPage() {
  return (
    <Suspense fallback={null}>
      <ServiceEventEditClient />
    </Suspense>
  );
}
