"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getWebSession } from "@/lib/web-api-dedup";

type AuthGateProps = {
  children: ReactNode;
};

/**
 * Redirects to /login when session is missing (production and dev without dev switcher).
 */
export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7691/ingest/26105bb6-0b1c-4ea6-81d5-5f2a1ba438cd",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"6800ea"},body:JSON.stringify({sessionId:"6800ea",runId:"run1",hypothesisId:"H1",location:"src/components/auth/AuthGate.tsx:20",message:"AuthGate effect start",data:{path:typeof window!=="undefined"?window.location.pathname:"server"},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    let cancelled = false;
    (async () => {
      try {
        await getWebSession();
        // #region agent log
        fetch("http://127.0.0.1:7691/ingest/26105bb6-0b1c-4ea6-81d5-5f2a1ba438cd",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"6800ea"},body:JSON.stringify({sessionId:"6800ea",runId:"run1",hypothesisId:"H1",location:"src/components/auth/AuthGate.tsx:26",message:"AuthGate getWebSession success",data:{cancelled},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        if (!cancelled) setReady(true);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "";
        // #region agent log
        fetch("http://127.0.0.1:7691/ingest/26105bb6-0b1c-4ea6-81d5-5f2a1ba438cd",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"6800ea"},body:JSON.stringify({sessionId:"6800ea",runId:"run1",hypothesisId:"H1",location:"src/components/auth/AuthGate.tsx:33",message:"AuthGate getWebSession failed",data:{message},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        if (message.toLowerCase().includes("требуется вход")) {
          // #region agent log
          fetch("http://127.0.0.1:7691/ingest/26105bb6-0b1c-4ea6-81d5-5f2a1ba438cd",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"6800ea"},body:JSON.stringify({sessionId:"6800ea",runId:"run3",hypothesisId:"H6",location:"src/components/auth/AuthGate.tsx:37",message:"AuthGate redirecting to login (unauthorized)",data:{path:typeof window!=="undefined"?window.location.pathname:"server"},timestamp:Date.now()})}).catch(()=>{});
          // #endregion
          router.replace("/login");
          return;
        }
        // #region agent log
        fetch("http://127.0.0.1:7691/ingest/26105bb6-0b1c-4ea6-81d5-5f2a1ba438cd",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"6800ea"},body:JSON.stringify({sessionId:"6800ea",runId:"run3",hypothesisId:"H6",location:"src/components/auth/AuthGate.tsx:43",message:"AuthGate redirecting to login (error query)",data:{message,path:typeof window!=="undefined"?window.location.pathname:"server"},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        router.replace(
          `/login?next=${encodeURIComponent(
            typeof window !== "undefined"
              ? window.location.pathname + window.location.search
              : "/garage"
          )}&error=${encodeURIComponent(message || "Не удалось проверить сессию.")}`
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div
        className="min-h-full flex items-center justify-center"
        style={{ backgroundColor: "#080d12", color: "#8b9aab" }}
      >
        Загрузка…
      </div>
    );
  }

  return <>{children}</>;
}
