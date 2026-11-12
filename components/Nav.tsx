"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/",
    label: "Session",
    // Five tally strokes.
    icon: (
      <>
        <path d="M5 5v14M9.5 5v14M14 5v14M18.5 5v14" />
        <path d="M3 16.5 20.5 7.5" />
      </>
    ),
  },
  {
    href: "/log",
    label: "Log",
    icon: <path d="M5 6h14M5 12h14M5 18h9" />,
  },
  {
    href: "/insights",
    label: "Insights",
    icon: <path d="M9 5h6M6.5 12h11M4 19h16" />,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <>
        <path d="M4 8h9M17 8h3M4 16h3M11 16h9" />
        <circle cx="15" cy="8" r="2" />
        <circle cx="9" cy="16" r="2" />
      </>
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
        className="fixed inset-x-0 bottom-0 z-10 border-t border-mat-3 bg-mat/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="mx-auto flex max-w-md">
          {TABS.map((tab) => {
            const active =
              tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${
                    active ? "text-tape" : "text-dust"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden
                  >
                    {tab.icon}
                  </svg>
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
