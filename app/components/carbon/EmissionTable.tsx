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
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import { ACTIVITY_LABELS } from "@/app/constants/activities";

interface DetailOutput {
  aktivitas: string;
  detail_aktivitas?: string;
  scope: string;
  periode?: string;
  jumlah: number;
  satuan: string;
  emisi_tCO2e: number;
  faktor_konversi?: number;
  kategori?: string;
  file_name?: string; // Menyimpan nama file sumber hasil relasi dari DB
}

interface Props {
  detail: DetailOutput[];
  onDeleteAllRecords?: () => void; // Aksi hapus semua record milik user
}

export default function EmissionTable({ detail, onDeleteAllRecords }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedScope, setSelectedScope] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");

  const itemsPerPage = 10;

  // Helper fungsi untuk mengekstrak tahun (4 digit angka) dari string periode
  const getYearFromPeriode = (periodeStr?: string): string => {
    if (!periodeStr) return "Tanpa Periode";
    const match = periodeStr.match(/\b(19|20)\d{2}\b/); // Mencari angka tahun seperti 19xx atau 20xx
    return match ? match[0] : "Lainnya";
  };

  // 1. Dapatkan opsi Scope & Tahun unik secara dinamis dari data untuk menu Dropdown
  const { scopeOptions, yearOptions } = useMemo(() => {
    const scopes = new Set<string>();
    const years = new Set<string>();

    detail.forEach((item) => {
      if (item.scope) scopes.add(item.scope);
      years.add(getYearFromPeriode(item.periode));
    });

    return {
      scopeOptions: Array.from(scopes).sort(),
      yearOptions: Array.from(years).sort((a, b) => b.localeCompare(a)), // Urutkan tahun terbaru di atas
    };
  }, [detail]);

  // 2. Filter data berdasarkan Scope dan Tahun yang dipilih
  const filteredData = useMemo(() => {
    // Reset halaman ke 1 setiap kali filter berubah
    setCurrentPage(1);

    return detail.filter((item) => {
      const matchScope =
        selectedScope === "all" || item.scope === selectedScope;
      
      const itemYear = getYearFromPeriode(item.periode);
      const matchYear =
        selectedYear === "all" || itemYear === selectedYear;

      return matchScope && matchYear;
    });
  }, [detail, selectedScope, selectedYear]);

  // 3. Paginasikan data yang telah difilter
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  // 4. Fitur Export Excel Laporan Emisi
  const downloadLaporanExcel = () => {
    if (filteredData.length === 0) return;

    const exportData = filteredData.map((row, idx) => ({
      "No": idx + 1,
      "Jenis Aktivitas": ACTIVITY_LABELS[row.aktivitas] ?? row.aktivitas,
      "Scope": row.scope,
      "Detail Aktivitas": row.detail_aktivitas || "-",
      "Periode": row.periode || "-",
      "Kategori": row.kategori || "-",
      "Jumlah": row.jumlah,
      "Satuan": row.satuan,
      "Faktor Konversi": row.faktor_konversi || 0,
      "Emisi (kgCO2e)": row.emisi_tCO2e * 1000,
      "Emisi (tCO2e)": row.emisi_tCO2e,
      "Sumber Data": row.file_name || "Input Manual",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Emisi");

    // Atur lebar kolom otomatis agar rapi
    worksheet["!cols"] = [
      { wch: 6 }, { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 15 },
      { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 25 }
    ];

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const dataBlob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
    
    saveAs(dataBlob, `Laporan_Emisi_Carbon_${new Date().toISOString().split('T')[0]}.xlsx`);
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

        {/* UTILITY BUTTONS (Download & Hapus Semua) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={downloadLaporanExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            title="Download seluruh data yang terfilter ke Excel"
          >
            <FileDown size={14} />
            Download Laporan
          </button>
          
          {onDeleteAllRecords && (
            <button
              onClick={onDeleteAllRecords}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-semibold border border-red-200 transition"
              title="Hapus seluruh data riwayat emisi Anda"
            >
              <Trash2 size={14} />
              Hapus Semua Data
            </button>
          )}
        </div>
      </div>

      {/* FILTER ACTION BAR */}
      <div className="flex flex-wrap items-center justify-end gap-3 mb-4 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <Filter size={14} />
          <span>Filter:</span>
        </div>

        {/* Filter Scope */}
        <select
          value={selectedScope}
          onChange={(e) => setSelectedScope(e.target.value)}
          className="text-xs bg-white border border-gray-200 text-gray-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-500 cursor-pointer transition"
        >
          <option value="all">Semua Scope</option>
          {scopeOptions.map((scope) => (
            <option key={scope} value={scope}>
              {scope.split(" ")[0] + " " + scope.split(" ")[1] || scope}
            </option>
          ))}
        </select>

        {/* Filter Tahun */}
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="text-xs bg-white border border-gray-200 text-gray-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-500 cursor-pointer transition"
        >
          <option value="all">Semua Tahun</option>
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* TABLE */}
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
                <td colSpan={10} className="p-8 text-center text-gray-400">
                  Tidak ada data emisi yang cocok dengan kriteria filter.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => {
                const nomor = (currentPage - 1) * itemsPerPage + idx + 1;
                const emisiKg = row.emisi_tCO2e * 1000; // Kalkulasi tCO2e ke kgCO2e

                return (
                  <tr key={idx} className="hover:bg-gray-50 transition">
                    <td className="p-3 text-center font-semibold text-gray-500">
                      {nomor}
                    </td>

                    <td className="p-3 font-medium text-gray-900">
                      {ACTIVITY_LABELS[row.aktivitas] ?? row.aktivitas}
                      <span className="block text-[10px] text-gray-400 mt-1">
                        {row.scope}
                      </span>
                    </td>

                    <td className="p-3 text-gray-600">{row.detail_aktivitas || "-"}</td>
                    <td className="p-3 text-gray-600">{row.periode || "-"}</td>
                    <td className="p-3 text-gray-500">{row.kategori || "-"}</td>

                    <td className="p-3 text-right font-mono">
                      {row.jumlah.toLocaleString()}
                      <span className="text-xs text-gray-400 ml-1">{row.satuan}</span>
                    </td>

                    <td className="p-3 text-right text-gray-500">
                      {row.faktor_konversi?.toFixed(3) || "-"}
                    </td>

                    {/* Kolom Baru: Emisi kgCO2e */}
                    <td className="p-3 text-right font-mono text-gray-700">
                      {emisiKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    <td className="p-3 text-right font-bold text-emerald-700">
                      {row.emisi_tCO2e.toFixed(4)}
                      <span className="text-[10px] text-gray-400 ml-1">tCO₂e</span>
                    </td>

                    {/* Kolom Baru: File Sumber Data */}
                    <td className="p-3 text-center">
                      {row.file_name ? (
                        <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg text-[11px] font-medium max-w-[150px] truncate" title={row.file_name}>
                          <FileSpreadsheet size={12} className="shrink-0" />
                          <span className="truncate">{row.file_name}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-[11px] font-medium">
                          <User size={12} className="shrink-0" />
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

      {/* PAGINATION */}
      {filteredData.length > 0 && (
        <div className="mt-5 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Menampilkan{" "}
            <span className="font-semibold">
              {(currentPage - 1) * itemsPerPage + 1}
            </span>{" "}
            -{" "}
            <span className="font-semibold">
              {Math.min(currentPage * itemsPerPage, filteredData.length)}
            </span>{" "}
            dari <span className="font-semibold">{filteredData.length}</span> data
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
              Prev
            </button>

            <div className="px-4 py-2 text-sm font-semibold text-gray-700">
              {currentPage} / {totalPages}
            </div>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}