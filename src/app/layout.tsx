import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import Script from "next/script";
import { AppHelpFab } from "../components/app-help-fab";
import { EXTENSION_DOM_SANITIZE_SCRIPT } from "../lib/extension-dom-sanitize-script";
import "./globals.css";

/** UI sans — Inter matches garage web reference (geometric UI sans, Cyrillic). */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MotoTwin",
  description: "MotoTwin — цифровой двойник мотоцикла: ТО, расходы, напоминания.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /* Extensions may inject attributes on <html>/<body> before hydrate — suppressHydrationWarning avoids false positives. */
  return (
    <html
      lang="ru"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      style={{
        backgroundColor: "#080d12",
        colorScheme: "dark",
      }}
      suppressHydrationWarning
    >
      <body
        className="mototwin-dark min-h-full flex flex-col"
        style={{
          margin: 0,
          backgroundColor: "#080d12",
        }}
        suppressHydrationWarning
      >
        <Script
          id="mototwin-extension-dom-sanitize"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: EXTENSION_DOM_SANITIZE_SCRIPT }}
        />
        {children}
        <AppHelpFab />
      </body>
    </html>
  );
}
