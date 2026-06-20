// app/dashboard/analysis/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { CheckCircle, XCircle, AlertTriangle, X } from "lucide-react";

import SummaryCards         from "@/app/components/carbon/SummaryCards";
import EmissionBarChart     from "@/app/components/carbon/EmissionBarChart";
import EmissionPieChart     from "@/app/components/carbon/EmissionPieChart";
import EmissionLineChart    from "@/app/components/carbon/EmissionLineChart";
import EmissionStackedChart from "@/app/components/carbon/EmissionStackedChart";
import EmissionTable        from "@/app/components/carbon/EmissionTable";
import RecommendationSection from "@/app/components/carbon/RecommendationSection";
import MethodologyCard      from "@/app/components/carbon/MethodologyCard";
import DashboardHeader      from "@/app/components/carbon/DashboardHeader";

import { ResultData }   from "@/app/types/carbon";
import { ReferenceKey } from "@/app/constants/activities";

const SESSION_KEY = "emissionAnalysisData";

const initialResult: ResultData = {
  total_tCO2e: 0,
  chartData: [
    { name: "Scope 1", value: 0, color: "#EF4444", deskripsi: "Bahan bakar langsung" },
    { name: "Scope 2", value: 0, color: "#EAB308", deskripsi: "Konsumsi listrik" },
    { name: "Scope 3", value: 0, color: "#3B82F6", deskripsi: "Logistik" },
  ],
  detail: [],
};

