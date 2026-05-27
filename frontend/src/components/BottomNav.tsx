"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ACCENT = "#5b5bf2";
const INACTIVE = "rgba(15,18,40,0.5)";

const NAV_ITEMS = [
  {
    href: "/",
    label: "ホーム",
    icon: (c: string) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1m-2 0h2"
          stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: "/workouts",
    label: "ワークアウト",
    icon: (c: string) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M4 7h2v10H4a1 1 0 01-1-1V8a1 1 0 011-1zM20 7h-2v10h2a1 1 0 001-1V8a1 1 0 00-1-1zM6 9h2v6H6zM16 9h2v6h-2zM8 11h8v2H8z"
          fill={c}/>
      </svg>
    ),
  },
  {
    href: "/graphs",
    label: "グラフ",
    icon: (c: string) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M3.5 18.5l6-6 4 4 7-8" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "設定",
    icon: (c: string) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke={c} strokeWidth="1.8"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
          stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white z-20"
      style={{ borderTop: "1px solid rgba(15,18,40,0.08)" }}
    >
      <ul className="flex" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const color = isActive ? ACCENT : INACTIVE;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className="flex flex-col items-center justify-center py-2 gap-1 min-h-[48px]"
                aria-label={item.label}
              >
                {item.icon(color)}
                <span
                  className="text-[10px] font-medium"
                  style={{ color }}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
