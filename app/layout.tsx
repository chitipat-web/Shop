import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Shop — บันทึกของที่ซื้อ",
  description: "บันทึกของที่ซื้อร่วมกัน แล้วหารกันสิ้นเดือน",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d9488",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full">
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
          <AppHeader />
          <main className="flex-1 px-4 pb-32 pt-5">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
