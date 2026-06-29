import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import MobileTabBar from "@/components/layout/MobileTabBar";
import PWARegister from "@/components/layout/PWARegister";
import Particles from "@/components/ui/Particles";
import { DataProvider } from "@/lib/store";
import { ThemeProvider } from "@/lib/theme";
import QuickAdd from "@/components/ui/QuickAdd";
import CommandPalette from "@/components/ui/CommandPalette";
import JarvisAssistant from "@/components/ui/JarvisAssistant";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "555 Command Center",
  description: "555 Digital · Business Dashboard, AI-powered command center",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "555 CMD",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#06070B" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="555 CMD" />
        <link rel="icon" type="image/svg+xml" href="/icon-192.svg" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
      </head>
      <body className="min-h-full bg-background text-text-primary">
        <Particles />
        <ThemeProvider>
          <DataProvider>
            <div className="relative z-10">
              <Sidebar />
              <main className="main-content min-h-screen p-3 md:p-6 pb-20 lg:pb-6 transition-all page-enter">
                {children}
              </main>
            </div>
            <MobileTabBar />
            <QuickAdd />
            <CommandPalette />
            <JarvisAssistant />
            <PWARegister />
          </DataProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
