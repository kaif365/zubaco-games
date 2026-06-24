import type { Metadata } from "next";
import { Funnel_Sans } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { ToastProvider } from "@/providers/ToastProvider";

const funnelSans = Funnel_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-primary",
});

export const metadata: Metadata = {
  title: "ZUBACO Admin",
  description: "Admin panel for ZUBACO multi-game platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="EN" className={funnelSans.variable}>
      <body>
        <QueryProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
