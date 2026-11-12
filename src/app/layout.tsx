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
    // Match the explicit black-translucent meta below so content can paint
    // under the status bar; the opaque mobile header fills the safe area.
    statusBarStyle: "black-translucent",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F3EF" },
    { media: "(prefers-color-scheme: dark)", color: "#0F0F10" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${outfit.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ExpnsTracker" />
        <link rel="icon" href={withBase("/favicon.svg")} type="image/svg+xml" />
        <link rel="icon" href={withBase("/favicon-32.png")} type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href={withBase("/apple-touch-icon.png")} sizes="180x180" />
        <link
          rel="preload"
          href={withBase("/sql-wasm.wasm")}
          as="fetch"
          crossOrigin="anonymous"
        />
      </head>
      <body className="h-full overflow-hidden bg-background font-sans text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
