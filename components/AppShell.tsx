"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

type NavItem = { href: string; label: string; icon: () => React.JSX.Element; exact?: boolean };

const NAV: NavItem[] = [
  { href: "/", label: "Programs", icon: DashboardIcon, exact: true },
  { href: "/facilities", label: "Facilities", icon: FacilitiesIcon, exact: true },
];

// The rate book is three separate concerns, one page each. /catalog is a prefix of the other two,
// so every entry here matches its own path exactly.
const RATE_BOOK_NAV: NavItem[] = [
  { href: "/catalog", label: "Main Items", icon: MainItemIcon, exact: true },
  { href: "/catalog/sub-items", label: "Sub-Items", icon: SubItemIcon, exact: true },
  { href: "/catalog/micro-items", label: "Micro-Items", icon: MicroItemIcon, exact: true },
];

const COLLAPSE_KEY = "sidebar-collapsed";

export function AppShell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    setHydrated(true);
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-bg lg:flex">
      <aside
        className={`flex shrink-0 flex-col bg-sidebar px-3 py-4 text-white/90 transition-[width] duration-150 lg:sticky lg:top-0 lg:h-screen ${
          collapsed ? "lg:w-[68px]" : "lg:w-60"
        } ${hydrated ? "" : "lg:w-60"}`}
      >
        <div className={`mb-6 flex items-center gap-2 px-1 ${collapsed ? "justify-center" : ""}`}>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 font-mono text-sm font-bold text-white">
            E
          </div>
          {!collapsed && (
            <div className="text-[13px] font-semibold leading-tight text-white">
              Classified
              <br />
              Estimator
            </div>
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
          ))}

          {collapsed ? (
            <div className="mx-2 my-2 border-t border-white/10" />
          ) : (
            <div className="mb-0.5 mt-4 px-2.5 text-[10px] font-semibold tracking-wider text-white/40">RATE BOOK</div>
          )}
          {RATE_BOOK_NAV.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
          ))}
        </nav>

        <div className={`mt-4 space-y-2 border-t border-white/10 pt-3 ${collapsed ? "flex flex-col items-center" : ""}`}>
          <ThemeToggle collapsed={collapsed} className={collapsed ? "" : "w-full justify-center"} />
          {!collapsed && (
            <div className="truncate px-1 text-[11px] text-white/60" title={email}>
              {email}
            </div>
          )}
          <button
            onClick={signOut}
            title={collapsed ? `Sign out (${email})` : undefined}
            className={`rounded-lg border border-white/15 text-[11px] text-white/80 transition-colors hover:border-white/40 hover:text-white ${
              collapsed ? "flex h-8 w-8 items-center justify-center" : "w-full px-2.5 py-1.5"
            }`}
          >
            {collapsed ? <SignOutIcon /> : "Sign out"}
          </button>

          <button
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`hidden items-center justify-center rounded-lg border border-white/15 text-white/70 transition-colors hover:border-white/40 hover:text-white lg:flex ${
              collapsed ? "h-8 w-8" : "w-full px-2.5 py-1.5"
            }`}
          >
            <CollapseIcon collapsed={collapsed} />
            {!collapsed && <span className="ml-1.5 text-[11px]">Collapse</span>}
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

function NavLink({ item, pathname, collapsed }: { item: NavItem; pathname: string; collapsed: boolean }) {
  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors ${
        collapsed ? "justify-center" : ""
      } ${active ? "bg-white/15 text-white font-medium" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
    >
      <item.icon />
      {!collapsed && item.label}
    </Link>
  );
}

function DashboardIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}
function FacilitiesIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 9h1M14 9h1M9 13h1M14 13h1M10 21v-4h4v4" />
    </svg>
  );
}
function MainItemIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  );
}
function SubItemIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
      <path d="M12 2l9 5-9 5-9-5 9-5z" />
      <path d="M3 12l9 5 9-5" />
      <path d="M3 17l9 5 9-5" />
    </svg>
  );
}
function MicroItemIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
      <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
      <path d="M3.3 7.5L12 12.5l8.7-5M12 22V12.5" />
    </svg>
  );
}
function SignOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`transition-transform ${collapsed ? "rotate-180" : ""}`}
    >
      <path d="M15 18l-6-6 6-6" />
      <path d="M9 18V6" opacity="0" />
    </svg>
  );
}
