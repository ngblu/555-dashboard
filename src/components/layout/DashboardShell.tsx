"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import MobileTabBar from "@/components/layout/MobileTabBar";
import QuickAdd from "@/components/ui/QuickAdd";
import CommandPalette from "@/components/ui/CommandPalette";
import NotificationsPanel from "@/components/ui/Notifications";
import { DataProvider } from "@/lib/store";
import { ThemeProvider } from "@/lib/theme";
import Particles from "@/components/ui/Particles";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return (
      <ThemeProvider>
        <DataProvider>{children}</DataProvider>
      </ThemeProvider>
    );
  }

  return (
    <>
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
          <NotificationsPanel />
        </DataProvider>
      </ThemeProvider>
    </>
  );
}
