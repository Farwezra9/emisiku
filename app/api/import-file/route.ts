//app/api/import-file/route.ts
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { ACTIVITY_OPTIONS, ReferenceKey } from "@/app/constants/activities";
import { prosesPerhitungan } from "@/app/utils/carbonCalc";

/**
 * Fungsi cerdas untuk menebak value/key aktivitas berdasarkan teks input pengguna.
 *
 * Tiga lapisan pencarian dengan prioritas:
 *  1. Exact match pada value utama      → "solar" == "solar"
 *  2. Exact match pada salah satu alias → "hsd" == "hsd"
 *  3. Input mengandung alias (fuzzy)    → pilih alias TERPANJANG yang cocok
 *     agar aktivitas lebih spesifik menang (misal "bio solar" > "solar")
 */
function tebakKeyAktivitas(teksInput: string): string | null {
  if (!teksInput) return null;

  const cleanInput = teksInput.toLowerCase().trim();

  // ── PASS 1: Exact match pada value utama ──
  const exactValue = ACTIVITY_OPTIONS.find(
    (opt) => cleanInput === opt.value.replace(/_/g, " ")
  );
  if (exactValue) return exactValue.value;

  // ── PASS 2: Exact match pada salah satu alias ──
  const exactAlias = ACTIVITY_OPTIONS.find((opt) =>
    opt.aliases.some((alias) => cleanInput === alias.toLowerCase())
  );
  if (exactAlias) return exactAlias.value;

  // ── PASS 3: Input MENGANDUNG alias (fuzzy) ──
  // Pilih alias terpanjang yang cocok agar yang lebih spesifik selalu menang.
  // Contoh: input "bio solar" → alias "bio solar" (9 char) menang atas "solar" (5 char)
  let bestMatch: { value: string; aliasLen: number } | null = null;

  for (const opt of ACTIVITY_OPTIONS) {
    for (const alias of opt.aliases) {
      const aliasLower = alias.toLowerCase();
      if (cleanInput.includes(aliasLower)) {
        if (!bestMatch || aliasLower.length > bestMatch.aliasLen) {
          bestMatch = { value: opt.value, aliasLen: aliasLower.length };
        }
      }
    }
  }

  return bestMatch ? bestMatch.value : null;
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

// Validasi nilai reference yang dikirim dari frontend
const VALID_REFERENCES: ReferenceKey[] = ["ESDM", "IPCC", "DEFRA"];

function parseReference(value: FormDataEntryValue | null): ReferenceKey {
  if (typeof value === "string" && VALID_REFERENCES.includes(value as ReferenceKey)) {
    return value as ReferenceKey;
  }
  return "ESDM";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const reference = parseReference(formData.get("reference"));

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
            return NextResponse.json(
              { detail: `Kolom '${col}' tidak ditemukan di berkas dokumen.` },
              { status: 400 }
            );
          }
        }
      }

      for (const row of data) {
        if (!row["Kategori Aktivitas"] || row["Jumlah"] === undefined) continue;

        const inputKategori = String(row["Kategori Aktivitas"]);
        const matchedKey = tebakKeyAktivitas(inputKategori);

        // Jika tidak dikenali sama sekali oleh kamus aliases, lewati baris ini
        if (!matchedKey) continue;

        let periodeVal: number | undefined;

        if (row["Periode"]) {
          if (typeof row["Periode"] === "number") {
            // Excel date serial atau tahun langsung
            if (row["Periode"] > 1900 && row["Periode"] < 3000) {
              periodeVal = row["Periode"];
            } else {
              const dateObj = XLSX.SSF.parse_date_code(row["Periode"]);
              periodeVal = dateObj.y;
            }
          } else {
            const tahun = parseInt(String(row["Periode"]).match(/\d{4}/)?.[0] || "");
            periodeVal = isNaN(tahun) ? undefined : tahun;
          }
        }

        // Ambil nilai scope angka (1, 2, atau 3)
        const scopeVal = dapatkanAngkaScope(String(row["Scope"]));

        extractedRows.push({
          aktivitas: matchedKey,
          detail_aktivitas: row["Detail / Keterangan"]
            ? String(row["Detail / Keterangan"])
            : inputKategori,
          periode: periodeVal,
          jumlah: parseFloat(row["Jumlah"]) || 0,
          scope: scopeVal,
        });
      }
    } else {
      return NextResponse.json(
        { detail: "Format file tidak didukung. Harap unggah file Excel (.xlsx/.xls) atau CSV (.csv)." },
        { status: 400 }
      );
    }

    // Proteksi akhir jika tidak ada data yang berhasil diekstrak
    if (extractedRows.length === 0) {
      return NextResponse.json(
        { detail: "Tidak ada data aktivitas yang valid atau cocok dengan daftar faktor emisi kami di dokumen ini." },
        { status: 400 }
      );
    }

    // Hitung emisi menggunakan referensi yang dipilih user
    const hasil = prosesPerhitungan(extractedRows, reference);
    return NextResponse.json(hasil);

  } catch (error: any) {
    return NextResponse.json(
      { detail: error.message || "Terjadi kesalahan internal parser spreadsheet" },
      { status: 400 }
    );
  }
}