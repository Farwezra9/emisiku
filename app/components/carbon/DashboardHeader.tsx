"use client";

import { useState, useEffect, useRef } from "react";
import { Leaf, User, LogOut, ChevronDown } from "lucide-react";

interface DashboardHeaderProps {
  userEmail: string | null;
  onLogout: () => Promise<void>;
}

export default function DashboardHeader({ userEmail, onLogout }: DashboardHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Menutup dropdown otomatis jika user mengklik di luar area menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      className="
        sticky top-0 z-50 mb-8
        backdrop-blur-md bg-white/60
        border border-white/20
        rounded-2xl shadow-sm
        px-4 py-4 sm:px-6 lg:px-8
        flex items-center justify-between
      "
    >
      {/* SEKTOR KIRI: JUDUL APLIKASI */}
      <div className="flex flex-col gap-1 min-w-0">
        <h1
          className="
            flex items-center gap-3
            text-xl sm:text-2xl lg:text-3xl
            font-bold text-emerald-800
          "
        >
          <Leaf className="text-emerald-500 shrink-0 w-6 h-6 sm:w-7 sm:h-7" />
          <span className="truncate">Carbon Emission Tracker</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
          Otomatisasi kalkulasi emisi karbon.
        </p>
      </div>

      {/* SEKTOR KANAN: DROPDOWN USER AUTH */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="
            flex items-center gap-2 
            bg-white hover:bg-gray-50 
            border border-gray-200 
           rounded-full px-4 py-2
            shadow-sm transition outline-none
          "
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
            <User className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium text-gray-700 max-w-[120px] sm:max-w-[180px] truncate hidden xs:block">
            {userEmail || "User"}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {/* DROPDOWN MENU */}
        {isOpen && (
          <div
            className="
              absolute right-0 mt-2 w-56 
              bg-white border border-gray-100 
              rounded-xl shadow-lg py-1 z-50
              animate-in fade-in slide-in-from-top-1 duration-150
            "
          >
            <div className="px-4 py-2 border-b border-gray-50">
              <p className="text-xs text-gray-400 font-medium">Masuk sebagai</p>
              <p className="text-sm text-gray-700 font-semibold truncate">{userEmail}</p>
            </div>
            
            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="
                w-full flex items-center gap-2 px-4 py-2.5 
                text-sm text-red-600 hover:bg-red-50 
                font-medium transition text-left
              "
            >
              <LogOut className="w-4 h-4" />
              Keluar Aplikasi
            </button>
          </div>
        )}
      </div>
    </header>
  );
}