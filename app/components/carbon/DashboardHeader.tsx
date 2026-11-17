// Simpan sebagai: app/components/carbon/DashboardHeader.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { User, LogOut, ChevronDown, BarChart2, Home } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

const display = "font-[family-name:var(--font-display)]";

interface DashboardHeaderProps {
  userEmail: string | null;
  onLogout: () => Promise<void>;
  onNavigateAnalysis?: () => void;
}

export default function DashboardHeader({
  userEmail,
  onLogout,
  onNavigateAnalysis,
}: DashboardHeaderProps) {
  const [isOpen,   setIsOpen]   = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const isAnalysisPage = pathname?.includes("/analysis");

  const tabClass = (active: boolean) =>
    `flex items-center gap-1.5 border-b-2 px-3 text-[13px] font-medium transition-colors ${
      active
        ? "border-emerald-300 text-white"
        : "border-transparent text-emerald-100/70 hover:text-white"
    }`;

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b border-emerald-950 bg-[#0f2f23] transition-shadow duration-200 ${
        scrolled ? "shadow-md" : ""
      }`}
    >
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        {/* ── Logo ── */}
        <button
          onClick={() => router.push("/dashboard")}
          className="flex shrink-0 items-center gap-2.5"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded bg-stone-100">
            <img src="/emisiku.svg" alt="Logo Emisiku" className="h-5 w-5" />
          </span>
          <span className={`${display} text-lg font-semibold tracking-tight text-stone-50`}>
            Emisiku
          </span>
        </button>

        {/* ── Nav (tengah) ── */}
        <nav className="absolute left-1/2 top-0 flex h-14 -translate-x-1/2 items-stretch gap-1">
          <button
            onClick={() => router.push("/dashboard")}
            className={tabClass(!isAnalysisPage)}
          >
            <Home size={14} />
            <span>Dashboard</span>
          </button>

          <button
            onClick={onNavigateAnalysis ?? (() => router.push("/dashboard/analysis"))}
            className={tabClass(!!isAnalysisPage)}
          >
            <BarChart2 size={14} />
            <span>Analisis & Chart</span>
          </button>
        </nav>

        {/* ── User dropdown ── */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 rounded px-2 py-1.5 outline-none transition-colors hover:bg-white/10"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-800">
              <User className="h-3 w-3 text-emerald-100" />
            </span>
            <span className="hidden max-w-[130px] truncate text-[13px] font-medium text-stone-100 sm:block">
              {userEmail?.split("@")[0] || "User"}
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 text-emerald-100/70 transition-transform duration-150 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isOpen && (
            <div className="absolute right-0 z-50 mt-1.5 w-56 rounded-md border border-stone-300 bg-[#fbfaf6] py-1 shadow-lg">
              <div className="border-b border-stone-200 px-3.5 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-stone-500">
                  Masuk sebagai
                </p>
                <p className="mt-0.5 truncate text-[13px] font-semibold text-stone-900">
                  {userEmail}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] font-medium text-red-700 transition hover:bg-red-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}