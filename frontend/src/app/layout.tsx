import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Billing App",
  description: "Modern Billing and Accounting App",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Billing App",
    statusBarStyle: "black-translucent",
  },
  icons: [
    {
      rel: "icon",
      url: "/icons/icon-192.png",
      type: "image/png",
      sizes: "192x192",
    },
    {
      rel: "icon",
      url: "/icons/icon-512.png",
      type: "image/png",
      sizes: "512x512",
    },
    {
      rel: "apple-touch-icon",
      url: "/icons/apple-touch-icon.png",
      type: "image/png",
      sizes: "180x180",
    },
  ],
};

export const viewport: Viewport = {
  themeColor: "#0B1021",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-canvas text-slate-900 antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
