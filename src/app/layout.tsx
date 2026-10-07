import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { themeScript } from "@/components/shell/theme";

export const metadata: Metadata = {
  title: { default: "Spot OS", template: "%s · Spot OS" },
  description: "Studio Spot's internal operating system.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#191919" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The classic tokens in src/styles/direction-1.css are scoped to data-direction="1".
    <html lang="en" suppressHydrationWarning data-direction="1">
      <body>
        <Script id="theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
