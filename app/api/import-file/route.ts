import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { ACTIVITY_OPTIONS } from "@/app/constants/activities";
import { prosesPerhitungan } from "@/app/utils/carbonCalc";

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

/**
 * Fungsi pembantu untuk mengekstrak angka Scope bersih (misal: "Scope 1" atau "1" -> 1)
 */
function dapatkanAngkaScope(teksInput: string): number | null {
  if (!teksInput) return null;
  const match = teksInput.toLowerCase().match(/scope\s*(\d+)/);
  if (match) return parseInt(match[1]);
  
  // Jika hanya tertulis angka saja di kolom scope (misal: 1, 2, 3)
  const angkaSaja = teksInput.match(/^\s*(\d+)\s*$/);
  return angkaSaja ? parseInt(angkaSaja[1]) : null;
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
    // PARSER SPREADSHEET (Mendukung .xlsx, .xls, dan .csv)
    // --------------------------------------------------
    if (filename.endsWith(".xlsx") || filename.endsWith(".xls") || filename.endsWith(".csv")) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (data.length > 0) {
        // Validasi kolom wajib yang harus ada di dalam file spreadsheet
        const requiredColumns = ["Kategori Aktivitas", "Detail / Keterangan", "Jumlah", "Scope"];
        const firstRowKeys = Object.keys(data[0]);
        for (const col of requiredColumns) {
          if (!firstRowKeys.includes(col)) {
            return NextResponse.json({ detail: `Kolom '${col}' tidak ditemukan di berkas dokumen.` }, { status: 400 });
          }
        }
      }

      for (const row of data) {
        if (!row["Kategori Aktivitas"] || row["Jumlah"] === undefined) continue;

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

        // Ambil nilai scope angka (1, 2, atau 3)
        const scopeVal = dapatkanAngkaScope(String(row["Scope"]));

        extractedRows.push({
          aktivitas: matchedKey,
          detail_aktivitas: row["Detail / Keterangan"] ? String(row["Detail / Keterangan"]) : inputKategori,
          periode: periodeVal,
          jumlah: parseFloat(row["Jumlah"]) || 0,
          scope: scopeVal
        });
      }
    } else {
      return NextResponse.json({ detail: "Format file tidak didukung. Harap unggah file Excel (.xlsx/.xls) atau CSV (.csv)." }, { status: 400 });
    }

    // Proteksi akhir jika tidak ada data yang berhasil diekstrak
    if (extractedRows.length === 0) {
      return NextResponse.json(
        { detail: "Tidak ada data aktivitas yang valid atau cocok dengan daftar faktor emisi kami di dokumen ini." },
        { status: 400 }
      );
    }

    const hasil = prosesPerhitungan(extractedRows);
    return NextResponse.json(hasil);

  } catch (error: any) {
    return NextResponse.json(
      { detail: error.message || "Terjadi kesalahan internal parser spreadsheet" },
      { status: 400 }
    );
  }
}