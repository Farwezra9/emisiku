// app/dashboard/analysis/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { Loader2 } from "lucide-react";

import SummaryCards         from "@/app/components/carbon/SummaryCards";
import EmissionBarChart     from "@/app/components/carbon/EmissionBarChart";
import EmissionPieChart     from "@/app/components/carbon/EmissionPieChart";
import EmissionLineChart    from "@/app/components/carbon/EmissionLineChart";
import EmissionStackedChart from "@/app/components/carbon/EmissionStackedChart";
import EmissionTable        from "@/app/components/carbon/EmissionTable";
import RecommendationSection from "@/app/components/carbon/RecommendationSection";
import MethodologyCard      from "@/app/components/carbon/MethodologyCard";
import DashboardHeader      from "@/app/components/carbon/DashboardHeader";
import DashboardBackdrop    from "@/app/components/dashboard-backdrop";
import { NatureBackdrop }   from "@/app/components/nature-backdrop";
import AlertModal           from "@/app/components/ui/alert-modal";

import { ResultData }   from "@/app/types/carbon";
import { ReferenceKey } from "@/app/constants/activities";

const SESSION_KEY = "emissionAnalysisData";
const display = "font-[family-name:var(--font-display)]";

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
      try {
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
      } catch {
        // Server autentikasi tidak terjangkau: kembalikan ke halaman login
        router.push("/login");
      }
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
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#081c15]">
        <NatureBackdrop />
        <div className="relative z-10 flex items-center gap-3 rounded-md bg-[#f6f4ee] px-5 py-3 text-sm font-medium text-emerald-950 shadow-xl">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-800" />
          Memeriksa autentikasi...
        </div>
      </div>
    );
  }

  const hasData = resultData.detail.length > 0;

  return (
    <main className="relative min-h-screen bg-[#f6f4ee] text-stone-800">
      <DashboardBackdrop />

      <div className="relative z-10">
        {/* Header identik dengan dashboard */}
        <DashboardHeader
          userEmail={userEmail}
          onLogout={handleLogout}
          onNavigateAnalysis={() => router.push("/dashboard/analysis")}
        />

        <div className="mx-auto max-w-screen-2xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="mb-4">
            <h1 className={`${display} text-2xl font-medium tracking-tight text-emerald-950`}>
              Analisis & Chart
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              Ringkasan, grafik, dan rekomendasi dari seluruh data emisi Anda.
            </p>
          </div>

          {!hasData && (
            <div className="mb-4 rounded-md border border-stone-300 bg-[#fbfaf6] px-4 py-3 text-[13px] text-stone-700">
              Belum ada data emisi.{" "}
              <Link
                href="/dashboard"
                className="font-semibold text-emerald-900 underline-offset-4 hover:underline"
              >
                Tambahkan data di Dashboard
              </Link>{" "}
              untuk melihat grafik dan rekomendasi.
            </div>
          )}

          <div className="space-y-4">
            <SummaryCards resultData={resultData} />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <EmissionBarChart chartData={resultData.chartData} />
              <EmissionPieChart chartData={resultData.chartData} total={resultData.total_tCO2e} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <EmissionLineChart    detail={resultData.detail} />
              <EmissionStackedChart detail={resultData.detail} />
            </div>

            {/* EmissionTable sudah mencakup Tableau export + embed section */}
            <EmissionTable
              detail={resultData.detail}
              onDeleteAllRecords={handleDeleteAllRecords}
              selectedReference={selectedReference}
            />

            <RecommendationSection detail={resultData.detail} />
            <MethodologyCard />
          </div>
        </div>
      </div>

      {/* ── ALERT (komponen yang sama dipakai di seluruh aplikasi) ─────────── */}
      <AlertModal
        isOpen={modal.isOpen}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal((p) => ({ ...p, isOpen: false }))}
        onConfirm={modal.onConfirm}
      />
    </main>
  );
}