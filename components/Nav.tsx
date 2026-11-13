"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: { href: string; label: string; icon: (c: string, on: string) => React.ReactNode }[] = [
  {
    href: "/",
    label: "Session",
    // A jug hold with its bolt: "climb".
    icon: (c: string, on: string) => (
      <svg width="24" height="24" viewBox="0 0 40 40" aria-hidden>
        <path d="M3 18 C3 9 11 5 20 5 C29 5 37 9 37 18 C37 29 29 36 20 36 C11 36 3 29 3 18 Z" fill={c} />
        <path d="M10 15 C14 11 26 11 30 15" fill="none" stroke={on} strokeWidth="3" strokeLinecap="round" />
        <circle cx="20" cy="26" r="3" fill={on} />
      </svg>
    ),
  },
  {
    href: "/log",
    label: "Log",
    // A logbook page with ticks.
    icon: (c: string) => (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="4.5" y="3.5" width="15" height="17" rx="3.5" />
        <path d="M8.5 9l1.6 1.6L13 7.8M8.5 15l1.6 1.6L13 13.8M15.5 9.5h.5M15.5 15.5h.5" />
      </svg>
    ),
  },
  {
    href: "/buddies",
    label: "Buddies",
    icon: (c: string) => (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" aria-hidden>
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
    // A bar chart.
    icon: (c: string) => (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3.4" strokeLinecap="round" aria-hidden>
        <path d="M6 19v-5M12 19V6M18 19v-9" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    // A gear.
    icon: (c: string) => (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="3.2" />
        <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" />
      </svg>
    ),
  },
];

/** Screens used mid-attempt hide the tabs so nothing competes with logging. */
const FOCUS_ROUTES = ["/climb", "/new", "/welcome", "/persona", "/recap"];

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
              <li key={tab.href} className={`nav-item ${active ? "flex-[1.7]" : "flex-1"}`}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={active ? undefined : tab.label}
                  data-sfx="nav"
                  className={`nav-link flex h-12 items-center justify-center gap-2 rounded-full text-sm font-bold ${
                    active ? "bg-ink text-white" : ""
                  }`}
                >
                  {tab.icon(active ? "#FFFFFF" : "#1E1B3A", active ? "#1E1B3A" : "#FFFFFF")}
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
