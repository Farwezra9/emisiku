// app/dashboard/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { saveAs } from "file-saver";
import { CheckCircle, XCircle, AlertTriangle, X, BarChart2, Loader2 } from "lucide-react";

import DashboardHeader from "@/app/components/carbon/DashboardHeader";
import InputForm       from "@/app/components/carbon/InputForm";
import EmissionTable   from "@/app/components/carbon/EmissionTable";

import { InputRow, ResultData } from "@/app/types/carbon";
import { useCarbonCalculation } from "@/app/hooks/useCarbonCalculation";
import { ReferenceKey }         from "@/app/constants/activities";

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

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthorized,      setIsAuthorized]     = useState(false);
  const [userEmail,         setUserEmail]         = useState<string | null>(null);
  const [userId,            setUserId]            = useState<string | null>(null);
  const [importedFiles,     setImportedFiles]     = useState<any[]>([]);
  const [selectedReference, setSelectedReference] = useState<ReferenceKey>("ESDM");
  const [resultData,        setResultData]        = useState<ResultData>(initialResult);

  const [inputs, setInputs] = useState<InputRow[]>([
    { aktivitas: "listrik_pln", detail_aktivitas: "", periode: 0, jumlah: 0 },
  ]);

  const { calculate, loading } = useCarbonCalculation();

  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: "success" | "error" | "confirm";
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ isOpen: false, type: "success", title: "", message: "" });

  useEffect(() => {
    if (modal.isOpen && modal.type === "success") {
      const t = setTimeout(() => setModal((p) => ({ ...p, isOpen: false })), 3500);
      return () => clearTimeout(t);
    }
  }, [modal.isOpen, modal.type]);

  // ── Fetch helpers ─────────────────────────────────────────────────────────
  const fetchImportedFiles = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("imported_files")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (!error && data) setImportedFiles(data);
  }, []);

  const fetchEmissionRecords = useCallback(async (uid: string) => {
    try {
      const { data: recordsData, error: recordsError } = await supabase
        .from("emisi_records")
        .select("*")
        .eq("user_id", uid)
        .order("periode", { ascending: false });
      if (recordsError) throw recordsError;

      const { data: filesData } = await supabase
        .from("imported_files")
        .select("id, file_name")
        .eq("user_id", uid);

      if (!recordsData || recordsData.length === 0) {
        setResultData(initialResult);
        return;
      }

      const fileMap = new Map<string, string>();
      filesData?.forEach((f) => fileMap.set(f.id, f.file_name));

      const detailsMapped = recordsData.map((item: any) => ({
        aktivitas:        item.aktivitas,
        detail_aktivitas: item.detail_aktivitas,
        scope:            item.scope,
        periode:          item.periode,
        jumlah:           item.jumlah,
        satuan:           item.satuan,
        emisi_tCO2e:      item.emisi_tco2e,
        kategori:         item.kategori,
        faktor_konversi:  item.jumlah > 0 ? (item.emisi_kgco2e ?? 0) / item.jumlah : 0,
        file_name: item.file_id ? (fileMap.get(item.file_id) ?? "Berkas Terhapus") : null,
      }));

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
      } else {
        setIsAuthorized(true);
        setUserEmail(session.user.email ?? "");
        setUserId(session.user.id);
        fetchImportedFiles(session.user.id);
        fetchEmissionRecords(session.user.id);
      }
    };
    checkUser();
  }, [router, fetchImportedFiles, fetchEmissionRecords]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // ── Input handlers ────────────────────────────────────────────────────────
  const handleChange = (index: number, field: keyof InputRow, value: string | number) => {
    const next = [...inputs];
    next[index][field] = value as never;
    setInputs(next);
  };
  const handleAdd    = () => setInputs([...inputs, { aktivitas: "listrik_pln", detail_aktivitas: "", periode: 0, jumlah: 0 }]);
  const handleRemove = (index: number) => setInputs(inputs.filter((_, i) => i !== index));

  // ── Submit manual ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!userId) return;
    try {
      const result = await calculate(inputs, selectedReference);
      const recordsToInsert = result.detail.map((item: any) => ({
        user_id:          userId,
        file_id:          null,
        periode:          item.periode,
        aktivitas:        item.aktivitas,
        detail_aktivitas: item.detail_aktivitas,
        jumlah:           item.jumlah,
        satuan:           item.satuan,
        scope:            item.scope,
        kategori:         item.kategori,
        emisi_kgco2e:     item.emisi_kgCO2e,
        emisi_tco2e:      item.emisi_tCO2e,
      }));
      const { error } = await supabase.from("emisi_records").insert(recordsToInsert);
      if (error) throw error;

      setModal({ isOpen: true, type: "success", title: "Kalkulasi Berhasil", message: `Data berhasil dihitung (Referensi: ${selectedReference}) dan disimpan.` });
      setInputs([{ aktivitas: "listrik_pln", detail_aktivitas: "", periode: 0, jumlah: 0 }]);
      fetchEmissionRecords(userId);
    } catch (error: any) {
      setModal({ isOpen: true, type: "error", title: "Penyimpanan Gagal", message: error.message || "Gagal menyimpan data." });
    }
  };

  // ── Import file ───────────────────────────────────────────────────────────
  const handleImportSuccess = async (result: any, rawExtractedRows: any[], fileName: string, filePath: string, fileSize: number) => {
    if (!userId) return;
    try {
      const { data: fileRecord, error: fileDbError } = await supabase
        .from("imported_files")
        .insert({ user_id: userId, file_name: fileName, file_path: filePath, file_size: fileSize, total_records_extracted: rawExtractedRows?.length ?? 0 })
        .select("id").single();
      if (fileDbError) throw new Error(`imported_files: ${fileDbError.message}`);
      if (!fileRecord) throw new Error("Gagal memperoleh ID Berkas.");

      if (rawExtractedRows?.length > 0) {
        const recordsToInsert = rawExtractedRows.map((item: any) => ({
          user_id: userId, file_id: fileRecord.id,
          periode: item.periode, aktivitas: item.aktivitas, detail_aktivitas: item.detail_aktivitas,
          jumlah: Number(item.jumlah) || 0, satuan: item.satuan || item.Satuan,
          scope: item.scope, kategori: item.kategori,
          emisi_kgco2e: item.emisi_kgCO2e || 0, emisi_tco2e: item.emisi_tCO2e || 0,
        }));
        const { error: recordsDbError } = await supabase.from("emisi_records").insert(recordsToInsert);
        if (recordsDbError) throw new Error(`emisi_records: ${recordsDbError.message}`);
      }

      setModal({ isOpen: true, type: "success", title: "Impor Sukses", message: `Berkas "${fileName}" berhasil diekstraksi (Referensi: ${selectedReference}) dan disimpan.` });
      fetchImportedFiles(userId);
      fetchEmissionRecords(userId);
    } catch (err: any) {
      setModal({ isOpen: true, type: "error", title: "Gagal Memproses File", message: err.message || "Terjadi kendala saat membaca dokumen." });
    }
  };

  // ── Download file ─────────────────────────────────────────────────────────
  const handleDownloadFile = async (path: string, name: string) => {
    try {
      const { data, error } = await supabase.storage.from("carbon-files").download(path);
      if (error) throw error;
      saveAs(data, name);
    } catch {
      setModal({ isOpen: true, type: "error", title: "Unduhan Gagal", message: "Berkas tidak dapat ditemukan di server." });
    }
  };

  // ── Hapus satu file ───────────────────────────────────────────────────────
  const handleDeleteFile = (fileId: string, filePath: string) => {
    if (!userId) return;
    setModal({
      isOpen: true, type: "confirm",
      title: "Hapus Berkas Ini?",
      message: "Seluruh baris data emisi terkait file ini juga akan ikut terhapus secara permanen.",
      onConfirm: async () => {
        try {
          await supabase.from("emisi_records").delete().eq("file_id", fileId);
          await supabase.from("imported_files").delete().eq("id", fileId);
          await supabase.storage.from("carbon-files").remove([filePath]);
          setModal({ isOpen: true, type: "success", title: "Berkas Terhapus", message: "Berkas dan data emisi terkait telah dihapus." });
          fetchImportedFiles(userId);
          fetchEmissionRecords(userId);
        } catch (error: any) {
          setModal({ isOpen: true, type: "error", title: "Penghapusan Gagal", message: error.message || "Gagal menghapus berkas." });
        }
      },
    });
  };

  // ── Hapus semua records ───────────────────────────────────────────────────
  const handleDeleteAllRecords = () => {
    if (!userId) return;
    setModal({
      isOpen: true, type: "confirm",
      title: "Kosongkan Semua Data?",
      message: "Seluruh riwayat emisi Anda akan dihapus permanen. Aksi ini tidak bisa dibatalkan.",
      onConfirm: async () => {
        try {
          const { error } = await supabase.from("emisi_records").delete().eq("user_id", userId);
          if (error) throw error;
          setModal({ isOpen: true, type: "success", title: "Riwayat Dibersihkan", message: "Seluruh riwayat kalkulasi emisi telah dikosongkan." });
          fetchEmissionRecords(userId);
        } catch (error: any) {
          setModal({ isOpen: true, type: "error", title: "Gagal Mengosongkan", message: error.message || "Kegagalan koneksi database." });
        }
      },
    });
  };

  // ── Navigasi ke halaman analisis ──────────────────────────────────────────
  const handleNavigateAnalysis = useCallback(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ selectedReference, timestamp: Date.now() }));
    } catch { /* abaikan */ }
    router.push("/dashboard/analysis");
  }, [selectedReference, router]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
          <Loader2 className="animate-spin w-4 h-4" />
          Memeriksa autentikasi...
        </div>
      </div>
    );
  }

  const hasData = resultData.detail.length > 0;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-800">

      <DashboardHeader
        userEmail={userEmail}
        onLogout={handleLogout}
        onNavigateAnalysis={hasData ? handleNavigateAnalysis : undefined}
      />

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {hasData ? (
          <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-6 items-start">

            {/* Form — sticky */}
            <div className="xl:sticky xl:top-[62px]">
              <InputForm
                inputs={inputs}
                loading={loading}
                onChange={handleChange}
                onAdd={handleAdd}
                onRemove={handleRemove}
                onSubmit={handleSubmit}
                onImportSuccess={handleImportSuccess}
                importedFiles={importedFiles}
                onDownloadFile={handleDownloadFile}
                onDeleteFile={handleDeleteFile}
                selectedReference={selectedReference}
                onReferenceChange={setSelectedReference}
              />
            </div>

            {/* Tabel */}
            <div className="min-w-0 space-y-4">
              <EmissionTable
                detail={resultData.detail}
                onDeleteAllRecords={handleDeleteAllRecords}
                selectedReference={selectedReference}
              />
            </div>
          </div>

        ) : (
          /* Form full lebar saat kosong */
          <div className="max-w-full">
            <InputForm
              inputs={inputs}
              loading={loading}
              onChange={handleChange}
              onAdd={handleAdd}
              onRemove={handleRemove}
              onSubmit={handleSubmit}
              onImportSuccess={handleImportSuccess}
              importedFiles={importedFiles}
              onDownloadFile={handleDownloadFile}
              onDeleteFile={handleDeleteFile}
              selectedReference={selectedReference}
              onReferenceChange={setSelectedReference}
            />
          </div>
        )}
      </div>

      {/* ── GLOBAL MODAL ─────────────────────────────────────────────────── */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-[2px]">
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-lg w-full text-center space-y-5 border border-gray-100 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setModal((p) => ({ ...p, isOpen: false }))}
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
                <button onClick={() => setModal((p) => ({ ...p, isOpen: false }))}
                  className="flex-1 py-3 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition">
                  Batal
                </button>
                <button onClick={() => { modal.onConfirm?.(); setModal((p) => ({ ...p, isOpen: false })); }}
                  className="flex-1 py-3 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition shadow-sm">
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