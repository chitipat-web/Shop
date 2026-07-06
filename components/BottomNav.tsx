"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "เพิ่ม", icon: "➕" },
  { href: "/list", label: "รายการ", icon: "📋" },
  { href: "/settle", label: "เคลียร์ยอด", icon: "🤝" },
  { href: "/settings", label: "ตั้งค่า", icon: "⚙️" },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/auth")) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto mb-3 flex w-[calc(100%-2rem)] max-w-md items-center rounded-2xl border border-neutral-200/70 bg-white/95 p-1.5 shadow-xl shadow-teal-900/10 backdrop-blur">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] transition ${
                active
                  ? "bg-gradient-to-b from-teal-50 to-emerald-50 font-semibold text-teal-700"
                  : "text-neutral-500"
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
