import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cafe Hurno",
  description: "Cozy coffee corner for all coffee lovers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen max-w-md mx-auto pb-20">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
