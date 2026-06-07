"use client";

import { useMemo, useState } from "react";
import {
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Filter,
  Trash2,
  FileDown,
  FileSpreadsheet,
  User,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { ACTIVITY_LABELS, ACTIVITY_OPTIONS } from "@/app/constants/activities";
import { DetailOutput } from "@/app/types/carbon";
import { downloadLaporanExcel } from "@/app/utils/excelUtils";

interface Props {
  detail: DetailOutput[];
  onDeleteAllRecords?: () => void;
}

export default function EmissionTable({ detail, onDeleteAllRecords }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedScope, setSelectedScope] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");

  const itemsPerPage = 10;

  const getYearFromPeriode = (periodeStr?: string): string => {
    if (!periodeStr) return "Tanpa Periode";
    const match = periodeStr.match(/\b(19|20)\d{2}\b/);
    return match ? match[0] : "Lainnya";
  };

  // Membuat map untuk mempermudah pencarian nama kategori berdasarkan value aktivitas
  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    ACTIVITY_OPTIONS.forEach((opt) => {
      map[opt.value] = opt.category;
    });
    return map;
  }, []);

  const { scopeOptions, yearOptions } = useMemo(() => {
    const scopes = new Set<string>();
    const years = new Set<string>();

    detail.forEach((item) => {
      if (item.scope) scopes.add(item.scope);
      years.add(getYearFromPeriode(item.periode));
    });

    return {
      scopeOptions: Array.from(scopes).sort(),
      yearOptions: Array.from(years).sort((a, b) => b.localeCompare(a)),
    };
  }, [detail]);

  const filteredData = useMemo(() => {
    return detail.filter((item) => {
      const matchScope = selectedScope === "all" || item.scope === selectedScope;
      const itemYear = getYearFromPeriode(item.periode);
      const matchYear = selectedYear === "all" || itemYear === selectedYear;
      return matchScope && matchYear;
    });
  }, [detail, selectedScope, selectedYear]);

  const summaryGHG = useMemo(() => {
    let scope1 = 0, scope2 = 0, scope3 = 0;
    filteredData.forEach((item) => {
      const sc = item.scope.toLowerCase();
      if (sc.includes("scope 1")) scope1 += item.emisi_tCO2e;
      else if (sc.includes("scope 2")) scope2 += item.emisi_tCO2e;
      else if (sc.includes("scope 3")) scope3 += item.emisi_tCO2e;
    });
    return { scope1, scope2, scope3, total: scope1 + scope2 + scope3 };
  }, [filteredData]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

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
    doc.text(`Scope: ${selectedScope.toUpperCase()} | Tahun: ${selectedYear}`, 14, 25);

    autoTable(doc, {
      startY: 30,
      head: [["Scope", "Total (tCO2e)"]],
      body: [
        ["Scope 1 - Direct Emissions (Bahan Bakar & Kendaraan)", `${summaryGHG.scope1.toFixed(4)} tCO2e`],
        ["Scope 2 - Indirect Emissions (Konsumsi Listrik PLN)", `${summaryGHG.scope2.toFixed(4)} tCO2e`],
        ["Scope 3 - Other Indirect Emissions (Perjalanan Dinas / Vendor)", `${summaryGHG.scope3.toFixed(4)} tCO2e`],
        ["Total Keseluruhan Jejak Karbon", `${summaryGHG.total.toFixed(4)} tCO2e`],
      ],
      theme: "striped",
      headStyles: { fillColor: [31, 41, 55] },
      columnStyles: { 1: { fontStyle: "bold", halign: "right" } },
      margin: { left: 14, right: 14 },
    });

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(31, 41, 55);
    doc.text("Rincian Aktivitas Sumber Emisi:", 14, (doc as any).lastAutoTable.finalY + 10);

    const tableBody = filteredData.map((row, index) => [
      index + 1,
      ACTIVITY_LABELS[row.aktivitas] ?? row.aktivitas,
      row.scope,
      row.detail_aktivitas || "-",
      row.periode || "-",
      `${row.jumlah.toLocaleString()} ${row.satuan}`,
      (row.emisi_tCO2e * 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      row.emisi_tCO2e.toFixed(4),
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 14,
      head: [["No", "Aktivitas", "Scope", "Detail Keterangan", "Periode", "Jumlah Satuan", "Emisi (kgCO2e)", "Emisi (tCO2e)"]],
      body: tableBody,
      theme: "grid",
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 8 },
      columnStyles: { 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right", fontStyle: "bold" } },
    });

    doc.save(`Laporan_Emisi_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (detail.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* HEADER & ACTION BAR */}
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
          <button
            onClick={downloadLaporanPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <FileDown size={14} /> Download PDF Laporan
          </button>

          <button
            onClick={triggerExcelDownload}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <FileSpreadsheet size={14} /> Export Excel
          </button>
          
          {onDeleteAllRecords && (
            <button
              onClick={onDeleteAllRecords}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-semibold border border-red-200 transition"
            >
              <Trash2 size={14} /> Hapus Semua Data
            </button>
          )}
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-wrap items-center justify-end gap-3 mb-4 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <Filter size={14} /> <span>Filter Komponen:</span>
        </div>
        <select value={selectedScope} onChange={(e) => setSelectedScope(e.target.value)} className="text-xs bg-white border border-gray-200 text-gray-700 rounded-xl px-3 py-2 outline-none">
          <option value="all">Semua Scope</option>
          {scopeOptions.map((scope) => <option key={scope} value={scope}>{scope}</option>)}
        </select>
        <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="text-xs bg-white border border-gray-200 text-gray-700 rounded-xl px-3 py-2 outline-none">
          <option value="all">Semua Tahun</option>
          {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
      </div>

      {/* TABLE DATA */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-xs">
              <th className="p-3 text-center w-14">No</th>
              <th className="p-3 text-left">Aktivitas</th>
              <th className="p-3 text-left">Detail</th>
              <th className="p-3 text-left">Periode</th>
              <th className="p-3 text-left">Kategori</th>
              <th className="p-3 text-right">Jumlah</th>
              <th className="p-3 text-right">Faktor</th>
              <th className="p-3 text-right">Emisi (kgCO₂e)</th>
              <th className="p-3 text-right">Emisi (tCO₂e)</th>
              <th className="p-3 text-center">File Sumber</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-gray-400">Tidak ada data emisi yang cocok.</td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => {
                const nomor = (currentPage - 1) * itemsPerPage + idx + 1;
                const emisiKg = row.emisi_tCO2e * 1000;
                let displayFaktor = row.faktor_konversi ?? 0;
                if (displayFaktor > 0 && displayFaktor < 0.01) displayFaktor *= 1000;

                // Mengambil nama kategori yang rapi dari objek konstan
                const namaKategori = categoryMap[row.aktivitas] ?? row.aktivitas ?? "-";

                return (
                  <tr key={idx} className="hover:bg-gray-50 transition">
                    <td className="p-3 text-center font-semibold text-gray-500">{nomor}</td>
                    <td className="p-3 font-medium text-gray-900">
                      {ACTIVITY_LABELS[row.aktivitas] ?? row.aktivitas}
                      <span className="block text-[10px] text-gray-400 mt-1">{row.scope}</span>
                    </td>
                    <td className="p-3 text-gray-600">{row.detail_aktivitas || "-"}</td>
                    <td className="p-3 text-gray-600">{row.periode || "-"}</td>
                    <td className="p-3 text-gray-500 capitalize">{namaKategori}</td>
                    <td className="p-3 text-right font-mono">
                      {row.jumlah.toLocaleString()} <span className="text-xs text-gray-400 ml-1">{row.satuan}</span>
                    </td>
                    <td className="p-3 text-right text-gray-900 font-mono font-semibold">
                      {displayFaktor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                    </td>
                    <td className="p-3 text-right font-mono text-gray-700">
                      {emisiKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-700">
                      {row.emisi_tCO2e.toFixed(4)} <span className="text-[10px] text-gray-400 ml-1">tCO₂e</span>
                    </td>
                    <td className="p-3 text-center">
                      {row.file_name ? (
                        <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg text-[11px] font-medium max-w-[150px] truncate" title={row.file_name}>
                          <FileSpreadsheet size={12} className="shrink-0" /> <span className="truncate">{row.file_name}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-[11px] font-medium">
                          <User size={12} className="shrink-0" /> <span>Manual</span>
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

      {/* PAGINATION PANEL */}
      {filteredData.length > 0 && (
        <div className="mt-5 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Menampilkan <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> -{" "}
            <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> dari{" "}
            <span className="font-semibold">{filteredData.length}</span> data
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              <ChevronLeft size={16} /> Prev
            </button>
            <div className="px-4 py-2 text-sm font-semibold text-gray-700">{currentPage} / {totalPages}</div>
            <button onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}