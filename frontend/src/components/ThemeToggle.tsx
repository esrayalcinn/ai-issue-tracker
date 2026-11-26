"use client";

import { useEffect, useState } from "react";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const sync = () => {
      setDark(document.documentElement.classList.contains("dark"));
    };
    sync();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "mavis-theme") {
        const isDark = e.newValue === "dark";
        document.documentElement.classList.toggle("dark", isDark);
        setDark(isDark);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("mavis-theme", next ? "dark" : "light");
    } catch {
      // ignore storage errors
    }
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={dark ? "Switch to light pastel mode" : "Switch to cozy dark mode"}
      className={`inline-flex items-center justify-center rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)] ${
        compact ? "h-6 w-6" : "h-8 w-8"
      }`}
    >
      {dark ? (
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
          <circle cx="8" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M8 1.5V3M8 13V14.5M1.5 8H3M13 8H14.5M3.4 3.4L4.4 4.4M11.6 11.6L12.6 12.6M12.6 3.4L11.6 4.4M4.4 11.6L3.4 12.6"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
          <path
            d="M13.2 9.8A5.4 5.4 0 0 1 6.2 2.8a5.4 5.4 0 1 0 7 7Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
