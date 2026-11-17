// Simpan sebagai: app/components/carbon/EmissionTable.tsx
"use client";

import { useMemo, useState } from "react";
import {
  ClipboardList, ChevronLeft, ChevronRight, Filter,
  Trash2, FileDown, FileSpreadsheet, User, Leaf, ExternalLink,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import {
  ACTIVITY_LABELS, ACTIVITY_OPTIONS, REFERENCE_METADATA, ReferenceKey,
} from "@/app/constants/activities";
import { DetailOutput } from "@/app/types/carbon";
import { downloadLaporanExcel } from "@/app/utils/excelUtils";
import AlertModal from "@/app/components/ui/alert-modal";

const display = "font-[family-name:var(--font-display)]";

// ── Token gaya ───────────────────────────────────────────────────────────────
const btnOutline =
  "inline-flex items-center gap-1.5 rounded border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-800 transition hover:bg-stone-50";
const btnSolid =
  "inline-flex items-center gap-1.5 rounded bg-emerald-900 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800";
const btnDanger =
  "inline-flex items-center gap-1.5 rounded border border-red-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50";
const selectCls =
  "rounded border border-stone-300 bg-white px-2.5 py-1.5 text-xs text-stone-800 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20";
const thinScroll = "[scrollbar-width:thin] [scrollbar-color:#c9c3b3_transparent]";

// ─────────────────────────────────────────────────────────────────────────────
const FACTOR_REF_ORDER: ReferenceKey[] = ["ESDM", "DEFRA"];
const EPSILON = 0.0005;

// Warna lencana referensi: tanah (ESDM) dan lumut (DEFRA)
const REF_BADGE: Record<ReferenceKey, string> = {
  ESDM:  "bg-[#efe6d2] text-[#6b4f1d] border-[#d9c9a3]",
  DEFRA: "bg-[#dfe9e3] text-[#1b4332] border-[#b7cfc0]",
};
const REF_SHORT: Record<ReferenceKey, string> = { ESDM: "ESDM", DEFRA: "DEFRA" };

// Helper — resolve kategori dari ACTIVITY_OPTIONS berdasarkan value aktivitas
// Ini sumber kebenaran tunggal; tidak bergantung pada field `kategori` di DB.
function resolveKategori(aktivitas: string): string {
  return ACTIVITY_OPTIONS.find((o) => o.value === aktivitas)?.category ?? aktivitas;
}

// Helper — tentukan Energy_Type per Activity_ID
// Prioritas: kategori eksplisit "Renewable Energy" dari ACTIVITY_OPTIONS,
// fallback ke cek faktor emisi (untuk aktivitas renewable lain yang tidak dikategorikan eksplisit).
function getActivityEnergyType(aktivitas: string): "Renewable" | "Non-Renewable" {
  const activity = ACTIVITY_OPTIONS.find((a) => a.value === aktivitas);
  if (!activity) return "Non-Renewable";

  if (activity.category === "Renewable Energy") return "Renewable";

  const nonNullFactors = FACTOR_REF_ORDER
    .map((r) => activity.factors[r])
    .filter((f): f is number => f !== null);
  const hasZeroFactor = nonNullFactors.some((f) => f === 0);

  return hasZeroFactor ? "Renewable" : "Non-Renewable";
}

// Helper — tentukan nomor & deskripsi scope (dipakai di Dim_Scope)
function getScopeMeta(scope: string): { number: number; description: string } {
  if (scope.includes("1")) return { number: 1, description: "Direct Emissions" };
  if (scope.includes("2")) return { number: 2, description: "Indirect Emissions - Purchased Energy" };
  if (scope.includes("3")) return { number: 3, description: "Other Indirect Emissions (Value Chain)" };
  return { number: 0, description: "Unknown" };
}

// ─────────────────────────────────────────────────────────────────────────────
// DETEKSI REFERENSI
// ─────────────────────────────────────────────────────────────────────────────
interface DetectResult {
  ref: ReferenceKey | null;
  isAmbiguous: boolean;
  isZeroEmission: boolean;
  allMatches: ReferenceKey[];
}

function detectReference(
  aktivitas: string,
  faktorKonversi: number,
  emisiKgco2e: number,
  selectedReference: ReferenceKey
): DetectResult {
  const activity = ACTIVITY_OPTIONS.find((a) => a.value === aktivitas);
  if (!activity) return { ref: null, isAmbiguous: false, isZeroEmission: false, allMatches: [] };

  const nonNullFactors = FACTOR_REF_ORDER
    .map((r) => activity.factors[r])
    .filter((f): f is number => f !== null);

  const isZeroEmission =
    (nonNullFactors.length > 0 && nonNullFactors.every((f) => f === 0)) ||
    (faktorKonversi === 0 && emisiKgco2e === 0 && nonNullFactors.some((f) => f === 0));

  if (isZeroEmission) {
    const zeroRef =
      activity.factors[selectedReference] === 0
        ? selectedReference
        : FACTOR_REF_ORDER.find((r) => activity.factors[r] === 0) ?? null;
    return { ref: zeroRef, isAmbiguous: false, isZeroEmission: true, allMatches: zeroRef ? [zeroRef] : [] };
  }

  const matches: ReferenceKey[] = FACTOR_REF_ORDER.filter((r) => {
    const f = activity.factors[r];
    if (f === null) return false;
    return Math.abs(f - faktorKonversi) <= EPSILON;
  });

  if (matches.length === 0) return { ref: null, isAmbiguous: false, isZeroEmission: false, allMatches: [] };
  if (matches.length === 1) return { ref: matches[0], isAmbiguous: false, isZeroEmission: false, allMatches: matches };

  const preferred = matches.includes(selectedReference) ? selectedReference : matches[0];
  return { ref: preferred, isAmbiguous: true, isZeroEmission: false, allMatches: matches };
}

// ─────────────────────────────────────────────────────────────────────────────
// BADGE REFERENSI
// ─────────────────────────────────────────────────────────────────────────────
function ReferenceBadge({
  aktivitas, faktorKonversi, emisiKgco2e, selectedReference,
}: {
  aktivitas: string; faktorKonversi: number; emisiKgco2e: number; selectedReference: ReferenceKey;
}) {
  const { ref, isAmbiguous, isZeroEmission, allMatches } = detectReference(
    aktivitas, faktorKonversi, emisiKgco2e, selectedReference
  );

  if (isZeroEmission) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800"
        title="Energi terbarukan — faktor emisi nol"
      >
        <Leaf size={9} />Zero
      </span>
    );
  }
  if (ref) {
    const tooltipText = isAmbiguous
      ? `Nilai faktor identik di: ${allMatches.map((r) => REF_SHORT[r]).join(", ")} — ditampilkan sesuai referensi aktif (${REF_SHORT[ref]})`
      : REFERENCE_METADATA[ref].label;
    return (
      <span
        className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${REF_BADGE[ref]}`}
        title={tooltipText}
      >
        {REF_SHORT[ref]}
        {isAmbiguous && <span className="text-[9px] font-normal leading-none opacity-50">*</span>}
      </span>
    );
  }
  return <span className="text-[10px] font-medium text-stone-300" title="Faktor tidak cocok">—</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: set column widths
// ─────────────────────────────────────────────────────────────────────────────
function setColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws["!cols"] = widths.map((wch) => ({ wch }));
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT KE TABLEAU-READY XLSX — SKEMA RELATIONSHIPS (Fact + 2 Dim, 3 sheet)
// ─────────────────────────────────────────────────────────────────────────────
function exportTableauCSV(data: DetailOutput[], selectedReference: ReferenceKey) {
  const wb = XLSX.utils.book_new();

  // ── SHEET 1: Fact_Emissions — grain 1 baris per record aktivitas ──────────
  const factRows = data.map((row, i) => {
    let faktor = row.faktor_konversi ?? 0;
    if (faktor > 0 && faktor < 0.01) faktor *= 1000;

    const emisiKg = row.emisi_tCO2e * 1000;
    const { ref, isZeroEmission } = detectReference(row.aktivitas, faktor, emisiKg, selectedReference);
    const refLabel = isZeroEmission ? "Zero-Emission" : ref ? REF_SHORT[ref] : "Unknown";

    const periodeStr  = String(row.periode ?? "");
    const yearMatch   = periodeStr.match(/\b(19|20)\d{2}\b/);
    const periodeYear = yearMatch ? Number(yearMatch[0]) : null;

    return {
      "Record_ID":                       i + 1,
      "Activity_ID":                     row.aktivitas,              // FK -> Dim_Activity.Activity_ID
      "Activity_Detail":                 row.detail_aktivitas ?? "",
      "Scope":                           row.scope ?? "Unknown",     // FK -> Dim_Scope.Scope
      "Period_Year":                     periodeYear,
      "Unit":                            row.satuan ?? "",
      "Quantity":                        row.jumlah,
      "Emission_Factor_kgCO2e_per_unit": Number(faktor.toFixed(6)),
      "Emission_kgCO2e":                 Number(emisiKg.toFixed(4)),
      "Emission_tCO2e":                  Number(row.emisi_tCO2e.toFixed(6)),
      "Is_Zero_Emission":                isZeroEmission ? "Yes" : "No",
      "Reference_Source":                refLabel,
      "Data_Source":                     row.file_name ?? "Manual Input",
    };
  });

  const ws1 = XLSX.utils.json_to_sheet(factRows);
  setColWidths(ws1, [10, 24, 32, 22, 12, 10, 12, 30, 16, 16, 16, 18, 24]);
  XLSX.utils.book_append_sheet(wb, ws1, "Emissions");

  // ── SHEET 2: Dim_Activity — 1 baris per Activity_ID unik ──────────────────
  const uniqueActivityIds = Array.from(new Set(data.map((row) => row.aktivitas)));
  const dimActivity = uniqueActivityIds
    .sort((a, b) => a.localeCompare(b))
    .map((aktivitasId) => ({
      "Activity_ID":   aktivitasId,
      "Activity_Name": ACTIVITY_LABELS[aktivitasId] ?? aktivitasId,
      "Category":      resolveKategori(aktivitasId),
      "Energy_Type":   getActivityEnergyType(aktivitasId),
    }));

  const ws2 = XLSX.utils.json_to_sheet(dimActivity);
  setColWidths(ws2, [24, 32, 22, 16]);
  XLSX.utils.book_append_sheet(wb, ws2, "Category");

  // ── SHEET 3: Dim_Scope — 1 baris per Scope unik + total agregat ───────────
  const totalAllKg = data.reduce((s, r) => s + r.emisi_tCO2e * 1000, 0);

  const uniqueScopes = Array.from(new Set(data.map((row) => row.scope ?? "Unknown")));
  const dimScope = uniqueScopes
    .sort((a, b) => a.localeCompare(b))
    .map((scope) => {
      const meta = getScopeMeta(scope);
      const rowsInScope = data.filter((r) => (r.scope ?? "Unknown") === scope);
      const totalKg = rowsInScope.reduce((s, r) => s + r.emisi_tCO2e * 1000, 0);
      const totalT  = rowsInScope.reduce((s, r) => s + r.emisi_tCO2e, 0);

      return {
        "Scope":                 scope,
        "Scope_Number":          meta.number,
        "Scope_Description":     meta.description,
        "Total_Records":         rowsInScope.length,
        "Total_Emission_kgCO2e": Number(totalKg.toFixed(4)),
        "Total_Emission_tCO2e":  Number(totalT.toFixed(6)),
        "Percentage_of_Total_%": totalAllKg > 0 ? Number(((totalKg / totalAllKg) * 100).toFixed(2)) : 0,
      };
    });

  // Baris GRAND TOTAL di bawah Scope 1–3
  dimScope.push({
    "Scope":                 "GRAND TOTAL",
    "Scope_Number":          0,
    "Scope_Description":     "All Scopes",
    "Total_Records":         data.length,
    "Total_Emission_kgCO2e": Number(totalAllKg.toFixed(4)),
    "Total_Emission_tCO2e":  Number(data.reduce((s, r) => s + r.emisi_tCO2e, 0).toFixed(6)),
    "Percentage_of_Total_%": 100,
  });

  const ws3 = XLSX.utils.json_to_sheet(dimScope);
  setColWidths(ws3, [32, 14, 36, 14, 24, 22, 22]);
  XLSX.utils.book_append_sheet(wb, ws3, "Scope");

  // ── Tulis file ────────────────────────────────────────────────────────────
  const buf  = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `Tableau_GHG_Emission_${new Date().toISOString().split("T")[0]}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  detail: DetailOutput[];
  onDeleteAllRecords?: () => void;
  selectedReference: ReferenceKey;
}

// ─────────────────────────────────────────────────────────────────────────────
// KOMPONEN UTAMA
// ─────────────────────────────────────────────────────────────────────────────
export default function EmissionTable({ detail, onDeleteAllRecords, selectedReference }: Props) {
  const [currentPage,     setCurrentPage]     = useState(1);
  const [selectedScope,   setSelectedScope]   = useState<string>("all");
  const [selectedYear,    setSelectedYear]    = useState<string>("all");
  const [showTableauInfo, setShowTableauInfo] = useState(false);

  const itemsPerPage = 10;

  const getYearFromPeriode = (periodeStr?: string | number): string => {
    if (periodeStr === null || periodeStr === undefined) return "Tanpa Periode";
    const match = String(periodeStr).match(/\b(19|20)\d{2}\b/);
    return match ? match[0] : "Lainnya";
  };

  // categoryMap masih dipakai untuk render kolom Kategori di tabel
  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    ACTIVITY_OPTIONS.forEach((opt) => { map[opt.value] = opt.category; });
    return map;
  }, []);

  const { scopeOptions, yearOptions } = useMemo(() => {
    const scopes = new Set<string>();
    const years  = new Set<string>();
    detail.forEach((item) => {
      if (item.scope) scopes.add(item.scope);
      years.add(getYearFromPeriode(item.periode));
    });
    return {
      scopeOptions: Array.from(scopes).sort(),
      yearOptions:  Array.from(years).sort((a, b) => b.localeCompare(a)),
    };
  }, [detail]);

  const filteredData = useMemo(() => {
    return detail
      .filter((item) => {
        const matchScope = selectedScope === "all" || item.scope === selectedScope;
        const matchYear  = selectedYear  === "all" || getYearFromPeriode(item.periode) === selectedYear;
        return matchScope && matchYear;
      })
      .sort((a, b) => {
        if (a.scope !== b.scope) return a.scope.localeCompare(b.scope);
        return a.aktivitas.localeCompare(b.aktivitas);
      });
  }, [detail, selectedScope, selectedYear]);

  const summaryGHG = useMemo(() => {
    let scope1 = 0, scope2 = 0, scope3 = 0;
    filteredData.forEach((item) => {
      const sc = item.scope.toLowerCase();
      if      (sc.includes("scope 1")) scope1 += item.emisi_tCO2e;
      else if (sc.includes("scope 2")) scope2 += item.emisi_tCO2e;
      else if (sc.includes("scope 3")) scope3 += item.emisi_tCO2e;
    });
    return { scope1, scope2, scope3, total: scope1 + scope2 + scope3 };
  }, [filteredData]);

  const totalPages    = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const handleScopeChange = (val: string) => { setSelectedScope(val); setCurrentPage(1); };
  const handleYearChange  = (val: string) => { setSelectedYear(val);  setCurrentPage(1); };

  const getRefLabelForPDF = (aktivitas: string, faktorKonversi: number, emisiKg: number): string => {
    const { ref, isAmbiguous, isZeroEmission } = detectReference(aktivitas, faktorKonversi, emisiKg, selectedReference);
    if (isZeroEmission) return "Zero";
    if (!ref) return "—";
    return isAmbiguous ? `${REF_SHORT[ref]}*` : REF_SHORT[ref];
  };

  const triggerExcelDownload = () => {
    downloadLaporanExcel({ filteredData, summaryGHG, selectedYear, selectedScope });
  };

  const downloadLaporanPDF = () => {
    if (filteredData.length === 0) return;
    const doc = new jsPDF("l", "mm", "a4");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(27, 67, 50);
    doc.text("GHG EMISSION REPORT", 14, 15);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Dibuat Pada: ${new Date().toLocaleDateString("id-ID")}`, 14, 21);
    doc.text(`Scope: ${selectedScope.toUpperCase()} | Tahun: ${selectedYear} | Referensi Aktif: ${selectedReference}`, 14, 25);

    autoTable(doc, {
      startY: 30,
      head: [["Scope", "Total (tCO2e)"]],
      body: [
        ["Scope 1 — Direct Emissions", `${summaryGHG.scope1.toFixed(4)} tCO2e`],
        ["Scope 2 — Indirect Emissions", `${summaryGHG.scope2.toFixed(4)} tCO2e`],
        ["Scope 3 — Other Indirect Emissions", `${summaryGHG.scope3.toFixed(4)} tCO2e`],
        ["Total Keseluruhan", `${summaryGHG.total.toFixed(4)} tCO2e`],
      ],
      theme: "striped",
      headStyles: { fillColor: [15, 47, 35] },
      columnStyles: { 1: { fontStyle: "bold", halign: "right" } },
      margin: { left: 14, right: 14 },
    });

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 47, 35);
    doc.text("Rincian Aktivitas:", 14, (doc as any).lastAutoTable.finalY + 10);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 14,
      head: [["No", "Aktivitas", "Scope", "Detail", "Periode", "Jumlah", "Faktor", "Ref.", "kgCO2e", "tCO2e"]],
      body: filteredData.map((row, i) => {
        let f = row.faktor_konversi ?? 0;
        if (f > 0 && f < 0.01) f *= 1000;
        const kg = row.emisi_tCO2e * 1000;
        return [
          i + 1,
          ACTIVITY_LABELS[row.aktivitas] ?? row.aktivitas,
          row.scope,
          row.detail_aktivitas || "-",
          getYearFromPeriode(row.periode),
          `${row.jumlah.toLocaleString()} ${row.satuan}`,
          f.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
          getRefLabelForPDF(row.aktivitas, f, kg),
          kg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          row.emisi_tCO2e.toFixed(4),
        ];
      }),
      theme: "grid",
      headStyles: { fillColor: [27, 67, 50] },
      styles: { fontSize: 7.5 },
      columnStyles: {
        5: { halign: "right" }, 6: { halign: "right" },
        7: { halign: "center", fontStyle: "bold" },
        8: { halign: "right" }, 9: { halign: "right", fontStyle: "bold" },
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFont("Helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text("* = faktor identik di beberapa referensi, ditampilkan sesuai referensi aktif saat ekspor.", 14, finalY + 6);
    doc.save(`Laporan_Emisi_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  if (detail.length === 0) return null;

  const legendRefs: ReferenceKey[] = ["ESDM", "DEFRA"];

  return (
    <div className="space-y-4">

      {/* ── TABEL UTAMA ──────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-md border border-stone-300 bg-[#fbfaf6] p-4">

        {/* Header & action bar */}
        <div className="mb-3 flex flex-col justify-between gap-3 border-b border-stone-200 pb-3 lg:flex-row lg:items-center">
          <div>
            <h3 className={`${display} flex items-center gap-2 text-base font-medium text-emerald-950`}>
              <ClipboardList size={16} className="text-emerald-800" />
              Rincian Perhitungan Emisi
            </h3>
            <p className="mt-0.5 text-xs text-stone-500">
              Menampilkan <span className="font-semibold text-stone-700">{filteredData.length}</span> dari{" "}
              <span className="font-semibold text-stone-700">{detail.length}</span> data komponen
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Tombol Tableau Export */}
            <div className="relative">
              <button
                onClick={() => exportTableauCSV(filteredData, selectedReference)}
                onMouseEnter={() => setShowTableauInfo(true)}
                onMouseLeave={() => setShowTableauInfo(false)}
                className={btnOutline}
              >
                <svg width="13" height="13" viewBox="0 0 32 32" fill="currentColor" className="text-emerald-800">
                  <path d="M14.5 4h3v6.5H24v3h-6.5V20h-3v-6.5H8v-3h6.5z"/>
                  <rect x="2" y="26" width="28" height="2" rx="1"/>
                </svg>
                Export Tableau
              </button>

              {showTableauInfo && (
                <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-md bg-emerald-950 p-3 text-[11px] leading-relaxed text-stone-100 shadow-xl">
                  <p className="mb-1.5 font-semibold">Format Tableau Relationships (.xlsx) — 3 Sheet</p>
                  <div className="space-y-1 text-stone-300">
                    <p><span className="font-medium text-white">① Emissions</span> — data transaksi, 1 baris per record aktivitas</p>
                    <p><span className="font-medium text-white">② Activity</span> — master aktivitas (key: Activity_ID)</p>
                    <p><span className="font-medium text-white">③ Scope</span> — master scope (key: Scope)</p>
                  </div>
                  <p className="mt-2 border-t border-emerald-800 pt-2 text-stone-400">
                    Di Tableau, hubungkan via canvas <strong>Relationships</strong>: Emissions.Activity_ID ↔ Activity.Activity_ID,
                    dan Emissions.Scope ↔ Scope.Scope.
                  </p>
                </div>
              )}
            </div>

            <button onClick={downloadLaporanPDF} className={btnOutline}>
              <FileDown size={13} /> PDF
            </button>
            <button onClick={triggerExcelDownload} className={btnSolid}>
              <FileSpreadsheet size={13} /> Excel
            </button>
            {onDeleteAllRecords && (
              <button onClick={onDeleteAllRecords} className={btnDanger}>
                <Trash2 size={13} /> Hapus Semua
              </button>
            )}
          </div>
        </div>

        {/* Legenda + filter */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Ref.</span>
            {legendRefs.map((ref) => (
              <span
                key={ref}
                className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${REF_BADGE[ref]}`}
                title={REFERENCE_METADATA[ref].label}
              >
                {REF_SHORT[ref]}
              </span>
            ))}
            <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
              <Leaf size={9} />Zero
            </span>
            <span className="text-[10px] text-stone-500">
              · <span className="font-semibold">*</span> identik di beberapa referensi
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 text-xs font-medium text-stone-500">
              <Filter size={12} /> Filter
            </span>
            <select value={selectedScope} onChange={(e) => handleScopeChange(e.target.value)} className={selectCls}>
              <option value="all">Semua Scope</option>
              {scopeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={selectedYear} onChange={(e) => handleYearChange(e.target.value)} className={selectCls}>
              <option value="all">Semua Tahun</option>
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Tabel */}
        <div className={`overflow-x-auto rounded border border-stone-200 bg-white ${thinScroll}`}>
          <table className="w-full min-w-[980px] text-[12px]">
            <thead>
              <tr className="border-b border-stone-200 bg-[#f1eee4] text-[10px] uppercase tracking-wider text-stone-600">
                <th className="w-10 p-2.5 text-center font-semibold">No</th>
                <th className="p-2.5 text-left font-semibold">Aktivitas</th>
                <th className="p-2.5 text-left font-semibold">Detail</th>
                <th className="p-2.5 text-left font-semibold">Periode</th>
                <th className="p-2.5 text-left font-semibold">Kategori</th>
                <th className="p-2.5 text-right font-semibold">Jumlah</th>
                <th className="p-2.5 text-right font-semibold">Faktor</th>
                <th className="p-2.5 text-center font-semibold">Ref.</th>
                <th className="p-2.5 text-right font-semibold">Emisi (kgCO₂e)</th>
                <th className="p-2.5 text-right font-semibold">Emisi (tCO₂e)</th>
                <th className="p-2.5 text-center font-semibold">Sumber</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-stone-400">
                    Tidak ada data yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, idx) => {
                  const nomor    = (currentPage - 1) * itemsPerPage + idx + 1;
                  const emisiKg  = row.emisi_tCO2e * 1000;
                  let displayFaktor = row.faktor_konversi ?? 0;
                  if (displayFaktor > 0 && displayFaktor < 0.01) displayFaktor *= 1000;

                  // Gunakan categoryMap — tidak akses row.kategori
                  const namaKategori = categoryMap[row.aktivitas] ?? "-";

                  return (
                    <tr key={idx} className="transition-colors hover:bg-[#faf9f4]">
                      <td className="p-2.5 text-center text-[11px] font-semibold text-stone-400">{nomor}</td>
                      <td className="p-2.5 font-medium text-stone-900">
                        {ACTIVITY_LABELS[row.aktivitas] ?? row.aktivitas}
                        <span className="mt-0.5 block text-[10px] font-normal text-stone-400">{row.scope}</span>
                      </td>
                      <td className="p-2.5 text-stone-600">{row.detail_aktivitas || "-"}</td>
                      <td className="p-2.5 text-stone-600">{getYearFromPeriode(row.periode)}</td>
                      <td className="p-2.5 capitalize text-stone-500">{namaKategori}</td>
                      <td className="p-2.5 text-right font-mono tabular-nums text-stone-800">
                        {row.jumlah.toLocaleString()}
                        <span className="ml-1 text-stone-400">{row.satuan}</span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-semibold tabular-nums text-stone-800">
                        {displayFaktor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </td>
                      <td className="p-2.5 text-center">
                        <ReferenceBadge
                          aktivitas={row.aktivitas}
                          faktorKonversi={displayFaktor}
                          emisiKgco2e={emisiKg}
                          selectedReference={selectedReference}
                        />
                      </td>
                      <td className="p-2.5 text-right font-mono tabular-nums text-stone-700">
                        {emisiKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5 text-right font-semibold tabular-nums text-emerald-900">
                        {row.emisi_tCO2e.toFixed(4)}
                        <span className="ml-1 text-[10px] font-normal text-stone-400">tCO₂e</span>
                      </td>
                      <td className="p-2.5 text-center">
                        {row.file_name ? (
                          <div
                            className="inline-flex max-w-[140px] items-center gap-1 truncate rounded bg-[#eef3ec] px-1.5 py-0.5 text-[11px] font-medium text-emerald-900"
                            title={row.file_name}
                          >
                            <FileSpreadsheet size={11} className="shrink-0" />
                            <span className="truncate">{row.file_name}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 rounded bg-stone-200/70 px-1.5 py-0.5 text-[11px] font-medium text-stone-600">
                            <User size={11} className="shrink-0" />
                            <span>Manual</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredData.length > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-stone-500">
              Menampilkan{" "}
              <span className="font-semibold text-stone-700">{(currentPage - 1) * itemsPerPage + 1}</span>–
              <span className="font-semibold text-stone-700">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span>{" "}
              dari <span className="font-semibold text-stone-700">{filteredData.length}</span> data
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 rounded border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Sebelumnya
              </button>
              <div className="px-2.5 text-xs font-semibold text-stone-700">{currentPage} / {totalPages}</div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 rounded border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-40"
              >
                Berikutnya <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── TABLEAU EMBED SECTION ─────────────────────────────────────────── */}
      <TableauEmbedSection />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KOMPONEN TABLEAU EMBED
// ─────────────────────────────────────────────────────────────────────────────
function TableauEmbedSection() {
  const [embedUrl,   setEmbedUrl]   = useState("");
  const [inputUrl,   setInputUrl]   = useState("");
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [showGuide,  setShowGuide]  = useState(false);
  const [urlAlert,   setUrlAlert]   = useState(false);

  const handleEmbed = () => {
    if (!inputUrl.trim()) return;
    let url = inputUrl.trim().split("?")[0];

    if (!url.includes("public.tableau.com/views") && !url.includes("public.tableau.com/app/profile")) {
      setUrlAlert(true);
      return;
    }

    const embedParams = "?:embed=y&:showVizHome=no&:toolbar=yes&:tabs=no&:device=desktop";
    setEmbedUrl(url + embedParams);
    setIsEmbedded(true);
  };

  const handleReset = () => {
    setEmbedUrl("");
    setInputUrl("");
    setIsEmbedded(false);
  };

  return (
    <div className="overflow-hidden rounded-md border border-stone-300 bg-[#fbfaf6]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-emerald-950">
            <svg width="15" height="15" viewBox="0 0 32 32" fill="white">
              <path d="M14.5 4h3v6.5H24v3h-6.5V20h-3v-6.5H8v-3h6.5z"/>
              <rect x="2" y="26" width="28" height="2" rx="1"/>
            </svg>
          </div>
          <div>
            <h3 className={`${display} text-base font-medium text-emerald-950`}>Tableau Public Embed</h3>
            <p className="mt-0.5 text-[11px] text-stone-500">Tampilkan viz Tableau Public langsung di sini</p>
          </div>
        </div>

        <button
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-1 text-[11px] font-semibold text-emerald-900 underline-offset-4 hover:underline"
        >
          <ExternalLink size={11} />
          {showGuide ? "Tutup panduan" : "Cara pakai"}
        </button>
      </div>

      {/* Panduan */}
      {showGuide && (
        <div className="mx-4 mt-3 space-y-2 rounded border border-[#cfdccf] bg-[#eef3ec] p-3 text-[12px] text-emerald-950">
          <p className="text-[13px] font-semibold">Cara integrasi dengan Tableau Public:</p>
          <ol className="list-inside list-decimal space-y-1.5 text-emerald-900/90">
            <li>Klik <strong>Export Tableau</strong> di tabel atas untuk mengunduh file <code>.xlsx</code> (Fact_Emissions + Dim_Activity + Dim_Scope).</li>
            <li>Buka <a href="https://public.tableau.com" target="_blank" rel="noopener noreferrer" className="font-semibold underline">Tableau Public</a> → login → <strong>Create → Web Authoring</strong>.</li>
            <li>Unggah file <code>Tableau_GHG_Emission_*.xlsx</code> sebagai data source.</li>
            <li>Di canvas <strong>Relationships</strong>, hubungkan: <code>Fact_Emissions.Activity_ID</code> ↔ <code>Dim_Activity.Activity_ID</code>, dan <code>Fact_Emissions.Scope</code> ↔ <code>Dim_Scope.Scope</code>.</li>
            <li>Buat viz/dashboard, lalu klik <strong>Publish</strong>.</li>
            <li>Buka viz yang sudah dipublikasikan → <strong>Share</strong> → salin <strong>Link</strong>.</li>
            <li>Tempel URL di kotak input di bawah → klik <strong>Tampilkan</strong>.</li>
          </ol>
          <p className="mt-1 text-[11px] text-emerald-900/70">
            Format URL valid: <code>https://public.tableau.com/views/NamaWorkbook/NamaSheet</code>
          </p>
        </div>
      )}

      {/* Input URL */}
      <div className="px-4 py-3">
        {!isEmbedded ? (
          <div className="flex gap-2">
            <input
              type="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEmbed()}
              placeholder="https://public.tableau.com/views/NamaWorkbook/NamaSheet"
              className="flex-1 rounded border border-stone-300 bg-white px-3 py-2 text-[13px] text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            />
            <button
              onClick={handleEmbed}
              disabled={!inputUrl.trim()}
              className="shrink-0 rounded bg-emerald-900 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-40"
            >
              Tampilkan
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded border border-[#cfdccf] bg-[#eef3ec] px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-600" />
              <p className="truncate text-xs font-medium text-emerald-950">{embedUrl.split("?")[0]}</p>
            </div>
            <button onClick={handleReset} className="shrink-0 text-xs font-semibold text-red-700 transition hover:text-red-800">
              Ganti URL
            </button>
          </div>
        )}
      </div>

      {/* Iframe embed */}
      {isEmbedded && embedUrl ? (
        <div className="px-4 pb-4">
          <div className="relative w-full overflow-hidden rounded border border-stone-300 bg-white" style={{ paddingTop: "56.25%" }}>
            <iframe
              src={embedUrl}
              className="absolute inset-0 h-full w-full"
              frameBorder="0"
              allowFullScreen
              title="Tableau Viz"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
          <p className="mt-2 text-center text-[10px] text-stone-500">
            Viz ditampilkan dari Tableau Public. Pastikan viz bersifat publik agar dapat di-embed.
          </p>
        </div>
      ) : !isEmbedded ? (
        <div className="mx-4 mb-4 flex flex-col items-center justify-center gap-2.5 rounded border border-dashed border-stone-300 bg-white/60 py-10 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded bg-[#eef3ec]">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="#1b4332">
              <path d="M14.5 4h3v6.5H24v3h-6.5V20h-3v-6.5H8v-3h6.5z"/>
              <rect x="2" y="26" width="28" height="2" rx="1"/>
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-stone-700">Belum ada viz yang ditampilkan</p>
            <p className="mx-auto mt-1 max-w-xs text-xs text-stone-500">
              Tempelkan URL Tableau Public di atas untuk menampilkan viz langsung di halaman ini.
            </p>
          </div>
        </div>
      ) : null}

      <AlertModal
        isOpen={urlAlert}
        type="error"
        title="URL Tidak Valid"
        message={"Masukkan URL Tableau Public yang valid.\nContoh: https://public.tableau.com/views/NamaWorkbook/NamaSheet"}
        onClose={() => setUrlAlert(false)}
      />
    </div>
  );
}