"use client";

import { useEffect, useState } from "react";

export function ThemeToggle({ className = "", collapsed = false }: { className?: string; collapsed?: boolean }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Reflect whatever the anti-flash script in layout.tsx already applied.
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem("theme", next);
  }

  return (
    <button
      onClick={toggle}
      title="Toggle light/dark theme"
      className={`flex items-center gap-2 rounded-lg border border-white/15 text-[11px] text-white/80 transition-colors hover:border-white/40 hover:text-white ${
        collapsed ? "h-8 w-8 justify-center" : "px-2.5 py-1.5"
      } ${className}`}
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      {!collapsed && (theme === "dark" ? "Light" : "Dark")}
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
    </svg>
  );
}
