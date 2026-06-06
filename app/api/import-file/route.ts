import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { PDFExtract } from "pdf.js-extract";
import { ACTIVITY_OPTIONS } from "@/app/constants/activities";
import { prosesPerhitungan } from "@/app/utils/carbonCalc";

const pdfExtract = new PDFExtract();

/**
 * Fungsi cerdas untuk menebak value/key aktivitas berdasarkan teks input pengguna.
 * Mencocokkan teks ke value utama atau ke dalam array daftar aliases.
 */
function tebakKeyAktivitas(teksInput: string): string | null {
  if (!teksInput) return null;
  
  const cleanInput = teksInput.toLowerCase().trim();

  // Cari opsi aktivitas yang value atau salah satu alias-nya terkandung/cocok dengan teks input
  const match = ACTIVITY_OPTIONS.find((opt) => {
    const valueSesuai = cleanInput === opt.value.toLowerCase() || cleanInput.includes(opt.value.replace(/_/g, " "));
    const aliasSesuai = opt.aliases.some((alias) => cleanInput.includes(alias.toLowerCase()));
    
    return valueSesuai || aliasSesuai;
  });

  return match ? match.value : null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ detail: "File tidak ditemukan" }, { status: 400 });
    }

    const filename = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    const extractedRows: any[] = [];

    // --------------------------------------------------
    // PARSER EXCEL (.xlsx / .xls)
    // --------------------------------------------------
    if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (data.length > 0) {
        const requiredColumns = ["Kategori Aktivitas", "Detail / Keterangan", "Jumlah"];
        const firstRowKeys = Object.keys(data[0]);
        for (const col of requiredColumns) {
          if (!firstRowKeys.includes(col)) {
            return NextResponse.json({ detail: `Kolom '${col}' tidak ditemukan di berkas Excel.` }, { status: 400 });
          }
        }
      }

      for (const row of data) {
        if (!row["Kategori Aktivitas"] || row["Jumlah"] === undefined) continue;

        // Tebak key aktivitas menggunakan fungsi pintar aliases
        const inputKategori = String(row["Kategori Aktivitas"]);
        const matchedKey = tebakKeyAktivitas(inputKategori);

        // Jika tidak dikenali sama sekali oleh kamus aliases, lewati baris ini
        if (!matchedKey) continue;

        let periodeVal = "";
        if (row["Periode"]) {
          if (typeof row["Periode"] === "number") {
            const dateObj = XLSX.SSF.parse_date_code(row["Periode"]);
            periodeVal = `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
          } else {
            periodeVal = String(row["Periode"]).trim().substring(0, 10);
          }
        }

        extractedRows.push({
          aktivitas: matchedKey, // Menyimpan ID bersih (contoh: "pertalite", "pesawat_domestik")
          detail_aktivitas: row["Detail / Keterangan"] ? String(row["Detail / Keterangan"]) : inputKategori,
          periode: periodeVal,
          jumlah: parseFloat(row["Jumlah"]) || 0
        });
      }
    } 
    // --------------------------------------------------
    // PARSER PDF (Menggunakan pdf.js-extract)
    // --------------------------------------------------
    else if (filename.endsWith(".pdf")) {
      const pdfData = await pdfExtract.extractBuffer(buffer, {});

      // Ambil semua potongan teks lalu gabungkan
      const rawText = pdfData.pages.map(p => p.content.map(c => c.str).join(" ")).join("\n");
      // Pecah berdasarkan baris baru atau pembatas pipa untuk simulasi baris kalimat
      const cleanLines = rawText.split(/[|\n]/);

      for (const line of cleanLines) {
        if (!line.trim()) continue;

        // Tebak key aktivitas dari baris teks PDF menggunakan kecerdasan aliases
        const matchedKey = tebakKeyAktivitas(line);

        if (matchedKey) {
          const angkaMatch = line.match(/\d+(?:[.,]\d+)?/);
          let jumlah = 1.0;

          if (angkaMatch) {
            const numStr = angkaMatch[0].replace(",", ".");
            jumlah = parseFloat(numStr) || 1.0;
          }

          extractedRows.push({
            aktivitas: matchedKey, // Otomatis mengonversi kalimat bebas menjadi ID valid
            detail_aktivitas: line.trim(),
            periode: "", // Default kosong untuk PDF, nanti diisi via sistem/manual
            jumlah: jumlah
          });
        }
      }
    } else {
      return NextResponse.json({ detail: "Format file tidak didukung." }, { status: 400 });
    }

    // Proteksi jika setelah di-parse tidak ada satupun data yang cocok dengan aliases
    if (extractedRows.length === 0) {
      return NextResponse.json(
        { detail: "Tidak ada data aktivitas yang valid atau cocok dengan daftar faktor emisi kami." },
        { status: 400 }
      );
    }

    const hasil = prosesPerhitungan(extractedRows);
    return NextResponse.json(hasil);

  } catch (error: any) {
    return NextResponse.json(
      { detail: error.message || "Terjadi kesalahan internal parser" },
      { status: 400 }
    );
  }
}