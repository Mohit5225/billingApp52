import type { Metadata } from "next";

import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Billing App",
  description: "Modern Billing and Accounting App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-slate-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
