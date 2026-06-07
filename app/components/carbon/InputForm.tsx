"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Calculator,
  Upload,
  FileSpreadsheet,
  Fuel,
  Plane,
  Trash,
  Factory,
  Zap,
  Truck,
  Droplets,
  Download,
  CheckCircle,
  XCircle,
  X,
  Calendar,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { InputRow } from "@/app/types/carbon";
import { importEmissionFile } from "@/app/services/import.service";
import { ACTIVITY_OPTIONS, ACTIVITY_LABELS } from "@/app/constants/activities";
import { supabase } from "@/app/lib/supabase";

interface ImportedFileRow {
  id: string;
  file_name: string;
  file_path: string;
  created_at: string;
  total_records_extracted: number;
}

interface Props {
  inputs: InputRow[];
  loading: boolean;
  onChange: (index: number, field: keyof InputRow, value: string | number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onSubmit: () => void;
  onImportSuccess: (
    result: any,
    rawExtractedRows: any[],
    fileName: string,
    filePath: string,
    fileSize: number
  ) => Promise<void>;
  importedFiles?: ImportedFileRow[];
  onDownloadFile?: (path: string, name: string) => void;
  onDeleteFile?: (fileId: string, filePath: string) => void;
}

export default function InputForm({
  inputs,
  loading,
  onChange,
  onAdd,
  onRemove,
  onSubmit,
  onImportSuccess,
  importedFiles = [],
  onDownloadFile,
  onDeleteFile,
}: Props) {
  const [activeTab, setActiveTab] = useState<"manual" | "import">("manual");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: "success" | "error";
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: "success",
    title: "",
    message: "",
  });

  useEffect(() => {
    if (modal.isOpen) {
      const timer = setTimeout(() => {
        setModal((prev) => ({ ...prev, isOpen: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [modal.isOpen]);

  // ======================================================
  // FILE UPLOAD & EXTRACTION PROCESS (EXCEL & CSV ONLY)
  // ======================================================
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Proteksi sisi Client: Hanya izinkan Excel dan CSV
    const allowedExtensions = ["xlsx", "xls", "csv"];
    const fileExt = file.name.split('.').pop()?.toLowerCase();

    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      setModal({
        isOpen: true,
        type: "error",
        title: "Format Berkas Ditolak",
        message: "Format file tidak didukung! Harap unggah berkas Excel (.xlsx/.xls) atau CSV (.csv).",
      });
      if (e.target) e.target.value = "";
      return;
    }

    setSelectedFile(file);

    try {
      setUploading(true);

      // 1. Dapatkan Sesi Pengguna Terotentikasi
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Akses ditolak. Sila login kembali.");

      // 2. Format Jalur & Nama Berkas Unik
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const filePath = `${session.user.id}/${Date.now()}_${cleanFileName}`;

      // 3. Simpan File Fisik ke Supabase Storage Bucket
      const { error: uploadError } = await supabase.storage
        .from("carbon-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 4. Kirim ke Backend Spreadsheet Parser untuk Ekstraksi Data
      const result = await importEmissionFile(file);
      
      // Ambil array ekstraksi baris data
      const extractedRows = result.detail || result.rawExtractedRows || result.data || [];

      // 5. Pemicu Fungsi Utama di Dashboard untuk Simpan Data
      await onImportSuccess(result, extractedRows, file.name, filePath, file.size);
      
      setModal({
        isOpen: true,
        type: "success",
        title: "Import Berhasil",
        message: `Berkas "${file.name}" sukses diunggah ke storage dan diekstrak ke dashboard.`,
      });
      setSelectedFile(null); // Reset selection setelah berhasil masuk database
    } catch (error: any) {
      console.error(error);
      setModal({
        isOpen: true,
        type: "error",
        title: "Import Gagal",
        message: error.message || "Struktur data dokumen tidak valid atau rusak.",
      });
      setSelectedFile(null);
    } finally {
      setUploading(false);
      if (e.target) e.target.value = ""; // Reset input file target
    }
  };

  const handleClearFile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFile(null);
  };

  const downloadTemplateExcel = () => {
    const templateData = [
      { No: 1, Periode: "2026-05-01", Scope: "Scope 1", "Kategori Aktivitas": "Pertalite", "Detail / Keterangan": "Mobil Operasional", Jumlah: 45.5, Satuan: "Liter" },
      { No: 2, Periode: "2026-05-01", Scope: "Scope 2", "Kategori Aktivitas": "Listrik PLN", "Detail / Keterangan": "Gedung Kantor", Jumlah: 1250, Satuan: "kWh" },
      { No: 3, Periode: "2026-05-02", Scope: "Scope 3", "Kategori Aktivitas": "Pesawat Domestik", "Detail / Keterangan": "Jakarta-Surabaya", Jumlah: 780, Satuan: "Km" },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet["!cols"] = [{ wch: 8 }, { wch: 18 }, { wch: 15 }, { wch: 28 }, { wch: 35 }, { wch: 15 }, { wch: 12 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Emisi");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const fileData = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });

    saveAs(fileData, "template_emisi.xlsx");
  };

  const getCategoryIcon = (kategori: string) => {
    switch (kategori) {
      case "Fuel": case "Gas": case "Industrial Fuel": return <Fuel size={14} className="text-red-500" />;
      case "Electricity": case "Renewable Energy": return <Zap size={14} className="text-yellow-500" />;
      case "Transportation": return <Plane size={14} className="text-blue-500" />;
      case "Logistics": return <Truck size={14} className="text-indigo-500" />;
      case "Waste": case "Hazardous Waste": case "Wastewater": return <Trash size={14} className="text-emerald-500" />;
      case "Water": return <Droplets size={14} className="text-cyan-500" />;
      default: return <Factory size={14} className="text-gray-500" />;
    }
  };

  const scope1Options = ACTIVITY_OPTIONS.filter((item) => item.scope === "Scope 1 (Direct)");
  const scope2Options = ACTIVITY_OPTIONS.filter((item) => item.scope === "Scope 2 (Indirect - Energy)");
  const scope3Options = ACTIVITY_OPTIONS.filter((item) => item.scope === "Scope 3 (Value Chain)");

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden relative">
      <div className="border-b border-gray-100">
        <div className="flex">
          <button onClick={() => setActiveTab("manual")} className={`flex-1 py-4 text-sm font-semibold transition ${activeTab === "manual" ? "bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500" : "text-gray-500 hover:bg-gray-50"}`}>Manual Input</button>
          <button onClick={() => setActiveTab("import")} className={`flex-1 py-4 text-sm font-semibold transition ${activeTab === "import" ? "bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500" : "text-gray-500 hover:bg-gray-50"}`}>Import File</button>
        </div>
      </div>

      {activeTab === "manual" && (
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Calculator size={18} className="text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-900">Input Aktivitas Emisi</h2>
          </div>

          <div className="max-h-[58vh] overflow-y-auto pr-1 space-y-4 scrollbar-thin scrollbar-thumb-gray-200">
            {inputs.map((input, index) => {
              const selected = ACTIVITY_OPTIONS.find((item) => item.value === input.aktivitas);
              return (
                <div key={index} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg">Aktivitas #{index + 1}</span>
                      {selected && <span className="flex items-center gap-1 text-xs text-gray-500">{getCategoryIcon(selected.category)}{selected.category}</span>}
                    </div>
                    {inputs.length > 1 && (
                      <button onClick={() => onRemove(index)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition"><Trash2 size={16} /></button>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600 flex items-center gap-1"><Calendar size={12} className="text-gray-400" />Periode / Tanggal Aktivitas</label>
                    <input type="date" value={input.periode || ""} onChange={(e) => onChange(index, "periode", e.target.value)} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600">Jenis Aktivitas</label>
                    <select value={input.aktivitas} onChange={(e) => onChange(index, "aktivitas", e.target.value)} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      <optgroup label="Scope 1 — Direct Emission">{scope1Options.map((o) => <option key={o.value} value={o.value}>{o.label} • {o.unit}</option>)}</optgroup>
                      <optgroup label="Scope 2 — Energy Indirect">{scope2Options.map((o) => <option key={o.value} value={o.value}>{o.label} • {o.unit}</option>)}</optgroup>
                      <optgroup label="Scope 3 — Value Chain">{scope3Options.map((o) => <option key={o.value} value={o.value}>{o.label} • {o.unit}</option>)}</optgroup>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600">Detail Aktivitas</label>
                    <input type="text" placeholder="Contoh: Mobil Operasional Avanza" value={input.detail_aktivitas} onChange={(e) => onChange(index, "detail_aktivitas", e.target.value)} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600">Jumlah Aktivitas</label>
                    <div className="relative">
                      <input type="number" placeholder="Masukkan jumlah aktivitas" value={input.jumlah === 0 ? "" : input.jumlah} onChange={(e) => onChange(index, "jumlah", e.target.value === "" ? 0 : Number(e.target.value))} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                      {selected && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">{selected.unit}</span>}
                    </div>
                  </div>

                  {selected && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                      <div className="text-xs font-medium text-emerald-800">{ACTIVITY_LABELS[input.aktivitas] || selected.label}</div>
                      <div className="text-[11px] text-emerald-700 mt-1">Scope: {selected.scope}</div>
                      <div className="text-[11px] text-emerald-700">Faktor Emisi: {selected.factor} kgCO₂e/{selected.unit}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={onAdd} className="w-full border-2 border-dashed border-emerald-300 rounded-2xl py-3 flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition"><Plus size={16} />Tambah Aktivitas</button>
          <button onClick={onSubmit} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl py-3 font-semibold shadow-sm transition disabled:opacity-50">{loading ? "Menghitung..." : "Hitung Emisi"}</button>
        </div>
      )}

      {activeTab === "import" && (
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Upload size={18} className="text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-900">Import Excel / CSV</h2>
          </div>

          {selectedFile ? (
            <div className="flex flex-col items-center justify-center gap-3 border-2 border-solid border-emerald-500 bg-emerald-50/30 rounded-2xl p-8 transition">
              <div className="flex gap-3"><FileSpreadsheet className="text-emerald-600" /></div>
              <div className="text-center">
                <p className="text-xs text-gray-400 font-medium">File Terpilih:</p>
                <div onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-2 bg-white text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200 text-sm font-bold shadow-sm mt-1">
                  <span>{selectedFile.name}</span>
                  <button onClick={handleClearFile} className="text-gray-400 hover:text-red-600 ml-1 transition p-0.5 hover:bg-gray-100 rounded-md" title="Hapus File"><X size={14} /></button>
                </div>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-emerald-300 rounded-2xl p-8 cursor-pointer hover:bg-emerald-50 transition bg-white relative">
              <div className="flex gap-3"><FileSpreadsheet className="text-emerald-600" /></div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800">Upload File Excel atau CSV</p>
                <p className="text-xs text-gray-500 mt-1">.xlsx .xls .csv</p>
              </div>
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={uploading} onChange={handleFileUpload} />
            </label>
          )}

          <div className="mt-5 bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-gray-900">Format Dokumen</h4>
              <button onClick={downloadTemplateExcel} className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition"><Download size={14} />Download Template</button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-emerald-50 text-gray-700">
                    <th className="px-3 py-2 text-left border-b">No</th>
                    <th className="px-3 py-2 text-left border-b">Periode</th>
                    <th className="px-3 py-2 text-left border-b">Scope</th>
                    <th className="px-3 py-2 text-left border-b">Kategori Aktivitas</th>
                    <th className="px-3 py-2 text-left border-b">Detail Aktivitas</th>
                    <th className="px-3 py-2 text-left border-b">Jumlah</th>
                    <th className="px-3 py-2 text-left border-b">Satuan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white"><td className="px-3 py-2 border-b">1</td><td className="px-3 py-2 border-b">2026-05-01</td><td className="px-3 py-2 border-b">Scope 1</td><td className="px-3 py-2 border-b">Pertalite</td><td className="px-3 py-2 border-b">Mobil Dinas</td><td className="px-3 py-2 border-b">45.5</td><td className="px-3 py-2 border-b">Liter</td></tr>
                  <tr className="bg-gray-50"><td className="px-3 py-2 border-b">2</td><td className="px-3 py-2 border-b">2026-05-01</td><td className="px-3 py-2 border-b">Scope 2</td><td className="px-3 py-2 border-b">Listrik PLN</td><td className="px-3 py-2 border-b">Gedung</td><td className="px-3 py-2 border-b">1250</td><td className="px-3 py-2 border-b">kWh</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5 border-t border-gray-100 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Riwayat File Terupload</h4>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">{importedFiles.length} Berkas</span>
            </div>

            {importedFiles.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl bg-gray-50/50"><p className="text-xs text-gray-400">Belum ada riwayat dokumen terunggah.</p></div>
            ) : (
              <div className="max-h-[24vh] overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-gray-200">
                {importedFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:border-emerald-400 transition shadow-sm gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-gray-50 rounded-lg shrink-0">
                        <FileSpreadsheet size={16} className="text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate" title={file.file_name}>{file.file_name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-2">
                          <span>{new Date(file.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-medium">{file.total_records_extracted} baris data</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {onDownloadFile && (
                        <button onClick={() => onDownloadFile(file.file_path, file.file_name)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition"><Download size={14} /></button>
                      )}
                      {onDeleteFile && (
                        <button onClick={() => onDeleteFile(file.id, file.file_path)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {uploading && (
            <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700 font-medium bg-emerald-50 p-3 rounded-xl border border-emerald-100">
              <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              Sedang memproses & mengekstrak berkas...
            </div>
          )}
        </div>
      )}

      {/* MODAL NOTIFIKASI */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/20 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-xs w-full text-center space-y-3 border border-gray-100">
            <div className="flex justify-center">{modal.type === "success" ? <CheckCircle className="text-emerald-500" size={44} /> : <XCircle className="text-red-500" size={44} />}</div>
            <div className="space-y-1"><h3 className="text-sm font-bold text-gray-900">{modal.title}</h3><p className="text-xs text-gray-500 leading-relaxed">{modal.message}</p></div>
          </div>
        </div>
      )}
    </div>
  );
}