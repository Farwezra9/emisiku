"use client";

import { useState, useEffect, useRef } from "react";
import { Leaf, User, LogOut, ChevronDown, BarChart2, Home } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

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

  return (
    <header
      className={`
        sticky top-0 z-50 w-full
        transition-all duration-200
        ${scrolled
          ? "bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-200/60"
          : "bg-white/60 backdrop-blur-md border-b border-transparent"
        }
      `}
    >
      <div className="flex items-center justify-between h-14 px-6">

        {/* ── Logo ── */}
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 shrink-0 group"
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
           <img src="/emisiku.svg" alt="Logo Emisiku" className="w-4 h-4" />
          </div>
          <span className="font-bold text-[15px] text-emerald-800 tracking-tight">
            Emisiku
          </span>
        </button>

        {/* ── Nav (tengah) ── */}
        <nav className="flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
          <button
            onClick={() => router.push("/dashboard")}
            className={`
              flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all
              ${!isAnalysisPage
                ? "bg-emerald-600 text-white"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"}
            `}
          >
            <Home size={13} />
            Dashboard
          </button>

          <button
            onClick={onNavigateAnalysis ?? (() => router.push("/dashboard/analysis"))}
            className={`
              flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all
              ${isAnalysisPage
                ? "bg-emerald-600 text-white"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"}
            `}
          >
            <BarChart2 size={13} />
            Analisis & Chart
          </button>
        </nav>

        {/* ── User dropdown ── */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors outline-none"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
              <User className="w-3 h-3 text-emerald-700" />
            </div>
            <span className="text-[13px] font-medium text-gray-700 max-w-[130px] truncate hidden sm:block">
              {userEmail?.split("@")[0] || "User"}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
              <div className="px-3.5 py-2.5 border-b border-gray-100">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Masuk sebagai</p>
                <p className="text-[13px] text-gray-800 font-semibold truncate mt-0.5">{userEmail}</p>
              </div>
              <button
                onClick={() => { setIsOpen(false); onLogout(); }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-[13px] text-red-600 hover:bg-red-50 font-medium transition text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                LogOut
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}