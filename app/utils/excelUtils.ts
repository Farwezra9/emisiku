import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { DetailOutput, SummaryGHG } from "@/app/types/carbon";
import { ACTIVITY_LABELS } from "@/app/constants/activities";

interface ExportExcelParams {
  filteredData: DetailOutput[];
  summaryGHG: SummaryGHG;
  selectedYear: string;
  selectedScope: string;
}

export const downloadLaporanExcel = async ({
  filteredData,
  summaryGHG,
  selectedYear,
  selectedScope,
}: ExportExcelParams) => {
  if (filteredData.length === 0) return;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Laporan GHG");

  // Komponen border tipis abu-abu standar UI
  const thinBorder = {
    top: { style: "thin" as const, color: { argb: "E5E7EB" } },
    left: { style: "thin" as const, color: { argb: "E5E7EB" } },
    bottom: { style: "thin" as const, color: { argb: "E5E7EB" } },
    right: { style: "thin" as const, color: { argb: "E5E7EB" } },
  };

  // ==========================================
  // A. HEADER METADATA 
  // ==========================================
  worksheet.addRow(["GHG EMISSION REPORT"]);
  worksheet.addRow([`Dibuat Pada: ${new Date().toLocaleDateString("id-ID")}`]);
  worksheet.addRow([`Scope: ${selectedScope.toUpperCase()} | Tahun: ${selectedYear}`]);

  // Styling Metadata Atas
  worksheet.getRow(1).font = { name: "Arial", size: 16, bold: true, color: { argb: "00B589" } };
  worksheet.getRow(2).font = { name: "Arial", size: 10, color: { argb: "4B5563" } };
  worksheet.getRow(3).font = { name: "Arial", size: 10, color: { argb: "4B5563" } };

  worksheet.addRow([]); // Baris Kosong (Baris 4)

  // ==========================================
  // B. TABEL SUMMARY SCOPE (FIXED MERGE A SAMPAI B)
  // ==========================================
  // Baris 5: Header Summary (Merge A5:B5 untuk tulisan Scope, C5 untuk Total)
  worksheet.mergeCells("A5:B5");
  worksheet.getCell("A5").value = "Scope";
  worksheet.getCell("C5").value = "Total (tCO2e)";

  const summaryHeaderRow = worksheet.getRow(5);
  summaryHeaderRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    if (colNumber <= 3) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1E293B" } }; // Dark Slate Blue
      cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFF" } };
      cell.border = thinBorder;
      if (colNumber === 3) cell.alignment = { horizontal: "right" };
    }
  });

  const summaryData = [
    { range: "A6:B6", text: "Scope 1 - Direct Emissions (Bahan Bakar & Kendaraan)", val: Number(summaryGHG.scope1.toFixed(4)), target: "C6" },
    { range: "A7:B7", text: "Scope 2 - Indirect Emissions (Konsumsi Listrik PLN)", val: Number(summaryGHG.scope2.toFixed(4)), target: "C7" },
    { range: "A8:B8", text: "Scope 3 - Other Indirect Emissions (Perjalanan Dinas / Vendor)", val: Number(summaryGHG.scope3.toFixed(4)), target: "C8" },
    { range: "A9:B9", text: "Total Keseluruhan Jejak Karbon", val: Number(summaryGHG.total.toFixed(4)), target: "C9" },
  ];

  summaryData.forEach((item, idx) => {
    worksheet.mergeCells(item.range);
    const textCell = worksheet.getCell(item.range.split(":")[0]);
    const valCell = worksheet.getCell(item.target);

    textCell.value = item.text;
    valCell.value = item.val;

    const rowNum = 6 + idx;
    const currentRow = worksheet.getRow(rowNum);

    currentRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber <= 3) {
        cell.border = thinBorder;
        
        if (rowNum === 9) {
          // Baris Total Keseluruhan (Tanpa background abu, bold sesuai gambar)
          cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "111827" } };
        } else {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F9FAFB" } };
          cell.font = { name: "Arial", size: 10, color: { argb: "374151" } };
        }

        // Format angka di Kolom C
        if (colNumber === 3) {
          cell.numFmt = "#,##0.0000" + ' "tCO2e"';
          cell.alignment = { horizontal: "right" };
          cell.font = { name: "Arial", size: 10, bold: true };
        }
      }
    });
  });

  worksheet.addRow([]); // Baris Kosong (Baris 10)
  worksheet.addRow([]); // Baris Kosong (Baris 11)

  // ==========================================
  // C. TABEL RINCIAN AKTIVITAS (Bagian Bawah)
  // ==========================================
  worksheet.addRow(["Rincian Aktivitas Sumber Emisi:"]);
  worksheet.getRow(12).font = { name: "Arial", size: 12, bold: true, color: { argb: "111827" } };

  const detailHeader = worksheet.addRow([
    "No",
    "Aktivitas",
    "Scope",
    "Detail Keterangan",
    "Periode",
    "Jumlah Satuan",
    "Emisi (kgCO2e)",
    "Emisi (tCO2e)"
  ]);

  // Mewarnai Header Hijau Toska / Teal khas UI (`#00B589`)
  detailHeader.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "00B589" } };
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = thinBorder;
  });
  detailHeader.getCell(1).alignment = { horizontal: "center" };

  // Loop baris data detail emisi
  filteredData.forEach((row, idx) => {
    const jumlahSatuanFormatted = `${Number(row.jumlah).toLocaleString("id-ID")} ${row.satuan}`;
    const emisiKg = Number((row.emisi_tCO2e * 1000).toFixed(2));
    const emisiTon = Number(row.emisi_tCO2e.toFixed(4));

    const addedRow = worksheet.addRow([
      idx + 1,
      ACTIVITY_LABELS[row.aktivitas] ?? row.aktivitas,
      row.scope,
      row.detail_aktivitas || "-",
      row.periode || "-",
      jumlahSatuanFormatted,
      emisiKg,
      emisiTon
    ]);

    // Format sel isi data detail
    addedRow.eachCell((cell, colNumber) => {
      cell.border = thinBorder;
      cell.font = { name: "Arial", size: 9, color: { argb: "374151" } };
      cell.alignment = { vertical: "middle", horizontal: "left" };

      if (colNumber === 1) cell.alignment = { horizontal: "center" };
      
      if (colNumber === 7) {
        cell.numFmt = "#,##0.00";
        cell.alignment = { horizontal: "right" };
      }
      
      if (colNumber === 8) {
        cell.numFmt = "#,##0.0000";
        cell.alignment = { horizontal: "right" };
        cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "111827" } };
      }
    });
  });

  // ==========================================
  // D. LEBAR KOLOM OTOMATIS GLOBAL (AUTO-WIDTH)
  // ==========================================
  worksheet.columns.forEach((column, colIndex) => {
    let maxLength = 8; 

    column.eachCell?.({ includeEmpty: false }, (cell, rowNumber) => {
      // Abaikan baris metadata judul & baris ringkasan tabel atas (1 s.d 12)
      // agar teks merge yang panjang tidak mengacaukan kalkulasi lebar kolom asli bawah
      if (rowNumber <= 12) return;

      if (cell.value) {
        const cellString = cell.value.toString();
        if (cellString.length > maxLength) {
          maxLength = cellString.length;
        }
      }
    });

    // Penentuan lebar kolom final berdasarkan data riil tabel rincian bawah
    if (colIndex === 0) {
      column.width = 6;  // Kunci Kolom A (No) agar tetap ramping dan rapi
    } else if (colIndex === 1) {
      // Kolom B (Aktivitas) disesuaikan agar tulisan panjang "Scope 3 - Other..." 
      // pada tabel ringkasan atas tetap longgar muat sempurna dan tidak terpotong
      column.width = 54; 
    } else if (colIndex === 2) {
      // Kolom C menampung kode "Scope X" di bawah dan "Total (tCO2e)" di atas
      column.width = 22; 
    } else {
      column.width = maxLength + 5; // Sisa kolom lainnya otomatis melar dinamis
    }
  });

  // 5. Build File Buffer & Trigger File Download
  const buffer = await workbook.xlsx.writeBuffer();
  const dataBlob = new Blob([buffer], { 
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
  });
  
  saveAs(dataBlob, `GHG_Emission_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
};