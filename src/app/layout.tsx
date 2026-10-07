import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Lexend, Nunito } from "next/font/google";
import "./globals.css";
import { getDirection, pick } from "@/lib/direction-server";
import { ToastProvider as Toast1 } from "@/components/ui/toast";
import { ToastProvider as Toast2 } from "@/directions/d2/components/ui/toast";
import { ToastProvider as Toast3 } from "@/directions/d3/components/ui/toast";
import { themeScript } from "@/components/shell/theme";

// Direction 2 type (designed for easy reading) and Direction 3 type (rounded, friendly).
const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend", display: "swap" });
const nunito = Nunito({ subsets: ["latin"], weight: ["500", "600", "700", "800", "900"], variable: "--font-nunito", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Spot OS", template: "%s · Spot OS" },
  description: "Studio Spot's internal operating system.",
  robots: { index: false, follow: false },
};

const THEME_COLORS = { 1: ["#ffffff", "#191919"], 2: ["#f2eee4", "#0c0c0c"], 3: ["#ffffff", "#131f24"] } as const;

export async function generateViewport(): Promise<Viewport> {
  const [light, dark] = THEME_COLORS[await getDirection()];
  return {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: light },
      { media: "(prefers-color-scheme: dark)", color: dark },
    ],
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const direction = await getDirection();
  const ToastProvider = await pick({ 1: Toast1, 2: Toast2, 3: Toast3 });
  return (
    <html lang="en" suppressHydrationWarning data-direction={direction} className={`${lexend.variable} ${nunito.variable}`}>
      <body>
        <Script id="theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
