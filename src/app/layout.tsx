import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import PWARegister from "@/components/layout/PWARegister";
import AmbientPond from "@/components/ui/AmbientPond";
import { DataProvider } from "@/lib/store";
import QuickAdd from "@/components/ui/QuickAdd";
import CommandPalette from "@/components/ui/CommandPalette";
import SakuraPetals from "@/components/ui/SakuraPetals";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "555 Command Center",
  description: "555 Digital · Business Dashboard",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#00D4FF" />
        <link rel="icon" type="image/svg+xml" href="/icon-192.svg" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
      </head>
      <body className="min-h-full bg-background text-text-primary">
        <AmbientPond />
        <SakuraPetals />
        <DataProvider>
          <Sidebar />
          <main className="ml-0 lg:ml-72 min-h-screen p-3 md:p-6 transition-all">
            {children}
          </main>
          <QuickAdd />
          <CommandPalette />
          <PWARegister />
        </DataProvider>
      </body>
    </html>
  );
}
