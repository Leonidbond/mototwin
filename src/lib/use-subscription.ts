"use client";

import { useEffect, useState } from "react";
import type { SubscriptionCurrentResponse } from "@mototwin/types";
import { createWebApiClient } from "@/lib/create-web-api-client";

const api = createWebApiClient();

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionCurrentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void api
      .getSubscriptionCurrent()
      .then((response) => {
        if (cancelled) return;
        setSubscription(response);
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load subscription");
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { subscription, isLoading, error, setSubscription };
}
