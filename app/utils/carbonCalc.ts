// app/utils/carbonCalc.ts
//
// ═══════════════════════════════════════════════════════════════════════════
// PERHITUNGAN EMISI GHG — SESUAI GHG PROTOCOL CORPORATE STANDARD
// ═══════════════════════════════════════════════════════════════════════════
//
// Metodologi:
//   • Standar    : GHG Protocol Corporate Accounting & Reporting Standard (Rev. Ed.)
//   • Boundary   : Operational Control (bukan Equity Share / Financial Control)
//   • Approach   : Scope 2 Location-Based (grid emission factor nasional/regional)
//   • GWP Basis  : Lihat field gwp_basis PER BARIS — dihitung dari referensi yang
//                  BENAR-BENAR dipakai (bisa beda dari yang diminta jika fallback).
//   • Unit output: tCO₂e (metrik ton setara CO₂)
//
// Rumus inti (GHG Protocol, hal. 25-27):
//   Emisi (kgCO₂e) = Jumlah Aktivitas (unit) × Faktor Emisi (kgCO₂e/unit)
//   Emisi (tCO₂e)  = Emisi (kgCO₂e) / 1000
//
// Catatan pembulatan:
//   Akumulasi dilakukan pada nilai RAW (floating point penuh) untuk menghindari
//   error kumulatif akibat pembulatan prematur. Pembulatan hanya terjadi sekali
//   di akhir untuk output/display, bukan selama akumulasi.
//
// Catatan matching aktivitas:
//   Input data sering berupa kalimat deskriptif panjang (mis. "Konsumsi Listrik
//   Site Sumatera Selatan (Grid PLN Sumatera)"), bukan key pendek. Matching
//   dilakukan bertahap: exact match ke value kanonik → exact match ke alias →
//   substring match alias di dalam teks (alias terpanjang menang, supaya alias
//   spesifik seperti "sumatera selatan" tidak kalah oleh alias generik "listrik").
//
// Referensi:
//   - GHG Protocol: https://ghgprotocol.org/corporate-standard
//   - ESDM: Kepmen ESDM No. 13 Tahun 2020 (Grid Jamali 0.85 kgCO₂e/kWh)
//   - IPCC: 2006 IPCC Guidelines for National GHG Inventories (Volume 2)
//   - DEFRA: UK Government GHG Conversion Factors (updated annually)
//   - Faktor grid regional (Sumatera, dll): Ditjen Gatrik ESDM — PERLU VERIFIKASI
//     manual berkala, lihat flag `needsVerification` di activities.ts
// ═══════════════════════════════════════════════════════════════════════════

import {
  ACTIVITY_OPTIONS,
  ActivityOption,
  ReferenceKey,
  getEmissionFactor,
  getGwpBasisLabel,
} from "@/app/constants/activities";

// ─────────────────────────────────────────────────────────────────────────────
// TIPE DATA
// ─────────────────────────────────────────────────────────────────────────────

export interface InputRow {
  aktivitas: string;
  detail_aktivitas?: string;
  periode?: string | number;
  jumlah: number;
  scope?: number | null; // scope dari file import (1/2/3); opsional
}

export interface HasilBaris {
  aktivitas: string;
  detail_aktivitas: string;
  periode: string | number;
  scope: string;
  kategori: string;
  jumlah: number;
  satuan: string;
  // Faktor emisi yang benar-benar dipakai (sudah include fallback jika ref null)
  faktor_konversi: number;
  // Referensi yang BENAR-BENAR dipakai (bisa berbeda dari request jika fallback)
  referensi_dipakai: ReferenceKey | null;
  // Apakah faktor ini hasil fallback dari referensi lain?
  is_fallback: boolean;
  // Referensi yang diminta user (untuk audit trail)
  referensi_diminta: ReferenceKey;
  // Basis GWP dari referensi yang BENAR-BENAR dipakai di baris ini (bukan global)
  gwp_basis: string;
  // True kalau activity ini masih pakai faktor placeholder yang belum diverifikasi
  // ke dokumen resmi terbaru (lihat activities.ts -> needsVerification)
  needs_verification: boolean;
  // Emisi dalam kgCO₂e — presisi 6 desimal untuk menjaga akurasi saat diakumulasi
  emisi_kgCO2e: number;
  // Emisi dalam tCO₂e — presisi 6 desimal
  emisi_tCO2e: number;
}

export interface DataTidakDikenali {
  aktivitas: string;
  alasan: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalisasi key aktivitas: lowercase, trim, spasi→underscore.
 * Dipakai untuk mencocokkan input teks bebas ke key/alias di ACTIVITY_OPTIONS.
 */
export function normalizeKey(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, "_").replace(/-/g, "_");
}

/**
 * Bangun lookup map dari ACTIVITY_OPTIONS sekali saja (tidak tiap pemanggilan).
 */
