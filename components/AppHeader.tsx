"use client";

import { usePathname } from "next/navigation";

export default function AppHeader() {
  const pathname = usePathname();
  if (pathname.startsWith("/auth")) return null;
  return (
    <header className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-500 px-5 pb-5 pt-5 text-white shadow-lg shadow-teal-900/10">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl leading-none">🛒</span>
        <h1 className="text-xl font-bold tracking-wide">Shop</h1>
        <span className="ml-auto text-xs font-medium text-teal-50/90">
          จดปุ๊บ หารปั๊บ สิ้นเดือนไม่งง
        </span>
      </div>
    </header>
  );
}
