//components/carbon/InputForm.tsx
"use client";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "@/app/styles/datepicker.css";
import { useState, useEffect, useCallback } from "react";
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
  BookOpen,
  ExternalLink,
  BookText,
  AlertCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { InputRow } from "@/app/types/carbon";
import { importEmissionFile } from "@/app/services/import.service";
import {
  ACTIVITY_OPTIONS,
  ACTIVITY_LABELS,
  REFERENCE_METADATA,
  ReferenceKey,
  getEmissionFactor,
} from "@/app/constants/activities";
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
  selectedReference: ReferenceKey;
  onReferenceChange: (ref: ReferenceKey) => void;
}

const REFERENCE_ORDER: ReferenceKey[] = ["ESDM", "DEFRA"];

// ── Validasi Input Manual ─────────────────────────────────────────────────
// Field wajib: Tahun (periode), Detail Aktivitas, dan Jumlah (> 0).
// "Jenis Aktivitas" tidak divalidasi karena <select> selalu punya nilai
// default ("listrik_pln"), jadi secara teknis tidak pernah "kosong".
interface FieldErrorMap {
  [index: number]: {
    periode?: boolean;
    detail?: boolean;
    jumlah?: boolean;
  };
}

function validateInputs(rows: InputRow[]): { errors: FieldErrorMap; messages: string[] } {
  const errors: FieldErrorMap = {};
  const messages: string[] = [];

  rows.forEach((row, idx) => {
    const rowErr: FieldErrorMap[number] = {};
    const baris = idx + 1;

    if (!row.periode || Number(row.periode) === 0) {
      rowErr.periode = true;
      messages.push(`Baris #${baris}: Tahun aktivitas belum dipilih.`);
    }
    if (!row.detail_aktivitas || row.detail_aktivitas.trim() === "") {
      rowErr.detail = true;
      messages.push(`Baris #${baris}: Detail aktivitas belum diisi.`);
    }
    if (!row.jumlah || Number(row.jumlah) <= 0) {
      rowErr.jumlah = true;
      messages.push(`Baris #${baris}: Jumlah aktivitas harus lebih besar dari 0.`);
    }

    if (Object.keys(rowErr).length > 0) errors[idx] = rowErr;
  });

  return { errors, messages };
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
  selectedReference,
  onReferenceChange,
}: Props) {
  const [activeTab, setActiveTab] = useState<"manual" | "import">("manual");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({});

  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: "success" | "error";
    title: string;
    message: string;
  }>({ isOpen: false, type: "success", title: "", message: "" });

  useEffect(() => {
    if (modal.isOpen) {
      const timer = setTimeout(() => setModal((p) => ({ ...p, isOpen: false })), 3000);
      return () => clearTimeout(timer);
    }
  }, [modal.isOpen]);

  // ── Helper: bersihkan flag error satu field tertentu saat user mengisinya ──
  const clearFieldError = (index: number, field: "periode" | "detail" | "jumlah") => {
    setFieldErrors((prev) => {
      if (!prev[index]?.[field]) return prev;
      const nextRow = { ...prev[index], [field]: false };
      return { ...prev, [index]: nextRow };
    });
  };

  // Index baris bergeser tiap kali baris ditambah/dihapus → reset semua flag
  // error supaya tidak ada highlight merah "menempel" di baris yang salah.
  const handleAddRow = () => {
    setFieldErrors({});
    onAdd();
  };
  const handleRemoveRow = (index: number) => {
    setFieldErrors({});
    onRemove(index);
  };

  // ── Submit manual dengan validasi ───────────────────────────────────────
  const handleSubmitClick = () => {
    if (inputs.length === 0) {
      setModal({
        isOpen: true, type: "error",
        title: "Data Kosong",
        message: "Tambahkan minimal satu aktivitas sebelum menghitung emisi.",
      });
      return;
    }

    const { errors, messages } = validateInputs(inputs);
    setFieldErrors(errors);

    if (messages.length > 0) {
      setModal({
        isOpen: true,
        type: "error",
        title: "Data Belum Lengkap",
        message: messages.join("\n"),
      });
      return;
    }

    onSubmit();
  };

  // ── Process uploaded file ──────────────────────────────────────────────────
  const processFile = useCallback(async (file: File) => {
    const allowedExtensions = ["xlsx", "xls", "csv"];
    const fileExt = file.name.split(".").pop()?.toLowerCase();

    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      setModal({
        isOpen: true, type: "error",
        title: "Format Berkas Ditolak",
        message: "Format file tidak didukung! Harap unggah berkas Excel (.xlsx/.xls) atau CSV (.csv).",
      });
      return;
    }

    // Tolak berkas 0 byte sebelum sempat diproses sama sekali.
    if (file.size === 0) {
      setModal({
        isOpen: true, type: "error",
        title: "Berkas Kosong",
        message: `Berkas "${file.name}" berukuran 0 byte (kosong) dan tidak dapat diproses.`,
      });
      return;
    }

    setSelectedFile(file);

    try {
      setUploading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Akses ditolak. Sila login kembali.");

      // 1) Ekstraksi DULU, sebelum upload ke storage. Kalau hasilnya kosong,
      //    kita berhenti di sini — tidak ada file "yatim" tersimpan di storage
      //    tanpa record terkait, dan tidak ada notifikasi "sukses" yang palsu.
      const result = await importEmissionFile(file, selectedReference);
      const extractedRows = result.detail || result.rawExtractedRows || result.data || [];

      if (!extractedRows || extractedRows.length === 0) {
        setModal({
          isOpen: true, type: "error",
          title: "Tidak Ada Data Ditemukan",
          message: `Berkas "${file.name}" berhasil dibaca, tetapi tidak ada baris data aktivitas emisi yang valid di dalamnya. Pastikan format sesuai template dan kolom "Jumlah" lebih besar dari 0.`,
        });
        setSelectedFile(null);
        return;
      }

      // 2) Baru upload ke storage setelah dipastikan ada datanya.
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
      const filePath = `${session.user.id}/${Date.now()}_${cleanFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("carbon-files")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      await onImportSuccess(result, extractedRows, file.name, filePath, file.size);

      setModal({
        isOpen: true, type: "success",
        title: "Import Berhasil",
        message: `Berkas "${file.name}" sukses diunggah dan diekstrak (${extractedRows.length} baris data) ke dashboard.`,
      });
      setSelectedFile(null);
    } catch (error: any) {
      console.error(error);
      setModal({
        isOpen: true, type: "error",
        title: "Import Gagal",
        message: error.message || "Struktur data dokumen tidak valid atau rusak.",
      });
      setSelectedFile(null);
    } finally {
      setUploading(false);
    }
  }, [selectedReference, onImportSuccess]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    if (e.target) e.target.value = "";
  };

  // ── Drag & Drop handlers ────────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
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

  const currentRefMeta = REFERENCE_METADATA[selectedReference];

  // ── Referensi Selector ─────────────────────────────────────────────────────
  const ReferenceSelector = () => (
    <div className="px-6 pt-5 pb-4 border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen size={14} className="text-gray-500" />
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Referensi Faktor Emisi</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {REFERENCE_ORDER.map((ref) => {
          const meta = REFERENCE_METADATA[ref];
          const isActive = selectedReference === ref;
          return (
            <button
              key={ref}
              onClick={() => onReferenceChange(ref)}
              className={`
                relative py-2 px-2 rounded-md text-[11px] font-bold border transition-all text-center leading-tight
                ${isActive
                  ? `${meta.badge} border-current shadow-sm ring-1 ring-offset-1 ring-current/20`
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"
                }
              `}
            >
              {meta.shortLabel}
            </button>
          );
        })}
      </div>
      <div className={`mt-3 rounded-lg border px-3 py-2.5 ${currentRefMeta.badge}`}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] leading-relaxed font-medium flex-1">{currentRefMeta.description}</p>
          <a href={currentRefMeta.url} target="_blank" rel="noopener noreferrer"
            className="shrink-0 mt-0.5 opacity-60 hover:opacity-100 transition" title="Buka sumber referensi">
            <ExternalLink size={12} />
          </a>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {currentRefMeta.scopeCoverage.map((sc) => (
            <span key={sc} className="text-[10px] font-semibold bg-white/60 px-1.5 py-0.5 rounded">{sc}</span>
          ))}
        </div>
        <p className="text-[10px] mt-1 opacity-70">Diperbarui: {currentRefMeta.lastUpdated}</p>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden relative">
      {/* Tab switcher */}
      <div className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
        <div className="flex gap-0.5 p-2">
          <button
            onClick={() => setActiveTab("manual")}
            className={`flex-1 py-3 px-4 text-sm font-semibold rounded-md transition duration-200 ${
              activeTab === "manual"
                ? "bg-white text-emerald-700 border border-emerald-200 shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            Manual Input
          </button>
          <button
            onClick={() => setActiveTab("import")}
            className={`flex-1 py-3 px-4 text-sm font-semibold rounded-md transition duration-200 ${
              activeTab === "import"
                ? "bg-white text-emerald-700 border border-emerald-200 shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            Import File
          </button>
        </div>
      </div>

      <ReferenceSelector />

      {/* ── MANUAL TAB ────────────────────────────────────────────────────── */}
      {activeTab === "manual" && (
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Calculator size={18} className="text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-900">Input Aktivitas Emisi</h2>
          </div>

          <div className="max-h-[58vh] overflow-y-auto pr-1 space-y-3 scrollbar-thin scrollbar-thumb-gray-200">
            {inputs.map((input, index) => {
              const selected = ACTIVITY_OPTIONS.find((item) => item.value === input.aktivitas);
              const factorResult = selected ? getEmissionFactor(selected, selectedReference) : null;
              const rowErr = fieldErrors[index] || {};

              return (
                <div key={index} className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
                        Aktivitas #{index + 1}
                      </span>
                      {selected && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          {getCategoryIcon(selected.category)}{selected.category}
                        </span>
                      )}
                    </div>
                    {inputs.length > 1 && (
                      <button onClick={() => handleRemoveRow(index)} className="text-red-500 hover:bg-red-50 p-2 rounded transition">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Tahun aktivitas — full width */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600">
                      Tahun Aktivitas <span className="text-red-500">*</span>
                    </label>
                    <div className="relative w-full datepicker-wrapper">
                      <DatePicker
                        selected={input.periode ? new Date(Number(input.periode), 0, 1) : null}
                        onChange={(date: Date | null) => {
                          if (date) {
                            onChange(index, "periode", date.getFullYear().toString());
                            clearFieldError(index, "periode");
                          }
                        }}
                        showYearPicker
                        dateFormat="yyyy"
                        placeholderText="Pilih Tahun Aktivitas"
                        wrapperClassName="w-full"
                        className={`w-full rounded-lg border px-4 pr-10 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:border-emerald-500 ${
                          rowErr.periode
                            ? "border-red-400 focus:ring-red-400 bg-red-50/40"
                            : "border-gray-300 focus:ring-emerald-500"
                        }`}
                      />
                      <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                    {rowErr.periode && (
                      <p className="text-[11px] text-red-500 flex items-center gap-1 mt-1">
                        <AlertCircle size={11} /> Tahun aktivitas wajib diisi.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600">Jenis Aktivitas</label>
                    <select
                      value={input.aktivitas}
                      onChange={(e) => onChange(index, "aktivitas", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <optgroup label="Scope 1 — Direct Emission">
                        {scope1Options.map((o) => <option key={o.value} value={o.value}>{o.label} • {o.unit}</option>)}
                      </optgroup>
                      <optgroup label="Scope 2 — Energy Indirect">
                        {scope2Options.map((o) => <option key={o.value} value={o.value}>{o.label} • {o.unit}</option>)}
                      </optgroup>
                      <optgroup label="Scope 3 — Value Chain">
                        {scope3Options.map((o) => <option key={o.value} value={o.value}>{o.label} • {o.unit}</option>)}
                      </optgroup>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600">
                      Detail Aktivitas <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Mobil Operasional Avanza"
                      value={input.detail_aktivitas}
                      onChange={(e) => {
                        onChange(index, "detail_aktivitas", e.target.value);
                        if (e.target.value.trim() !== "") clearFieldError(index, "detail");
                      }}
                      className={`w-full rounded-lg border px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:border-emerald-500 ${
                        rowErr.detail
                          ? "border-red-400 focus:ring-red-400 bg-red-50/40"
                          : "border-gray-300 focus:ring-emerald-500"
                      }`}
                    />
                    {rowErr.detail && (
                      <p className="text-[11px] text-red-500 flex items-center gap-1 mt-1">
                        <AlertCircle size={11} /> Detail aktivitas wajib diisi.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600">
                      Jumlah Aktivitas <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="Masukkan jumlah aktivitas"
                        value={input.jumlah === 0 ? "" : input.jumlah}
                        onChange={(e) => {
                          const val = e.target.value === "" ? 0 : Number(e.target.value);
                          onChange(index, "jumlah", val);
                          if (val > 0) clearFieldError(index, "jumlah");
                        }}
                        className={`w-full rounded-lg border px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:border-emerald-500 ${
                          rowErr.jumlah
                            ? "border-red-400 focus:ring-red-400 bg-red-50/40"
                            : "border-gray-300 focus:ring-emerald-500"
                        }`}
                      />
                      {selected && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                          {selected.unit}
                        </span>
                      )}
                    </div>
                    {rowErr.jumlah && (
                      <p className="text-[11px] text-red-500 flex items-center gap-1 mt-1">
                        <AlertCircle size={11} /> Jumlah harus lebih besar dari 0.
                      </p>
                    )}
                  </div>

                  {selected && factorResult && (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-medium text-emerald-800">
                          {ACTIVITY_LABELS[input.aktivitas] || selected.label}
                        </div>
                        {factorResult.isFallback && factorResult.usedRef && (
                          <span className="text-[10px] bg-white/70 text-emerald-700 px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">
                            ↩ {factorResult.usedRef}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-emerald-700 mt-1">Scope: {selected.scope}</div>
                      <div className="text-[11px] text-emerald-700">
                        Faktor Emisi ({selectedReference}): {factorResult.value} kgCO₂e/{selected.unit}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={handleAddRow}
            className="w-full border-2 border-dashed border-emerald-300 rounded-lg py-3 flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition"
          >
            <Plus size={16} />Tambah Aktivitas
          </button>
          <button
            onClick={handleSubmitClick}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-3 font-semibold shadow-sm transition disabled:opacity-50"
          >
            {loading ? "Menghitung..." : "Hitung Emisi"}
          </button>
        </div>
      )}

      {/* ── IMPORT TAB ────────────────────────────────────────────────────── */}
      {activeTab === "import" && (
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Upload size={18} className="text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-900">Import Excel / CSV</h2>
          </div>

          {/* Drop Zone */}
          <label
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              flex flex-col items-center justify-center gap-4
              border-2 rounded-lg p-10 cursor-pointer transition-all
              ${selectedFile
                ? "border-solid border-emerald-500 bg-emerald-50/40"
                : isDragging
                  ? "border-solid border-emerald-400 bg-emerald-50 scale-[1.01]"
                  : "border-dashed border-emerald-300 bg-white hover:bg-emerald-50 hover:border-emerald-400"
              }
            `}
          >
            <div className={`w-14 h-14 rounded-lg flex items-center justify-center transition-colors
              ${isDragging ? "bg-emerald-500" : "bg-emerald-100"}`}>
              <FileSpreadsheet className={`w-7 h-7 ${isDragging ? "text-white" : "text-emerald-600"}`} />
            </div>

            {selectedFile ? (
              <div className="text-center">
                <p className="text-xs text-gray-400 font-medium mb-2">File Terpilih:</p>
                <div
                  onClick={(e) => e.preventDefault()}
                  className="inline-flex items-center gap-2 bg-white text-emerald-800 px-3 py-2 rounded-lg border border-emerald-200 text-sm font-bold shadow-sm"
                >
                  <span>{selectedFile.name}</span>
                  <button
                    onClick={handleClearFile}
                    className="text-gray-400 hover:text-red-600 ml-1 transition p-0.5 hover:bg-gray-100 rounded"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800">
                  {isDragging ? "Lepaskan file di sini..." : "Drag & drop file atau klik untuk upload"}
                </p>
                <p className="text-xs text-gray-500 mt-1">Format: .xlsx · .xls · .csv</p>
              </div>
            )}

            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              disabled={uploading}
              onChange={handleFileUpload}
            />
          </label>

          {uploading && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium bg-emerald-50 p-3 rounded-lg border border-emerald-100">
              <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              Sedang memproses & mengekstrak berkas...
            </div>
          )}

          {/* Format dokumen + template */}
          <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-gray-900">Format Dokumen</h4>
              <button
                onClick={downloadTemplateExcel}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
              >
                <Download size={14} />Download Template
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
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
                  <tr className="bg-white">
                    <td className="px-3 py-2 border-b">1</td><td className="px-3 py-2 border-b">2026</td>
                    <td className="px-3 py-2 border-b">Scope 1</td><td className="px-3 py-2 border-b">Pertalite</td>
                    <td className="px-3 py-2 border-b">Mobil Dinas</td><td className="px-3 py-2 border-b">45.5</td>
                    <td className="px-3 py-2 border-b">Liter</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-3 py-2 border-b">2</td><td className="px-3 py-2 border-b">2026</td>
                    <td className="px-3 py-2 border-b">Scope 2</td><td className="px-3 py-2 border-b">Listrik PLN Grid Jamali</td>
                    <td className="px-3 py-2 border-b">Gedung</td><td className="px-3 py-2 border-b">1250</td>
                    <td className="px-3 py-2 border-b">kWh</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Riwayat file */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Riwayat File Terupload</h4>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
                {importedFiles.length} Berkas
              </span>
            </div>

            {importedFiles.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                <p className="text-xs text-gray-400">Belum ada riwayat dokumen terunggah.</p>
              </div>
            ) : (
              <div className="max-h-[24vh] overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-gray-200">
                {importedFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-emerald-400 transition shadow-sm gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-gray-50 rounded shrink-0">
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
                        <button onClick={() => onDownloadFile(file.file_path, file.file_name)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition">
                          <Download size={14} />
                        </button>
                      )}
                      {onDeleteFile && (
                        <button onClick={() => onDeleteFile(file.id, file.file_path)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal notifikasi */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/20 backdrop-blur-[2px]">
          <div className="bg-white rounded-lg p-6 shadow-2xl max-w-xs w-full text-center space-y-3 border border-gray-100">
            <div className="flex justify-center">
              {modal.type === "success"
                ? <CheckCircle className="text-emerald-500" size={44} />
                : <XCircle className="text-red-500" size={44} />}
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-gray-900">{modal.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-line">{modal.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}