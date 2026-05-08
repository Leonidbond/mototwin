import { Suspense } from "react";
import { ServiceEventCreateClient } from "./ServiceEventCreateClient";

export default function ServiceEventNewPage() {
  return (
    <Suspense fallback={null}>
      <ServiceEventCreateClient />
    </Suspense>
  );
}
