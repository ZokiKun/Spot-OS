import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Lexend } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { themeScript } from "@/components/shell/theme";

// Lexend was designed to reduce visual stress and improve reading — it suits an app meant to be easy to digest.
const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Spot OS", template: "%s · Spot OS" },
  description: "Studio Spot's internal operating system.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2eee4" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0c" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={lexend.variable}>
      <body>
        <Script id="theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
