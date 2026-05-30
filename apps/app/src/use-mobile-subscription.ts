import { useCallback, useEffect, useState } from "react";
import type { SubscriptionCapabilities, SubscriptionCurrentResponse, SubscriptionPlan } from "@mototwin/types";
import { createMobileApiClient } from "./create-mobile-api-client";

export function useMobileSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionCurrentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const value = await createMobileApiClient().getSubscriptionCurrent();
      setSubscription(value);
    } catch {
      setSubscription(null);
      setError("Не удалось загрузить подписку.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const plan: SubscriptionPlan = subscription?.plan ?? "FREE";
  /** Undefined while loading — avoid treating Pro/Rider as Free before API responds. */
  const capabilities: SubscriptionCapabilities | undefined = subscription?.capabilities;

  return { subscription, plan, capabilities, isLoading, error, reload };
}
