"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect, type ReactNode } from "react";

/** Required for reliable `signIn()` CSRF + OAuth redirects from the login page. */
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7691/ingest/26105bb6-0b1c-4ea6-81d5-5f2a1ba438cd",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"6800ea"},body:JSON.stringify({sessionId:"6800ea",runId:"run3",hypothesisId:"H9",location:"src/components/auth/AuthSessionProvider.tsx:12",message:"AuthSessionProvider mounted",data:{path:typeof window!=="undefined"?window.location.pathname:"server"},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const onError = (event: ErrorEvent) => {
      // #region agent log
      fetch("http://127.0.0.1:7691/ingest/26105bb6-0b1c-4ea6-81d5-5f2a1ba438cd",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"6800ea"},body:JSON.stringify({sessionId:"6800ea",runId:"run3",hypothesisId:"H9",location:"src/components/auth/AuthSessionProvider.tsx:16",message:"window error (global)",data:{message:event.message,file:event.filename,line:event.lineno,col:event.colno},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      // #region agent log
      fetch("http://127.0.0.1:7691/ingest/26105bb6-0b1c-4ea6-81d5-5f2a1ba438cd",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"6800ea"},body:JSON.stringify({sessionId:"6800ea",runId:"run3",hypothesisId:"H9",location:"src/components/auth/AuthSessionProvider.tsx:21",message:"unhandled rejection (global)",data:{reason:String(event.reason)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return <SessionProvider refetchOnWindowFocus={false}>{children}</SessionProvider>;
}
