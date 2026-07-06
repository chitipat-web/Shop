"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PlusCircleIcon,
  ReceiptIcon,
  TransferIcon,
  SettingsIcon,
} from "./icons";

const tabs = [
  { href: "/", label: "เพิ่ม", Icon: PlusCircleIcon },
  { href: "/list", label: "รายการ", Icon: ReceiptIcon },
  { href: "/settle", label: "เคลียร์ยอด", Icon: TransferIcon },
  { href: "/settings", label: "ตั้งค่า", Icon: SettingsIcon },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/auth")) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto mb-3 flex w-[calc(100%-2rem)] max-w-md items-center rounded-2xl border border-neutral-200/60 bg-white/95 p-1.5 shadow-xl shadow-teal-950/10 backdrop-blur">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition ${
                active
                  ? "bg-teal-600 text-white shadow-md shadow-teal-600/30"
                  : "text-neutral-400"
              }`}
            >
              <Icon className="h-[22px] w-[22px]" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
