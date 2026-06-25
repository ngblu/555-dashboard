import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Website Audit Report",
  description: "Detailed website performance and SEO audit report",
  robots: "noindex, nofollow",
};

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-background text-text-primary">
        {children}
      </body>
    </html>
  );
}