export default function AnalysisPage() {
  const router = useRouter();
  const [isAuthorized,      setIsAuthorized]      = useState(false);
  const [userEmail,         setUserEmail]          = useState<string | null>(null);
  const [userId,            setUserId]             = useState<string | null>(null);
  const [selectedReference, setSelectedReference]  = useState<ReferenceKey>("ESDM");
  const [resultData,        setResultData]         = useState<ResultData>(initialResult);

  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: "success" | "error" | "confirm";
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ isOpen: false, type: "success", title: "", message: "" });

  useEffect(() => {
    if (modal.isOpen && modal.type === "success") {
      const timer = setTimeout(() => setModal((prev) => ({ ...prev, isOpen: false })), 3500);
      return () => clearTimeout(timer);
    }
  }, [modal.isOpen, modal.type]);

  // ── Fetch langsung dari DB — selalu fresh ────────────────────────────────
  const fetchEmissionRecords = useCallback(async (uid: string) => {
    try {
      const { data: recordsData, error: recordsError } = await supabase
        .from("emisi_records")
        .select("*")
        .eq("user_id", uid)
        .order("periode", { ascending: false });
      if (recordsError) throw recordsError;

      const { data: filesData, error: filesError } = await supabase
        .from("imported_files")
        .select("id, file_name")
        .eq("user_id", uid);
      if (filesError) throw filesError;

      if (!recordsData || recordsData.length === 0) {
        setResultData(initialResult);
        return;
      }

      const fileMap = new Map<string, string>();
      filesData?.forEach((f) => fileMap.set(f.id, f.file_name));

      const detailsMapped = recordsData.map((item: any) => {
        const faktor_konversi = item.jumlah > 0 ? (item.emisi_kgco2e ?? 0) / item.jumlah : 0;
        return {
          aktivitas:        item.aktivitas,
          detail_aktivitas: item.detail_aktivitas,
          scope:            item.scope,
          periode:          item.periode,
          jumlah:           item.jumlah,
          satuan:           item.satuan,
          emisi_tCO2e:      item.emisi_tco2e,
          kategori:         item.kategori,
          faktor_konversi,
          file_name: item.file_id ? (fileMap.get(item.file_id) ?? "Berkas Terhapus") : null,
        };
      });

      let total = 0, scope1 = 0, scope2 = 0, scope3 = 0;
      detailsMapped.forEach((item) => {
        total += item.emisi_tCO2e;
        const sc = item.scope?.toLowerCase() ?? "";
        if      (sc.includes("scope 1")) scope1 += item.emisi_tCO2e;
        else if (sc.includes("scope 2")) scope2 += item.emisi_tCO2e;
        else if (sc.includes("scope 3")) scope3 += item.emisi_tCO2e;
      });

      setResultData({
        total_tCO2e: total,
        chartData: [
          { name: "Scope 1", value: scope1, color: "#EF4444", deskripsi: "Bahan bakar langsung" },
          { name: "Scope 2", value: scope2, color: "#EAB308", deskripsi: "Konsumsi listrik" },
          { name: "Scope 3", value: scope3, color: "#3B82F6", deskripsi: "Logistik" },
        ],
        detail: detailsMapped,
      });
    } catch (err: any) {
      console.error("Gagal memuat riwayat emisi:", err.message ?? err);
    }
  }, []);

  // ── Auth check ────────────────────────────────────────────────────────────
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setIsAuthorized(true);
      setUserEmail(session.user.email ?? "");
      setUserId(session.user.id);

      // Ambil selectedReference dari sessionStorage jika ada
      try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.selectedReference) setSelectedReference(parsed.selectedReference);
        }
      } catch { /* abaikan */ }

      // Selalu fetch fresh dari DB
      fetchEmissionRecords(session.user.id);
    };
    checkUser();
  }, [router, fetchEmissionRecords]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // ── Hapus semua records ───────────────────────────────────────────────────
  const handleDeleteAllRecords = () => {
    if (!userId) return;
    setModal({
      isOpen: true, type: "confirm",
      title: "Kosongkan Semua Data?",
      message: "PERINGATAN: Langkah ini akan menghapus SELURUH riwayat emisi Anda tanpa terkecuali. Aksi ini tidak bisa dibatalkan.",
      onConfirm: async () => {
        try {
          const { error } = await supabase.from("emisi_records").delete().eq("user_id", userId);
          if (error) throw error;
          setModal({ isOpen: true, type: "success", title: "Riwayat Dibersihkan", message: "Seluruh riwayat kalkulasi emisi dari akun Anda telah dikosongkan." });
          fetchEmissionRecords(userId);
        } catch (error: any) {
          setModal({ isOpen: true, type: "error", title: "Gagal Mengosongkan", message: error.message || "Terjadi kegagalan koneksi database." });
        }
      },
    });
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 font-semibold">
        Memeriksa Autentikasi...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-800">

      {/* Header identik dengan dashboard */}
      <DashboardHeader
        userEmail={userEmail}
        onLogout={handleLogout}
        onNavigateAnalysis={() => router.push("/dashboard/analysis")}
      />

      <div className="max-w-screen-2xl mx-auto px-4 py-6 sm:px-6 lg:px-8 text-gray-800">
        <div className="space-y-6">

          <SummaryCards resultData={resultData} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EmissionBarChart chartData={resultData.chartData} />
            <EmissionPieChart chartData={resultData.chartData} total={resultData.total_tCO2e} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EmissionLineChart    detail={resultData.detail} />
            <EmissionStackedChart detail={resultData.detail} />
          </div>

          {/* EmissionTable sekarang sudah include Tableau export + embed section */}
          <EmissionTable
            detail={resultData.detail}
            onDeleteAllRecords={handleDeleteAllRecords}
            selectedReference={selectedReference}
          />

          <RecommendationSection detail={resultData.detail} />
          <MethodologyCard />
        </div>
      </div>

      {/* ── GLOBAL MODAL ─────────────────────────────────────────────────── */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-[2px]">
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-lg w-full text-center space-y-5 border border-gray-100 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setModal((prev) => ({ ...prev, isOpen: false }))}
              className="absolute right-5 top-5 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50 transition"
            >
              <X size={20} />
            </button>
            <div className="flex justify-center pt-2">
              <div className={`p-4 rounded-full ${modal.type === "success" ? "bg-emerald-50" : modal.type === "error" ? "bg-red-50" : "bg-amber-50"}`}>
                {modal.type === "success" && <CheckCircle   className="text-emerald-500" size={64} />}
                {modal.type === "error"   && <XCircle       className="text-red-500"     size={64} />}
                {modal.type === "confirm" && <AlertTriangle className="text-amber-500"   size={64} />}
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900">{modal.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed px-4">{modal.message}</p>
            </div>
            {modal.type === "confirm" ? (
              <div className="flex gap-3 pt-3">
                <button
                  onClick={() => setModal((prev) => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
                >
                  Batal
                </button>
                <button
                  onClick={() => { modal.onConfirm?.(); setModal((prev) => ({ ...prev, isOpen: false })); }}
                  className="flex-1 py-3 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition shadow-sm"
                >
                  Ya, Hapus
                </button>
              </div>
            ) : (
              <div className="text-xs text-gray-400 pt-2">
                {modal.type === "success" ? "Jendela ini akan tertutup otomatis..." : "Klik ikon silang di atas untuk menutup"}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}