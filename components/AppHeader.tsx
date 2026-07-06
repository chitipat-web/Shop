"use client";

import { usePathname } from "next/navigation";
import { CartIcon } from "./icons";

export default function AppHeader() {
  const pathname = usePathname();
  if (pathname.startsWith("/auth")) return null;
  return (
    <header className="bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 px-5 pb-4 pt-5 text-white">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20">
          <CartIcon className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <h1 className="text-lg font-bold tracking-wide">Shop</h1>
          <p className="text-[11px] text-teal-100/90">
            บันทึกของที่ซื้อ · หารกันสิ้นเดือน
          </p>
        </div>
      </div>
    </header>
  );
}
