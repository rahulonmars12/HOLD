"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/",
    label: "Session",
    icon: (c: string) => (
      <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke={c} strokeWidth="2.2" aria-hidden>
        <circle cx="6" cy="10" r="3.5" />
        <circle cx="14" cy="10" r="3.5" fill={c} />
      </svg>
    ),
  },
  {
    href: "/log",
    label: "Log",
    icon: (c: string) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" aria-hidden>
        <path d="M5 6h14M5 12h14M5 18h9" />
      </svg>
    ),
  },
  {
    href: "/buddies",
    label: "Buddies",
    icon: (c: string) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" aria-hidden>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 19c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M16.5 14c2.2.2 3.6 1.8 4.2 4.5" />
      </svg>
    ),
  },
  {
    href: "/insights",
    label: "Insights",
    icon: (c: string) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" aria-hidden>
        <path d="M9 5h6M6.5 12h11M4 19h16" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (c: string) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" aria-hidden>
        <path d="M4 8h9M17 8h3M4 16h3M11 16h9" />
        <circle cx="15" cy="8" r="2" />
        <circle cx="9" cy="16" r="2" />
      </svg>
    ),
  },
];

/** Screens used mid-attempt hide the tabs so nothing competes with logging. */
const FOCUS_ROUTES = ["/climb", "/new"];

export function Nav() {
  const pathname = usePathname();
  if (FOCUS_ROUTES.some((r) => pathname.startsWith(r))) return null;

  return (
    <>
      <div aria-hidden className="h-28" />
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <ul className="mx-auto flex h-16 max-w-md items-center rounded-full bg-white px-2 shadow-[0_6px_20px_rgb(30_27_58/0.14)]">
          {TABS.map((tab) => {
            const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
            return (
              <li key={tab.href} className={active ? "flex-[1.7]" : "flex-1"}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={active ? undefined : tab.label}
                  className={`flex h-12 items-center justify-center gap-2 rounded-full text-sm font-bold ${
                    active ? "bg-ink text-white" : ""
                  }`}
                >
                  {tab.icon(active ? "#FFFFFF" : "#1E1B3A")}
                  {active && tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
