import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { Providers } from "@/components/providers";
import { withBase } from "@/lib/paths";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ExpnsTracker",
  description: "Debiti, spese, salvadanai e idee di investimento. Tutto in euro, sul tuo iPhone.",
  applicationName: "ExpnsTracker",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ExpnsTracker",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: withBase("/favicon.svg"), type: "image/svg+xml" },
      { url: withBase("/favicon-32.png"), sizes: "32x32", type: "image/png" },
      { url: withBase("/icon-192.png"), sizes: "192x192", type: "image/png" },
      { url: withBase("/icon-512.png"), sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: withBase("/apple-touch-icon.png"), sizes: "180x180" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "ExpnsTracker",
  },
};

export const viewport: Viewport = {
  themeColor: "#F4F3EF",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${outfit.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ExpnsTracker" />
        <link rel="icon" href={withBase("/favicon.svg")} type="image/svg+xml" />
        <link rel="icon" href={withBase("/favicon-32.png")} type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href={withBase("/apple-touch-icon.png")} sizes="180x180" />
      </head>
      <body className="min-h-full bg-background font-sans text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
