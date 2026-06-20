// components/carbon/EmissionTable.tsx
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

// ─────────────────────────────────────────────────────────────────────────────
const FACTOR_REF_ORDER: ReferenceKey[] = ["ESDM", "IPCC", "DEFRA"];
const EPSILON = 0.0005;

const REF_BADGE: Record<ReferenceKey, string> = {
  ESDM:  "bg-red-100 text-red-700 border-red-200",
  IPCC:  "bg-blue-100 text-blue-700 border-blue-200",
  DEFRA: "bg-purple-100 text-purple-700 border-purple-200",
};
const REF_SHORT: Record<ReferenceKey, string> = { ESDM: "ESDM", IPCC: "IPCC", DEFRA: "DEFRA" };

// Helper — resolve kategori dari ACTIVITY_OPTIONS berdasarkan value aktivitas
// Ini sumber kebenaran tunggal; tidak bergantung pada field `kategori` di DB.
function resolveKategori(aktivitas: string): string {
  return ACTIVITY_OPTIONS.find((o) => o.value === aktivitas)?.category ?? aktivitas;
}

// Helper — tentukan Energy_Type per Activity_ID (dipakai di Dim_Activity)
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
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-teal-50 text-teal-600 border border-teal-100"
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
        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${REF_BADGE[ref]}`}
        title={tooltipText}
      >
        {REF_SHORT[ref]}
        {isAmbiguous && <span className="opacity-40 text-[9px] font-normal leading-none">*</span>}
      </span>
    );
  }
  return <span className="text-[10px] text-gray-300 font-medium" title="Faktor tidak cocok">—</span>;
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

  // ── SHEET 3: Dim_Scope — 1 baris per Scope unik ────────────────────────────
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

  // ✅ categoryMap masih dipakai untuk render kolom Kategori di tabel
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
    doc.setTextColor(16, 185, 129);
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
      headStyles: { fillColor: [31, 41, 55] },
      columnStyles: { 1: { fontStyle: "bold", halign: "right" } },
      margin: { left: 14, right: 14 },
    });

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(31, 41, 55);
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
      headStyles: { fillColor: [16, 185, 129] },
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

  const legendRefs: ReferenceKey[] = ["ESDM", "IPCC", "DEFRA"];

  return (
    <div className="space-y-6">

      {/* ── TABEL UTAMA ──────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Header & action bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-b-gray-100">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <ClipboardList size={18} className="text-emerald-600" />
              Rincian Perhitungan Emisi
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Total: <span className="font-semibold text-gray-700">{filteredData.length}</span> dari{" "}
              <span className="font-semibold">{detail.length}</span> data komponen
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tombol Tableau Export */}
            <div className="relative">
              <button
                onClick={() => exportTableauCSV(filteredData, selectedReference)}
                onMouseEnter={() => setShowTableauInfo(true)}
                onMouseLeave={() => setShowTableauInfo(false)}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#1f77b4] hover:bg-[#1a66a0] text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor">
                  <path d="M14.5 4h3v6.5H24v3h-6.5V20h-3v-6.5H8v-3h6.5z"/>
                  <rect x="2" y="26" width="28" height="2" rx="1"/>
                </svg>
                Export Tableau
              </button>

              {showTableauInfo && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-gray-900 text-white text-[11px] rounded-xl p-3 z-50 shadow-xl leading-relaxed">
                  <p className="font-semibold mb-1.5">Format Tableau Relationships (.xlsx) — 3 Sheet</p>
                  <div className="space-y-1 text-gray-300">
                    <p><span className="text-white font-medium">① Fact_Emissions</span> — data transaksi, 1 baris per record aktivitas</p>
                    <p><span className="text-white font-medium">② Dim_Activity</span> — master aktivitas (key: Activity_ID)</p>
                    <p><span className="text-white font-medium">③ Dim_Scope</span> — master scope (key: Scope)</p>
                  </div>
                  <p className="text-gray-400 mt-2 pt-2 border-t border-gray-700">
                    Di Tableau, hubungkan via canvas <strong>Relationships</strong>: Fact_Emissions.Activity_ID ↔ Dim_Activity.Activity_ID,
                    dan Fact_Emissions.Scope ↔ Dim_Scope.Scope.
                  </p>
                </div>
              )}
            </div>

            <button onClick={downloadLaporanPDF} className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm transition">
              <FileDown size={14} /> PDF
            </button>
            <button onClick={triggerExcelDownload} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition">
              <FileSpreadsheet size={14} /> Excel
            </button>
            {onDeleteAllRecords && (
              <button onClick={onDeleteAllRecords} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-semibold border border-red-200 transition">
                <Trash2 size={14} /> Hapus Semua
              </button>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-end gap-3 mb-4 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <Filter size={14} /><span>Filter:</span>
          </div>
          <select value={selectedScope} onChange={(e) => handleScopeChange(e.target.value)}
            className="text-xs bg-white border border-gray-200 text-gray-700 rounded-xl px-3 py-2 outline-none">
            <option value="all">Semua Scope</option>
            {scopeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={selectedYear} onChange={(e) => handleYearChange(e.target.value)}
            className="text-xs bg-white border border-gray-200 text-gray-700 rounded-xl px-3 py-2 outline-none">
            <option value="all">Semua Tahun</option>
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-4 px-1">
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Legenda Ref.:</span>
          {legendRefs.map((ref) => (
            <span key={ref} className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border ${REF_BADGE[ref]}`} title={REFERENCE_METADATA[ref].label}>
              {REF_SHORT[ref]}
            </span>
          ))}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-teal-50 text-teal-600 border border-teal-100">
            <Leaf size={9} />Zero
          </span>
          <span className="text-[10px] text-gray-400">
            · <span className="font-semibold">*</span> = identik di beberapa referensi
          </span>
        </div>

        {/* Tabel */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1060px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-xs">
                <th className="p-3 text-center w-10">No</th>
                <th className="p-3 text-left">Aktivitas</th>
                <th className="p-3 text-left">Detail</th>
                <th className="p-3 text-left">Periode</th>
                <th className="p-3 text-left">Kategori</th>
                <th className="p-3 text-right">Jumlah</th>
                <th className="p-3 text-right">Faktor</th>
                <th className="p-3 text-center">Ref.</th>
                <th className="p-3 text-right">Emisi (kgCO₂e)</th>
                <th className="p-3 text-right">Emisi (tCO₂e)</th>
                <th className="p-3 text-center">File Sumber</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-gray-400">
                    Tidak ada data yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, idx) => {
                  const nomor    = (currentPage - 1) * itemsPerPage + idx + 1;
                  const emisiKg  = row.emisi_tCO2e * 1000;
                  let displayFaktor = row.faktor_konversi ?? 0;
                  if (displayFaktor > 0 && displayFaktor < 0.01) displayFaktor *= 1000;

                  // ✅ Gunakan categoryMap — tidak akses row.kategori
                  const namaKategori = categoryMap[row.aktivitas] ?? "-";

                  return (
                    <tr key={idx} className="hover:bg-gray-50/70 transition">
                      <td className="p-3 text-center font-semibold text-gray-400 text-xs">{nomor}</td>
                      <td className="p-3 font-medium text-gray-900">
                        {ACTIVITY_LABELS[row.aktivitas] ?? row.aktivitas}
                        <span className="block text-[10px] text-gray-400 mt-0.5">{row.scope}</span>
                      </td>
                      <td className="p-3 text-gray-600 text-xs">{row.detail_aktivitas || "-"}</td>
                      <td className="p-3 text-gray-600 text-xs">{getYearFromPeriode(row.periode)}</td>
                      <td className="p-3 text-gray-500 capitalize text-xs">{namaKategori}</td>
                      <td className="p-3 text-right font-mono text-xs">
                        {row.jumlah.toLocaleString()}
                        <span className="text-gray-400 ml-1">{row.satuan}</span>
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-gray-800 text-xs">
                        {displayFaktor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </td>
                      <td className="p-3 text-center">
                        <ReferenceBadge
                          aktivitas={row.aktivitas}
                          faktorKonversi={displayFaktor}
                          emisiKgco2e={emisiKg}
                          selectedReference={selectedReference}
                        />
                      </td>
                      <td className="p-3 text-right font-mono text-gray-700 text-xs">
                        {emisiKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-700 text-xs">
                        {row.emisi_tCO2e.toFixed(4)}
                        <span className="text-[10px] text-gray-400 ml-1 font-normal">tCO₂e</span>
                      </td>
                      <td className="p-3 text-center">
                        {row.file_name ? (
                          <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg text-[11px] font-medium max-w-[140px] truncate" title={row.file_name}>
                            <FileSpreadsheet size={11} className="shrink-0" />
                            <span className="truncate">{row.file_name}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 px-2 py-1 rounded-lg text-[11px] font-medium">
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
          <div className="mt-5 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Menampilkan{" "}
              <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span>–
              <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span>{" "}
              dari <span className="font-semibold">{filteredData.length}</span> data
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <div className="px-4 py-2 text-sm font-semibold text-gray-700">{currentPage} / {totalPages}</div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
              >
                Next <ChevronRight size={16} />
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

  const handleEmbed = () => {
    if (!inputUrl.trim()) return;
    let url = inputUrl.trim().split("?")[0];

    if (!url.includes("public.tableau.com/views") && !url.includes("public.tableau.com/app/profile")) {
      alert("Masukkan URL Tableau Public yang valid.\nContoh: https://public.tableau.com/views/NamaWorkbook/NamaSheet");
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1f77b4] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 32 32" fill="white">
              <path d="M14.5 4h3v6.5H24v3h-6.5V20h-3v-6.5H8v-3h6.5z"/>
              <rect x="2" y="26" width="28" height="2" rx="1"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Tableau Public Embed</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Tampilkan viz Tableau Public langsung di sini</p>
          </div>
        </div>

        <button
          onClick={() => setShowGuide(!showGuide)}
          className="text-[11px] font-semibold text-[#1f77b4] hover:underline flex items-center gap-1"
        >
          <ExternalLink size={11} />
          {showGuide ? "Tutup panduan" : "Cara pakai"}
        </button>
      </div>

      {/* Panduan */}
      {showGuide && (
        <div className="mx-6 mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4 text-[12px] text-blue-800 space-y-2">
          <p className="font-bold text-[13px]">Cara integrasi dengan Tableau Public:</p>
          <ol className="list-decimal list-inside space-y-1.5 text-blue-700">
            <li>Klik <strong>Export Tableau</strong> di tabel atas untuk download file <code>.xlsx</code> (Fact_Emissions + Dim_Activity + Dim_Scope).</li>
            <li>Buka <a href="https://public.tableau.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Tableau Public</a> → login → <strong>Create → Web Authoring</strong>.</li>
            <li>Upload file <code>Tableau_GHG_Emission_*.xlsx</code> sebagai data source.</li>
            <li>Di canvas <strong>Relationships</strong>, hubungkan: <code>Fact_Emissions.Activity_ID</code> ↔ <code>Dim_Activity.Activity_ID</code>, dan <code>Fact_Emissions.Scope</code> ↔ <code>Dim_Scope.Scope</code>.</li>
            <li>Buat viz/dashboard, lalu klik <strong>Publish</strong>.</li>
            <li>Buka viz yang sudah dipublish → <strong>Share</strong> → salin <strong>Link</strong>.</li>
            <li>Tempel URL di kotak input di bawah → klik <strong>Tampilkan</strong>.</li>
          </ol>
          <p className="text-blue-500 text-[11px] mt-1">
            Format URL valid: <code>https://public.tableau.com/views/NamaWorkbook/NamaSheet</code>
          </p>
        </div>
      )}

      {/* Input URL */}
      <div className="px-6 py-4">
        {!isEmbedded ? (
          <div className="flex gap-2">
            <input
              type="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEmbed()}
              placeholder="https://public.tableau.com/views/NamaWorkbook/NamaSheet"
              className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1f77b4] placeholder:text-gray-400"
            />
            <button
              onClick={handleEmbed}
              disabled={!inputUrl.trim()}
              className="px-4 py-2.5 bg-[#1f77b4] hover:bg-[#1a66a0] disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition shrink-0"
            >
              Tampilkan
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2 h-2 rounded-full bg-green-500 shrink-0 animate-pulse" />
              <p className="text-xs font-medium text-blue-800 truncate">{embedUrl.split("?")[0]}</p>
            </div>
            <button onClick={handleReset} className="text-xs font-semibold text-red-500 hover:text-red-700 transition shrink-0">
              Ganti URL
            </button>
          </div>
        )}
      </div>

      {/* Iframe embed */}
      {isEmbedded && embedUrl ? (
        <div className="px-6 pb-6">
          <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-50" style={{ paddingTop: "56.25%" }}>
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              frameBorder="0"
              allowFullScreen
              title="Tableau Viz"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center">
            Viz ditampilkan dari Tableau Public. Pastikan viz bersifat publik agar dapat di-embed.
          </p>
        </div>
      ) : !isEmbedded ? (
        <div className="mx-6 mb-6 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center py-14 gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#1f77b4]/10 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="#1f77b4">
              <path d="M14.5 4h3v6.5H24v3h-6.5V20h-3v-6.5H8v-3h6.5z"/>
              <rect x="2" y="26" width="28" height="2" rx="1"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-600">Belum ada viz yang ditampilkan</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
              Tempelkan URL Tableau Public di atas untuk embed viz langsung ke halaman ini.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}