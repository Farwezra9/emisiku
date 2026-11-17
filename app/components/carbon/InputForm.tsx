// Simpan sebagai: app/components/carbon/InputForm.tsx
"use client";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "@/app/styles/datepicker.css";
import { useState, useCallback } from "react";
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
  X,
  Calendar,
  BookOpen,
  ExternalLink,
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
import AlertModal from "@/app/components/ui/alert-modal";

const display = "font-[family-name:var(--font-display)]";

// ── Token gaya ───────────────────────────────────────────────────────────────
const labelCls = "text-[11px] font-semibold text-stone-600";
const fieldBase =
  "w-full rounded border bg-white px-3 py-2 text-[13px] text-stone-900 placeholder:text-stone-400 outline-none transition focus:ring-2";
const fieldOk = "border-stone-300 focus:border-emerald-700 focus:ring-emerald-700/20";
const fieldErr = "border-red-500 bg-red-50/40 focus:border-red-600 focus:ring-red-500/20";
const thinScroll =
  "[scrollbar-width:thin] [scrollbar-color:#c9c3b3_transparent]";

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
      case "Fuel": case "Gas": case "Industrial Fuel": return <Fuel size={13} className="text-amber-700" />;
      case "Electricity": case "Renewable Energy": return <Zap size={13} className="text-amber-600" />;
      case "Transportation": return <Plane size={13} className="text-sky-700" />;
      case "Logistics": return <Truck size={13} className="text-stone-600" />;
      case "Waste": case "Hazardous Waste": case "Wastewater": return <Trash size={13} className="text-emerald-700" />;
      case "Water": return <Droplets size={13} className="text-cyan-700" />;
      default: return <Factory size={13} className="text-stone-500" />;
    }
  };

  const scope1Options = ACTIVITY_OPTIONS.filter((item) => item.scope === "Scope 1 (Direct)");
  const scope2Options = ACTIVITY_OPTIONS.filter((item) => item.scope === "Scope 2 (Indirect - Energy)");
  const scope3Options = ACTIVITY_OPTIONS.filter((item) => item.scope === "Scope 3 (Value Chain)");

  const currentRefMeta = REFERENCE_METADATA[selectedReference];

  // ── Referensi Selector ─────────────────────────────────────────────────────
  const referenceSelector = (
    <div className="border-b border-stone-200 px-4 py-3">
      <div className="mb-2 flex items-center gap-1.5">
        <BookOpen size={13} className="text-stone-500" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-600">
          Referensi Faktor Emisi
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {REFERENCE_ORDER.map((ref) => {
          const meta = REFERENCE_METADATA[ref];
          const isActive = selectedReference === ref;
          return (
            <button
              key={ref}
              onClick={() => onReferenceChange(ref)}
              className={`rounded border px-2 py-1.5 text-center text-[12px] font-semibold transition-colors ${
                isActive
                  ? "border-emerald-900 bg-emerald-900 text-white"
                  : "border-stone-300 bg-white text-stone-600 hover:border-stone-400 hover:text-stone-900"
              }`}
            >
              {meta.shortLabel}
            </button>
          );
        })}
      </div>

      <div className="mt-2.5 rounded border border-stone-200 bg-[#f1eee4] px-2.5 py-2">
        <div className="flex items-start justify-between gap-2">
          <p className="flex-1 text-[11px] leading-relaxed text-stone-700">
            {currentRefMeta.description}
          </p>
          <a
            href={currentRefMeta.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 shrink-0 text-stone-500 transition hover:text-emerald-900"
            title="Buka sumber referensi"
          >
            <ExternalLink size={12} />
          </a>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {currentRefMeta.scopeCoverage.map((sc) => (
            <span
              key={sc}
              className="rounded border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-stone-700"
            >
              {sc}
            </span>
          ))}
          <span className="ml-auto text-[10px] text-stone-500">
            Diperbarui: {currentRefMeta.lastUpdated}
          </span>
        </div>
      </div>
    </div>
  );

  const tabClass = (active: boolean) =>
    `flex-1 border-b-2 py-2.5 text-[13px] font-semibold transition-colors ${
      active
        ? "-mb-px border-emerald-800 bg-[#fbfaf6] text-emerald-950"
        : "border-transparent text-stone-500 hover:text-stone-800"
    }`;

  return (
    <div className="relative overflow-hidden rounded-md border border-stone-300 bg-[#fbfaf6]">
      {/* Tab switcher */}
      <div className="flex border-b border-stone-300 bg-[#f1eee4]">
        <button onClick={() => setActiveTab("manual")} className={tabClass(activeTab === "manual")}>
          Input Manual
        </button>
        <button onClick={() => setActiveTab("import")} className={tabClass(activeTab === "import")}>
          Import File
        </button>
      </div>

      {referenceSelector}

      {/* ── MANUAL TAB ────────────────────────────────────────────────────── */}
      {activeTab === "manual" && (
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <Calculator size={16} className="text-emerald-800" />
            <h2 className={`${display} text-base font-medium text-emerald-950`}>
              Input Aktivitas Emisi
            </h2>
          </div>

          <div className={`max-h-[40vh] space-y-2.5 overflow-y-auto pr-1 ${thinScroll}`}>
            {inputs.map((input, index) => {
              const selected = ACTIVITY_OPTIONS.find((item) => item.value === input.aktivitas);
              const factorResult = selected ? getEmissionFactor(selected, selectedReference) : null;
              const rowErr = fieldErrors[index] || {};

              return (
                <div key={index} className="space-y-2.5 rounded border border-stone-300 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-900">
                        Aktivitas #{index + 1}
                      </span>
                      {selected && (
                        <span className="flex items-center gap-1 text-[11px] text-stone-500">
                          {getCategoryIcon(selected.category)}
                          {selected.category}
                        </span>
                      )}
                    </div>
                    {inputs.length > 1 && (
                      <button
                        onClick={() => handleRemoveRow(index)}
                        className="rounded p-1 text-stone-400 transition hover:bg-red-50 hover:text-red-700"
                        aria-label={`Hapus aktivitas ${index + 1}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className={labelCls}>Jenis Aktivitas</label>
                    <select
                      value={input.aktivitas}
                      onChange={(e) => onChange(index, "aktivitas", e.target.value)}
                      className={`${fieldBase} ${fieldOk}`}
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
                    <label className={labelCls}>
                      Detail Aktivitas <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Mobil Operasional Avanza"
                      value={input.detail_aktivitas}
                      onChange={(e) => {
                        onChange(index, "detail_aktivitas", e.target.value);
                        if (e.target.value.trim() !== "") clearFieldError(index, "detail");
                      }}
                      className={`${fieldBase} ${rowErr.detail ? fieldErr : fieldOk}`}
                    />
                    {rowErr.detail && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-red-600">
                        <AlertCircle size={11} /> Detail aktivitas wajib diisi.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Tahun aktivitas */}
                    <div className="space-y-1">
                      <label className={labelCls}>
                        Tahun <span className="text-red-600">*</span>
                      </label>
                      <div className="datepicker-wrapper relative w-full">
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
                          placeholderText="Pilih tahun"
                          wrapperClassName="w-full"
                          className={`${fieldBase} pr-8 ${rowErr.periode ? fieldErr : fieldOk}`}
                        />
                        <Calendar size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      </div>
                      {rowErr.periode && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-red-600">
                          <AlertCircle size={11} /> Wajib diisi.
                        </p>
                      )}
                    </div>

                    {/* Jumlah */}
                    <div className="space-y-1">
                      <label className={labelCls}>
                        Jumlah <span className="text-red-600">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="0"
                          value={input.jumlah === 0 ? "" : input.jumlah}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 0 : Number(e.target.value);
                            onChange(index, "jumlah", val);
                            if (val > 0) clearFieldError(index, "jumlah");
                          }}
                          className={`${fieldBase} ${selected ? "pr-14" : ""} ${rowErr.jumlah ? fieldErr : fieldOk}`}
                        />
                        {selected && (
                          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-stone-400">
                            {selected.unit}
                          </span>
                        )}
                      </div>
                      {rowErr.jumlah && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-red-600">
                          <AlertCircle size={11} /> Harus lebih dari 0.
                        </p>
                      )}
                    </div>
                  </div>

                  {selected && factorResult && (
                    <div className="rounded border border-[#cfdccf] bg-[#eef3ec] px-2.5 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] font-semibold text-emerald-950">
                          {ACTIVITY_LABELS[input.aktivitas] || selected.label}
                        </div>
                        {factorResult.isFallback && factorResult.usedRef && (
                          <span className="whitespace-nowrap rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-900">
                            ↩ {factorResult.usedRef}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] text-emerald-900/80">Scope: {selected.scope}</div>
                      <div className="text-[11px] text-emerald-900/80">
                        Faktor emisi ({selectedReference}): {factorResult.value} kgCO₂e/{selected.unit}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={handleAddRow}
            className="flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-emerald-800/40 py-2 text-[13px] font-semibold text-emerald-900 transition hover:bg-emerald-50"
          >
            <Plus size={14} />
            Tambah Aktivitas
          </button>
          <button
            onClick={handleSubmitClick}
            disabled={loading}
            className="w-full rounded bg-emerald-900 py-2.5 text-[13px] font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
          >
            {loading ? "Menghitung..." : "Hitung Emisi"}
          </button>
        </div>
      )}

      {/* ── IMPORT TAB ────────────────────────────────────────────────────── */}
      {activeTab === "import" && (
        <div className="space-y-4 p-4">
          <div className="flex items-center gap-2">
            <Upload size={16} className="text-emerald-800" />
            <h2 className={`${display} text-base font-medium text-emerald-950`}>
              Import Excel / CSV
            </h2>
          </div>

          {/* Drop Zone */}
          <label
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded border-2 p-6 transition-colors ${
              selectedFile
                ? "border-solid border-emerald-800 bg-emerald-50/50"
                : isDragging
                ? "border-solid border-emerald-700 bg-emerald-50"
                : "border-dashed border-stone-400 bg-white hover:border-emerald-700 hover:bg-emerald-50/50"
            }`}
          >
            <div
              className={`flex h-11 w-11 items-center justify-center rounded ${
                isDragging ? "bg-emerald-800" : "bg-[#eef3ec]"
              }`}
            >
              <FileSpreadsheet className={`h-6 w-6 ${isDragging ? "text-white" : "text-emerald-800"}`} />
            </div>

            {selectedFile ? (
              <div className="text-center">
                <p className="mb-1.5 text-[11px] font-medium text-stone-500">File terpilih:</p>
                <div
                  onClick={(e) => e.preventDefault()}
                  className="inline-flex items-center gap-2 rounded border border-emerald-200 bg-white px-2.5 py-1.5 text-[13px] font-semibold text-emerald-950"
                >
                  <span>{selectedFile.name}</span>
                  <button
                    onClick={handleClearFile}
                    className="rounded p-0.5 text-stone-400 transition hover:bg-stone-100 hover:text-red-700"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-[13px] font-semibold text-stone-800">
                  {isDragging ? "Lepaskan file di sini..." : "Tarik file ke sini atau klik untuk memilih"}
                </p>
                <p className="mt-0.5 text-[11px] text-stone-500">Format: .xlsx · .xls · .csv</p>
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
            <div className="flex items-center gap-2 rounded border border-[#cfdccf] bg-[#eef3ec] px-3 py-2 text-[13px] font-medium text-emerald-900">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-800 border-t-transparent" />
              Memproses dan mengekstrak berkas...
            </div>
          )}

          {/* Format dokumen + template */}
          <div className="rounded border border-stone-300 bg-white p-3">
            <div className="mb-2.5 flex items-center justify-between">
              <h4 className="text-[13px] font-semibold text-stone-900">Format Dokumen</h4>
              <button
                onClick={downloadTemplateExcel}
                className="flex items-center gap-1.5 rounded bg-emerald-900 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-emerald-800"
              >
                <Download size={13} />
                Unduh Template
              </button>
            </div>
            <div className={`overflow-x-auto rounded border border-stone-200 ${thinScroll}`}>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-[#f1eee4] text-stone-600">
                    {["No", "Periode", "Scope", "Kategori Aktivitas", "Detail Aktivitas", "Jumlah", "Satuan"].map((h) => (
                      <th key={h} className="whitespace-nowrap border-b border-stone-200 px-2.5 py-1.5 text-left font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-stone-700">
                  <tr className="bg-white">
                    <td className="border-b border-stone-100 px-2.5 py-1.5">1</td>
                    <td className="border-b border-stone-100 px-2.5 py-1.5">2026</td>
                    <td className="border-b border-stone-100 px-2.5 py-1.5">Scope 1</td>
                    <td className="border-b border-stone-100 px-2.5 py-1.5">Pertalite</td>
                    <td className="border-b border-stone-100 px-2.5 py-1.5">Mobil Dinas</td>
                    <td className="border-b border-stone-100 px-2.5 py-1.5">45.5</td>
                    <td className="border-b border-stone-100 px-2.5 py-1.5">Liter</td>
                  </tr>
                  <tr className="bg-[#faf9f4]">
                    <td className="px-2.5 py-1.5">2</td>
                    <td className="px-2.5 py-1.5">2026</td>
                    <td className="px-2.5 py-1.5">Scope 2</td>
                    <td className="px-2.5 py-1.5">Listrik PLN Grid Jamali</td>
                    <td className="px-2.5 py-1.5">Gedung</td>
                    <td className="px-2.5 py-1.5">1250</td>
                    <td className="px-2.5 py-1.5">kWh</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Riwayat file */}
          <div className="space-y-2 border-t border-stone-200 pt-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-600">
                Riwayat File Terunggah
              </h4>
              <span className="rounded border border-stone-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-stone-600">
                {importedFiles.length} berkas
              </span>
            </div>

            {importedFiles.length === 0 ? (
              <div className="rounded border border-dashed border-stone-300 bg-white/60 py-5 text-center">
                <p className="text-[11px] text-stone-500">Belum ada riwayat dokumen terunggah.</p>
              </div>
            ) : (
              <div className={`max-h-[22vh] space-y-1.5 overflow-y-auto pr-1 ${thinScroll}`}>
                {importedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between gap-3 rounded border border-stone-300 bg-white px-2.5 py-2 transition-colors hover:border-emerald-700"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="shrink-0 rounded bg-[#eef3ec] p-1.5">
                        <FileSpreadsheet size={14} className="text-emerald-800" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-semibold text-stone-900" title={file.file_name}>
                          {file.file_name}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-stone-500">
                          <span>
                            {new Date(file.created_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          <span>•</span>
                          <span className="font-medium text-emerald-800">{file.total_records_extracted} baris data</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {onDownloadFile && (
                        <button
                          onClick={() => onDownloadFile(file.file_path, file.file_name)}
                          className="rounded p-1.5 text-stone-400 transition hover:bg-[#eef3ec] hover:text-emerald-800"
                          aria-label="Unduh berkas"
                        >
                          <Download size={14} />
                        </button>
                      )}
                      {onDeleteFile && (
                        <button
                          onClick={() => onDeleteFile(file.id, file.file_path)}
                          className="rounded p-1.5 text-stone-400 transition hover:bg-red-50 hover:text-red-700"
                          aria-label="Hapus berkas"
                        >
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

      {/* Alert (gaya seragam dengan seluruh aplikasi) */}
      <AlertModal
        isOpen={modal.isOpen}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal((p) => ({ ...p, isOpen: false }))}
      />
    </div>
  );
}