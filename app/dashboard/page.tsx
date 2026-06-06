"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase"; 
import { saveAs } from "file-saver";
import { CheckCircle, XCircle, AlertTriangle, X } from "lucide-react";

import DashboardHeader from "@/app/components/carbon/DashboardHeader";
import InputForm from "@/app/components/carbon/InputForm";
import SummaryCards from "@/app/components/carbon/SummaryCards";
import EmissionBarChart from "@/app/components/carbon/EmissionBarChart";
import EmissionPieChart from "@/app/components/carbon/EmissionPieChart";
import EmissionLineChart from "@/app/components/carbon/EmissionLineChart";
import EmissionStackedChart from "@/app/components/carbon/EmissionStackedChart";
import EmissionTable from "@/app/components/carbon/EmissionTable";
import RecommendationSection from "@/app/components/carbon/RecommendationSection";
import MethodologyCard from "@/app/components/carbon/MethodologyCard";

import { InputRow, ResultData } from "@/app/types/carbon";
import { useCarbonCalculation } from "@/app/hooks/useCarbonCalculation";

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
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [importedFiles, setImportedFiles] = useState<any[]>([]);

  const [inputs, setInputs] = useState<InputRow[]>([
    { aktivitas: "listrik_pln", detail_aktivitas: "", periode: "", jumlah: 0 },
  ]);

  const [resultData, setResultData] = useState<ResultData>(initialResult);
  const { calculate, loading } = useCarbonCalculation();

  // State Utama untuk Manajemen Modal (Notifikasi & Konfirmasi Option)
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: "success" | "error" | "confirm";
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: "success",
    title: "",
    message: "",
  });

  // Auto-close modal otomatis khusus tipe 'success' dalam 3.5 detik
  useEffect(() => {
    if (modal.isOpen && modal.type === "success") {
      const timer = setTimeout(() => {
        setModal((prev) => ({ ...prev, isOpen: false }));
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [modal.isOpen, modal.type]);

  // 1. Ambil Log Riwayat File dari Supabase Storage Logs
  const fetchImportedFiles = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("imported_files")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (!error && data) setImportedFiles(data);
  }, []);

  // 2. AMBIL DATA EMISI DENGAN STRATEGI BYPASS (MANUAL IN-MEMORY JOIN)
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

      if (recordsData) {
        if (recordsData.length === 0) {
          setResultData(initialResult);
          return;
        }

        const fileMap = new Map<string, string>();
        if (filesData) {
          filesData.forEach((f) => fileMap.set(f.id, f.file_name));
        }

        const detailsMapped = recordsData.map((item: any) => ({
          aktivitas: item.aktivitas,
          detail_aktivitas: item.detail_aktivitas,
          scope: item.scope,
          periode: item.periode,
          jumlah: item.jumlah,
          satuan: item.satuan, 
          emisi_tCO2e: item.emisi_tco2e, 
          kategori: item.kategori,
          faktor_konversi: item.faktor_konversi || (item.jumlah > 0 ? (item.emisi_tco2e / item.jumlah) : 0),
          file_name: item.file_id ? (fileMap.get(item.file_id) || "Berkas Terhapus") : null,
        }));

        let total = 0;
        let scope1 = 0;
        let scope2 = 0;
        let scope3 = 0;

        detailsMapped.forEach((item) => {
          total += item.emisi_tCO2e;
          if (item.scope?.toLowerCase().includes("scope 1")) scope1 += item.emisi_tCO2e;
          if (item.scope?.toLowerCase().includes("scope 2")) scope2 += item.emisi_tCO2e;
          if (item.scope?.toLowerCase().includes("scope 3")) scope3 += item.emisi_tCO2e;
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
      }
    } catch (err: any) {
      console.error("Gagal memuat riwayat emisi untuk chart & tabel:", err.message || err);
    }
  }, []);

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

  const handleChange = (index: number, field: keyof InputRow, value: string | number) => {
    const newInputs = [...inputs];
    newInputs[index][field] = value as never;
    setInputs(newInputs);
  };

  const handleAdd = () => {
    setInputs([...inputs, { aktivitas: "listrik_pln", detail_aktivitas: "", periode: "", jumlah: 0 }]);
  };

  const handleRemove = (index: number) => {
    setInputs(inputs.filter((_, i) => i !== index));
  };

  // ACTION MANUALLY SUBMIT
  const handleSubmit = async () => {
    if (!userId) return;
    try {
      const result = await calculate(inputs);
      
      const recordsToInsert = result.detail.map((item: any) => ({
        user_id: userId,
        file_id: null,
        periode: item.periode || new Date().toISOString().split('T')[0],
        aktivitas: item.aktivitas,
        detail_aktivitas: item.detail_aktivitas,
        jumlah: item.jumlah,
        satuan: item.satuan, 
        scope: item.scope,
        kategori: item.kategori,
        emisi_kgco2e: item.emisi_kgCO2e,
        emisi_tco2e: item.emisi_tCO2e,
      }));

      const { error } = await supabase.from("emisi_records").insert(recordsToInsert);
      if (error) throw error;

      setModal({
        isOpen: true,
        type: "success",
        title: "Kalkulasi Berhasil",
        message: "Data aktivitas emisi manual Anda telah sukses dihitung dan disimpan.",
      });

      setInputs([{ aktivitas: "listrik_pln", detail_aktivitas: "", periode: "", jumlah: 0 }]);
      fetchEmissionRecords(userId);
    } catch (error: any) {
      setModal({
        isOpen: true,
        type: "error",
        title: "Penyimpanan Gagal",
        message: error.message || "Gagal menyinkronkan data input manual ke database.",
      });
    }
  };

  // ACTION IMPORT SUCCESS
  const handleImportSuccess = async (
    result: any, 
    rawExtractedRows: any[], 
    fileName: string, 
    filePath: string, 
    fileSize: number
  ) => {
    if (!userId) return;
    try {
      const { data: fileRecord, error: fileDbError } = await supabase
        .from("imported_files")
        .insert({
          user_id: userId,
          file_name: fileName,
          file_path: filePath,
          file_size: fileSize,
          total_records_extracted: rawExtractedRows ? rawExtractedRows.length : 0
        })
        .select("id")
        .single();
      
      if (fileDbError) throw new Error(`Tabel imported_files: ${fileDbError.message}`);
      if (!fileRecord) throw new Error("Gagal memperoleh ID Berkas.");

      if (rawExtractedRows && rawExtractedRows.length > 0) {
        const recordsToInsert = rawExtractedRows.map((item: any) => ({
          user_id: userId,
          file_id: fileRecord.id,
          periode: item.periode || new Date().toISOString().split('T')[0],
          aktivitas: item.aktivitas,
          detail_aktivitas: item.detail_aktivitas,
          jumlah: Number(item.jumlah) || 0,
          satuan: item.satuan || item.Satuan, 
          scope: item.scope,
          kategori: item.kategori,
          emisi_kgco2e: item.emisi_kgCO2e || 0,
          emisi_tco2e: item.emisi_tCO2e || 0,
        }));

        const { error: recordsDbError } = await supabase.from("emisi_records").insert(recordsToInsert);
        if (recordsDbError) throw new Error(`Tabel emisi_records: ${recordsDbError.message}`);
      }

      setModal({
        isOpen: true,
        type: "success",
        title: "Impor Sukses",
        message: `Berkas "${fileName}" berhasil diekstraksi dan disimpan ke sistem.`,
      });

      fetchImportedFiles(userId);
      fetchEmissionRecords(userId);
    } catch (err: any) {
      setModal({
        isOpen: true,
        type: "error",
        title: "Gagal Memproses File",
        message: err.message || "Terjadi kendala saat membaca baris data dokumen.",
      });
    }
  };

  // ACTION DOWNLOAD FILE FROM STORAGE
  const handleDownloadFile = async (path: string, name: string) => {
    try {
      const { data, error } = await supabase.storage.from("carbon-files").download(path);
      if (error) throw error;
      saveAs(data, name);
    } catch (err) {
      setModal({
        isOpen: true,
        type: "error",
        title: "Unduhan Gagal",
        message: "Berkas fisik tidak dapat ditemukan di server penyimpanan.",
      });
    }
  };

  // ACTION DELETE FILE (TRIGGER OPTION MODAL)
  const handleDeleteFile = (fileId: string, filePath: string) => {
    if (!userId) return;

    setModal({
      isOpen: true,
      type: "confirm",
      title: "Hapus Berkas Ini?",
      message: "Apakah Anda yakin? Seluruh baris data emisi terkait file ini juga akan ikut terhapus secara permanen.",
      onConfirm: async () => {
        try {
          const { error: recordsErr } = await supabase.from("emisi_records").delete().eq("file_id", fileId);
          if (recordsErr) throw recordsErr;

          const { error: fileErr } = await supabase.from("imported_files").delete().eq("id", fileId);
          if (fileErr) throw fileErr;

          await supabase.storage.from("carbon-files").remove([filePath]);

          setModal({
            isOpen: true,
            type: "success",
            title: "Berkas Terhapus",
            message: "Berkas dan data emisi terkait telah dibersihkan secara permanen.",
          });

          fetchImportedFiles(userId);
          fetchEmissionRecords(userId);
        } catch (error: any) {
          setModal({
            isOpen: true,
            type: "error",
            title: "Penghapusan Gagal",
            message: error.message || "Gagal menghapus berkas.",
          });
        }
      },
    });
  };

  // ACTION DELETE ALL EMISSION RECORDS (TRIGGER OPTION MODAL)
  const handleDeleteAllRecords = () => {
    if (!userId) return;

    setModal({
      isOpen: true,
      type: "confirm",
      title: "Kosongkan Semua Data?",
      message: "PERINGATAN: Langkah ini akan menghapus SELURUH riwayat emisi Anda tanpa terkecuali. Aksi ini tidak bisa dibatalkan.",
      onConfirm: async () => {
        try {
          const { error } = await supabase.from("emisi_records").delete().eq("user_id", userId);
          if (error) throw error;

          setModal({
            isOpen: true,
            type: "success",
            title: "Riwayat Dibersihkan",
            message: "Seluruh riwayat kalkulasi emisi dari akun Anda telah dikosongkan.",
          });

          fetchEmissionRecords(userId);
        } catch (error: any) {
          setModal({
            isOpen: true,
            type: "error",
            title: "Gagal Mengosongkan",
            message: error.message || "Terjadi kegagalan koneksi database.",
          });
        }
      },
    });
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 font-semibold">
        Memeriksa Autentikasi...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-800">
      <div className="mx-auto max-w-fit px-4 py-6 sm:px-6 lg:px-8 text-gray-800">
        <DashboardHeader userEmail={userEmail} onLogout={handleLogout} />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-4">
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
            />
          </div>

          <div className="xl:col-span-8 space-y-6">
            <SummaryCards resultData={resultData} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EmissionBarChart chartData={resultData.chartData} />
              <EmissionPieChart chartData={resultData.chartData} total={resultData.total_tCO2e} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EmissionLineChart detail={resultData.detail} />
              <EmissionStackedChart detail={resultData.detail} />
            </div>

            <EmissionTable 
              detail={resultData.detail} 
              onDeleteAllRecords={handleDeleteAllRecords} 
            />
            
            <RecommendationSection detail={resultData.detail} />
            <MethodologyCard />
          </div>
        </div>
      </div>

      {/* ====================================================== */}
      {/* GLOBAL MODAL NOTIFICATION & CONFIRMATION OPTION        */}
      {/* ====================================================== */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-[2px]">
          {/* Container Modal: Diperbesar ke max-w-lg dan p-8 agar lebih luas */}
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-lg w-full text-center space-y-5 border border-gray-100 relative animate-in fade-in zoom-in-95 duration-200">
            
            {/* Tombol Silang Pojok Kanan Atas */}
            <button 
              onClick={() => setModal((prev) => ({ ...prev, isOpen: false }))}
              className="absolute right-5 top-5 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50 transition"
            >
              <X size={20} />
            </button>

            {/* Ikon Pendukung Skala Besar */}
            <div className="flex justify-center pt-2">
              <div className={`p-4 rounded-full ${
                modal.type === "success" ? "bg-emerald-50" : modal.type === "error" ? "bg-red-50" : "bg-amber-50"
              }`}>
                {modal.type === "success" && <CheckCircle className="text-emerald-500" size={64} />}
                {modal.type === "error" && <XCircle className="text-red-500" size={64} />}
                {modal.type === "confirm" && <AlertTriangle className="text-amber-500" size={64} />}
              </div>
            </div>

            {/* Konten Judul & Pesan Keterangan */}
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900">{modal.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed px-4">
                {modal.message}
              </p>
            </div>

            {/* Tombol Aksi Konfirmasi Opisinal */}
            {modal.type === "confirm" ? (
              <div className="flex gap-3 pt-3">
                <button
                  onClick={() => setModal((prev) => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    if (modal.onConfirm) modal.onConfirm();
                    setModal((prev) => ({ ...prev, isOpen: false }));
                  }}
                  className="flex-1 py-3 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition shadow-sm"
                >
                  Ya, Hapus
                </button>
              </div>
            ) : (
              /* Indikator teks pelengkap (Tanpa Tombol untuk tipe Notifikasi) */
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