const ACTIVITY_MAP: Record<string, ActivityOption> = ACTIVITY_OPTIONS.reduce(
  (acc, curr) => {
    acc[normalizeKey(curr.value)] = curr;
    return acc;
  },
  {} as Record<string, ActivityOption>
);

/**
 * Cari ActivityOption yang cocok dengan teks input bebas.
 *
 * Strategi bertingkat:
 *   1. Exact match ke value kanonik (cepat, untuk key terstruktur)
 *   2. Exact match ke salah satu alias
 *   3. Substring match — alias muncul sebagai bagian dari teks input.
 *      Dipakai untuk kalimat deskriptif panjang seperti
 *      "Konsumsi Listrik Site Sumatera Selatan (Grid PLN Sumatera)".
 *      Alias dengan panjang karakter terbesar yang match akan menang,
 *      supaya alias spesifik ("sumatera selatan") tidak kalah duluan
 *      oleh alias generik yang juga muncul di teks ("listrik").
 *      Alias < 4 karakter diabaikan di tahap ini untuk menghindari
 *      false-positive dari kata pendek yang sering muncul kebetulan.
 */
export function findActivityMatch(rawText: string): ActivityOption | null {
  const normalized = normalizeKey(rawText);

  // 1. Exact match ke value kanonik
  if (normalized in ACTIVITY_MAP) return ACTIVITY_MAP[normalized];

  // 2. Exact match ke salah satu alias
  for (const opt of ACTIVITY_OPTIONS) {
    if (opt.aliases.some((a) => normalizeKey(a) === normalized)) return opt;
  }

  // 3. Substring match, alias terpanjang menang
  let bestMatch: ActivityOption | null = null;
  let bestAliasLength = 0;

  for (const opt of ACTIVITY_OPTIONS) {
    for (const alias of opt.aliases) {
      const normAlias = normalizeKey(alias);
      if (normAlias.length >= 4 && normalized.includes(normAlias)) {
        if (normAlias.length > bestAliasLength) {
          bestMatch = opt;
          bestAliasLength = normAlias.length;
        }
      }
    }
  }

  return bestMatch;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNGSI UTAMA — prosesPerhitungan
// ─────────────────────────────────────────────────────────────────────────────

export function prosesPerhitungan(
  dataInputs: InputRow[],
  reference: ReferenceKey = "ESDM"
) {
  // ── Akumulator RAW — JANGAN dibulatkan selama akumulasi ──────────────────
  // GHG Protocol mengharuskan presisi numerik dijaga selama perhitungan.
  // Pembulatan prematur menghasilkan error kumulatif yang signifikan pada
  // dataset besar atau nilai emisi sangat kecil (misal: kapal logistik per km).
  const summaryRaw: Record<string, number> = {
    "Scope 1 (Direct)":            0,
    "Scope 2 (Indirect - Energy)": 0,
    "Scope 3 (Value Chain)":       0,
  };

  const hasilPerhitungan: HasilBaris[] = [];
  const dataTidakDikenali: DataTidakDikenali[] = [];

  for (const item of dataInputs) {
    const jumlah = Number(item.jumlah);

    // Validasi: jumlah harus angka finite dan tidak negatif
    if (!Number.isFinite(jumlah) || jumlah < 0) {
      dataTidakDikenali.push({
        aktivitas: item.aktivitas,
        alasan: "Jumlah tidak valid (kosong/NaN/negatif)",
      });
      continue;
    }

    // Matching aktivitas — exact key/alias, lalu substring (lihat findActivityMatch)
    const meta = findActivityMatch(item.aktivitas);
    if (!meta) {
      dataTidakDikenali.push({
        aktivitas: item.aktivitas,
        alasan: "Tidak ditemukan di daftar aktivitas/alias",
      });
      continue;
    }

    // ── Ambil faktor emisi dengan fallback otomatis ───────────────────────
    // getEmissionFactor() mengembalikan: { value, isFallback, usedRef }
    // Jika ref yang diminta = null di activity ini, otomatis fallback ke
    // referensi lain sesuai urutan prioritas: ESDM → IPCC → DEFRA
    const factorResult = getEmissionFactor(meta, reference);
    const faktor       = factorResult.value;

    // ── Rumus inti GHG Protocol ───────────────────────────────────────────
    // Emisi (kgCO₂e) = Jumlah (unit) × Faktor Emisi (kgCO₂e/unit)
    const emisiKgRaw  = jumlah * faktor;     // nilai RAW, belum dibulatkan
    const emisiTonRaw = emisiKgRaw / 1000;   // konversi ke tCO₂e (1 ton = 1000 kg)

    // ── Akumulasi RAW ke summary scope ───────────────────────────────────
    // Guard `?? 0` mencegah NaN kalau suatu saat ada scope baru yang belum
    // terdaftar di summaryRaw.
    summaryRaw[meta.scope] = (summaryRaw[meta.scope] ?? 0) + emisiTonRaw;

    // ── Simpan hasil baris ────────────────────────────────────────────────
    hasilPerhitungan.push({
      aktivitas:           item.aktivitas,
      detail_aktivitas:    item.detail_aktivitas ?? "",
      periode:             item.periode ?? "",
      scope:               meta.scope,
      kategori:            meta.category,
      jumlah,
      satuan:              meta.unit,
      faktor_konversi:     faktor,
      referensi_dipakai:   factorResult.usedRef,
      is_fallback:         factorResult.isFallback,
      referensi_diminta:   reference,
      gwp_basis:           getGwpBasisLabel(factorResult.usedRef),
      needs_verification:  meta.needsVerification ?? false,
      emisi_kgCO2e:        Number(emisiKgRaw.toFixed(6)),   // 6 desimal, presisi tinggi
      emisi_tCO2e:         Number(emisiTonRaw.toFixed(6)),  // 6 desimal, presisi tinggi
    });
  }

  // ── Validasi output ───────────────────────────────────────────────────────
  if (hasilPerhitungan.length === 0) {
    throw new Error(
      "Tidak ada data aktivitas valid atau cocok dengan faktor emisi yang tersedia."
    );
  }

  // ── Total dan chart data ──────────────────────────────────────────────────
  // Bulatkan SEKALI DI AKHIR dari nilai RAW yang sudah diakumulasi penuh.
  const s1 = summaryRaw["Scope 1 (Direct)"];
  const s2 = summaryRaw["Scope 2 (Indirect - Energy)"];
  const s3 = summaryRaw["Scope 3 (Value Chain)"];

  const totalRaw    = s1 + s2 + s3;
  const total_tCO2e = Number(totalRaw.toFixed(4));

  const chartData = [
    {
      name: "Scope 1",
      value: Number(s1.toFixed(4)),
      color: "#EF4444",
      deskripsi: "Emisi langsung (bahan bakar & pembakaran)",
    },
    {
      name: "Scope 2",
      value: Number(s2.toFixed(4)),
      color: "#EAB308",
      deskripsi: "Emisi tidak langsung (konsumsi listrik)",
    },
    {
      name: "Scope 3",
      value: Number(s3.toFixed(4)),
      color: "#3B82F6",
      deskripsi: "Emisi rantai nilai (logistik, perjalanan, material, limbah)",
    },
  ];

  // Deteksi campuran basis GWP dalam satu laporan — relevan untuk transparansi
  // audit, karena GHG Protocol best practice mensyaratkan konsistensi GWP
  // dalam satu inventori. Kalau ada baris fallback ke referensi dengan basis
  // GWP berbeda dari mayoritas, ini akan bernilai true.
  const gwpBasisSet = new Set(hasilPerhitungan.map((h) => h.gwp_basis));
  const gwpBasisCampuran = gwpBasisSet.size > 1;

  // Tandai kalau ada baris yang masih pakai faktor placeholder (belum diverifikasi)
  const adaFaktorBelumTervalidasi = hasilPerhitungan.some((h) => h.needs_verification);

  return {
    total_tCO2e,
    detail: hasilPerhitungan,
    chartData,
    // Data yang gagal diproses — supaya tidak hilang diam-diam dari total
    data_tidak_dikenali: dataTidakDikenali,
    // Metadata audit — berguna untuk laporan & verifikasi
    meta: {
      referensi_diminta:        reference,
      jumlah_aktivitas:         hasilPerhitungan.length,
      jumlah_tidak_dikenali:    dataTidakDikenali.length,
      ada_fallback:             hasilPerhitungan.some((h) => h.is_fallback),
      gwp_basis_campuran:       gwpBasisCampuran,
      ada_faktor_belum_tervalidasi: adaFaktorBelumTervalidasi,
      metodologi:               "GHG Protocol Corporate Standard — Operational Control Boundary",
      scope2_approach:          "Location-Based (Grid Emission Factor Nasional/Regional)",
      catatan_limitasi: [
        "Faktor grid listrik regional (mis. Sumatera) masih placeholder di sebagian data — perlu verifikasi ke dokumen resmi Ditjen Gatrik ESDM sebelum dipakai untuk pelaporan resmi.",
        "Scope 2 menggunakan pendekatan location-based. Market-based (RECs/PPA) belum diimplementasi.",
        "Faktor transportasi (pesawat, kereta) dalam kgCO₂e per penumpang-km, bukan per kendaraan.",
        "Satu laporan bisa berisi campuran basis GWP (AR4/AR5) jika terjadi fallback referensi pada beberapa baris — cek meta.gwp_basis_campuran.",
      ],
    },
  };
}