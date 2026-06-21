// app/constants/activities.ts
// ============================================================

export type ReferenceKey = "ESDM" | "DEFRA";

export interface EmissionFactors {
  ESDM: number | null;
  DEFRA: number | null;
}

export interface ActivityOption {
  value: string;
  label: string;
  scope: string;
  unit: string;
  category: string;
  factors: EmissionFactors; // kg CO2e per unit, per referensi
  aliases: string[];
  // Tandai true kalau salah satu faktor di atas masih PLACEHOLDER dan
  // belum diverifikasi ke dokumen resmi terbaru. Dipakai untuk warning di UI.
  needsVerification?: boolean;
}

// Hasil pengambilan faktor: value yang dipakai, apakah hasil fallback, dan referensi asalnya
export interface EmissionFactorResult {
  value: number;
  isFallback: boolean;
  usedRef: ReferenceKey | null;
}

// Ambil faktor berdasarkan referensi yang dipilih.
// Jika null, fallback ke urutan prioritas: ESDM -> DEFRA
//
// ESDM jadi prioritas utama karena paling spesifik untuk konteks Indonesia
// dan jadi rujukan legal di banyak regulasi domestik. DEFRA jadi fallback
// untuk kategori yang tidak punya angka siap-pakai di ESDM (material
// kantor, limbah per-jenis, air, transportasi per-km, pelumas).
export function getEmissionFactor(
  activity: ActivityOption,
  ref: ReferenceKey
): EmissionFactorResult {
  const fallbackOrder: ReferenceKey[] = ["ESDM", "DEFRA"];

  if (activity.factors[ref] !== null) {
    return { value: activity.factors[ref]!, isFallback: false, usedRef: ref };
  }

  for (const fb of fallbackOrder) {
    if (activity.factors[fb] !== null) {
      return { value: activity.factors[fb]!, isFallback: true, usedRef: fb };
    }
  }

  return { value: 0, isFallback: true, usedRef: null };
}

// Helper ringkas — hanya angka, untuk kalkulasi langsung
export function getEmissionFactorValue(
  activity: ActivityOption,
  ref: ReferenceKey
): number {
  return getEmissionFactor(activity, ref).value;
}

// Basis GWP (Global Warming Potential) yang dipakai oleh masing-masing
// referensi saat menerbitkan faktor emisinya.
//
// DEFRA: workbook resmi (tab "Introduction", baris 35) menyatakan eksplisit
// basis AR5 (2013). Konsisten dari rilis 2025 ke rilis 2026.
//
// ESDM: dokumen sumber faktor BBM/batubara ESDM ("Nilai Faktor Emisi (FE)
// CO2 Nasional") secara eksplisit hanya menerbitkan faktor CO2 murni
// (CO2 only), bukan CO2e gabungan CO2+CH4+N2O — sehingga konsep "basis GWP"
// secara ketat tidak berlaku untuk entri ber-sumber ESDM (GWP cuma relevan
// kalau ada gas non-CO2 yang dikonversi ke setara CO2). Pelabelan "kg CO2e"
// untuk entri ESDM adalah simplifikasi umum di kalangan praktisi (karena
// CO2 mendominasi >99% total emisi pembakaran bahan bakar), bukan kesalahan
// fatal, tapi sebaiknya dipahami sebagai pendekatan, bukan presisi penuh.
export function getGwpBasisLabel(usedRef: ReferenceKey | null): string {
  if (usedRef === "DEFRA") return "AR5 (IPCC 2013)";
  if (usedRef === "ESDM")
    return "CO2 murni (dokumen sumber ESDM tidak menerbitkan CO2e gabungan — GWP tidak berlaku ketat di sini)";
  return "Tidak diketahui";
}

export const ACTIVITY_OPTIONS: ActivityOption[] = [

  // ══════════════════════════════════════════════════════════
  // SCOPE 1 — DIRECT EMISSIONS
  // ══════════════════════════════════════════════════════════
  {
    value: "premium",
    label: "Premium",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Fuel",
    // DEFRA: kategori "Petrol (100% mineral petrol)" = 2,35372 kg CO2e/liter.
    // Dipilih varian 100% mineral (bukan "average biofuel blend" 2,075)
    // karena Premium tidak diwajibkan campuran etanol seperti bensin UK.
    factors: { ESDM: 2.31, DEFRA: 2.35 },
    aliases: ["premium", "bensin premium", "bbm premium"],
  },
  {
    value: "pertalite",
    label: "Pertalite",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Fuel",
    factors: { ESDM: 2.31, DEFRA: 2.35 },
    aliases: ["pertalite", "bensin", "bensin kendaraan", "bbm", "bahan bakar"],
  },
  {
    value: "pertamax",
    label: "Pertamax",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Fuel",
    factors: { ESDM: 2.30, DEFRA: 2.35 },
    aliases: ["pertamax", "bensin pertamax", "pertamax 92", "pertamax plus"],
  },
  {
    value: "solar",
    label: "Solar",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Fuel",
    // DEFRA: kategori "Diesel (100% mineral diesel)" = 2,66155 kg CO2e/liter.
    factors: { ESDM: 2.68, DEFRA: 2.66 },
    aliases: ["solar", "bahan bakar solar", "hsd", "diesel fuel"],
  },
  {
    value: "bio_solar",
    label: "Bio Solar",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Fuel",
    // PERLU VERIFIKASI: DEFRA "Diesel (average biofuel blend)" merefleksikan
    // campuran biodiesel UK (~7%), jauh lebih rendah dari B30/B35 Indonesia.
    // Tidak representatif — DEFRA dikosongkan, dipakai ESDM saja.
    factors: { ESDM: 2.54, DEFRA: null },
    needsVerification: true,
    aliases: ["bio solar", "biosolar", "b30", "b35"],
  },
  {
    value: "dexlite",
    label: "Dexlite",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Fuel",
    factors: { ESDM: 2.68, DEFRA: 2.66 },
    aliases: ["dexlite", "bbm dexlite"],
  },
  {
    value: "pertamina_dex",
    label: "Pertamina Dex",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Fuel",
    factors: { ESDM: 2.67, DEFRA: 2.66 },
    aliases: ["pertamina dex", "pertaminadex", "dex"],
  },
  {
    value: "lpg",
    label: "LPG",
    scope: "Scope 1 (Direct)",
    unit: "Kg",
    category: "Gas",
    // Terverifikasi cocok: DEFRA LPG tonnes 2939,36 / 1000 = 2,939 ≈ 2,94.
    factors: { ESDM: 3.02, DEFRA: 2.94 },
    aliases: ["lpg", "elpiji", "gas lpg", "tabung lpg"],
  },
  {
    value: "lng",
    label: "LNG",
    scope: "Scope 1 (Direct)",
    unit: "m3",
    category: "Gas",
    // PERLU VERIFIKASI: tabel DEFRA tidak punya baris "cubic metres" untuk
    // LNG (LNG itu cairan, hanya ada tonnes/litres/kWh di sumber resmi).
    // Tergantung apakah input lapangan Anda LNG cair (litres) atau gas hasil
    // regasifikasi (m3) — perlu konfirmasi sebelum diisi. Dipakai ESDM saja.
    factors: { ESDM: 2.19, DEFRA: null },
    needsVerification: true,
    aliases: ["lng", "liquified natural gas", "gas alam cair"],
  },
  {
    value: "cng",
    label: "CNG",
    scope: "Scope 1 (Direct)",
    unit: "m3",
    category: "Gas",
    // PERLU VERIFIKASI: sama seperti LNG, DEFRA tidak punya angka per m3
    // untuk CNG tanpa asumsi densitas gas terkompresi. Dipakai ESDM saja.
    factors: { ESDM: 1.97, DEFRA: null },
    needsVerification: true,
    aliases: ["cng", "compressed natural gas", "bbt", "bahan bakar gas"],
  },
  {
    value: "gas_alam",
    label: "Gas Alam",
    scope: "Scope 1 (Direct)",
    unit: "m3",
    category: "Gas",
    // Terverifikasi: DEFRA "Natural gas (100% mineral blend)", cubic metres
    // = 2,04987 ≈ 2,05.
    factors: { ESDM: 1.97, DEFRA: 2.05 },
    aliases: ["gas alam", "gas bumi", "natural gas", "gas pipa"],
  },
  {
    value: "genset_diesel",
    label: "Genset Diesel",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Generator",
    // DEFRA: kategori "Gas oil" (mesin stasioner/off-road), BUKAN "Diesel"
    // yang khusus bahan bakar jalan raya. Gas oil litres = 2,75541 ≈ 2,76.
    factors: { ESDM: 2.68, DEFRA: 2.76 },
    aliases: ["genset diesel", "solar genset", "genset solar", "generator diesel"],
  },
  {
    value: "genset_bensin",
    label: "Genset Bensin",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Generator",
    factors: { ESDM: 2.31, DEFRA: 2.35 },
    aliases: ["genset bensin", "generator bensin", "bensin genset"],
  },
  {
    value: "batubara",
    label: "Batubara",
    scope: "Scope 1 (Direct)",
    unit: "Kg",
    category: "Industrial Fuel",
    // PERLU VERIFIKASI: DEFRA punya 2 kategori berbeda — "Coal (industrial)"
    // = 2,42/kg vs "Coal (electricity generation)" = 2,23/kg. Dipilih nilai
    // "industrial" agar konsisten dengan label kategori entri ini. Kalau
    // pemakaian Anda untuk PLTU/pembangkit listrik, ganti ke 2,23.
    // Dokumen ESDM sendiri membagi batubara jadi beberapa kelas kalor dengan
    // FE/NCV berbeda — nilai 2,42 di sini perlu dipastikan kelas kalor mana
    // yang dipakai sebagai basis (lihat dokumen ESDM Tabel 5-6).
    factors: { ESDM: 2.42, DEFRA: 2.42 },
    needsVerification: true,
    aliases: ["batubara", "batu bara", "coal", "pembakaran batubara"],
  },
  {
    value: "pelumas",
    label: "Pelumas",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Industrial",
    // ESDM tidak menerbitkan faktor untuk pelumas. Terverifikasi dari DEFRA:
    // kategori "Lubricants", litres = 2,74934 ≈ 2,75.
    factors: { ESDM: null, DEFRA: 2.75 },
    aliases: ["pelumas", "oli", "oil", "oli mesin", "pelumas mesin"],
  },
  {
    value: "listrik_solar_panel_onsite",
    label: "Listrik Solar Surya (Produksi Mandiri On-Site)",
    scope: "Scope 1 (Direct)",
    unit: "kWh",
    category: "Renewable Energy",
    // Produksi listrik mandiri dari panel surya, dipakai sendiri di lokasi
    // (bukan dibeli dari PLN). Faktor emisi operasional = 0 karena tidak ada
    // pembakaran bahan bakar saat menghasilkan listrik dari sinar matahari.
    factors: { ESDM: 0.00, DEFRA: 0.00 },
    aliases: [
      "listrik solar panel mandiri", "listrik solar panel on site", "listrik solar panel internal",
      "listrik panel surya mandiri", "listrik solar surya onsite","listrik solar surya on site", "solar panel on site",
      "plts on site", "panel surya sendiri", "energi surya mandiri",
      "produksi listrik mandiri", "produksi listrik mandiri dari panel surya",
      "energi terbarukan internal", "pembangkit panel surya internal",
    ],
  },

  // ══════════════════════════════════════════════════════════
  // SCOPE 2 — INDIRECT (ENERGY)
  // ══════════════════════════════════════════════════════════
  {
    value: "listrik_pln",
    label: "Listrik PLN",
    scope: "Scope 2 (Indirect - Energy)",
    unit: "kWh",
    category: "Electricity",

    factors: { ESDM: 0.85, DEFRA: 0.095},
    needsVerification: true,
    aliases: [
      "listrik pln", "listrik", "pln", "konsumsi listrik pln", "tagihan listrik", "konsumsi listrik", "daya listrik",
      "grid pln", "grid listrik pln",
    ],
  },
  {
    value: "listrik_pln_jamali",
    label: "Listrik PLN (Grid Jamali)",
    scope: "Scope 2 (Indirect - Energy)",
    unit: "kWh",
    category: "Electricity",
    // Sumber: "Faktor Emisi GRK Sistem Ketenagalistrikan Tahun 2019",
    // Ditjen Ketenagalistrikan KESDM, ditetapkan via Kepmen ESDM
    // No. 163.K/HK.02/MEM.S/2021 (30 Agustus 2021).
    // CM Ex-Ante (OM 0,5 / BM 0,5), grid Jawa-Madura-Bali = 0,87 ton CO2/MWh.
    // DEFRA dikosongkan — tidak ada faktor grid Indonesia dari sumber itu.
    factors: { ESDM: 0.87, DEFRA: null },
    aliases: [
      "listrik pln", "listrik", "pln", "listrik pln grid jamali", "listrik pln grid jawa madura bali", "tagihan listrik", "konsumsi listrik", "daya listrik",
      "grid jamali", "grid jawa madura bali", "listrik jawa", "listrik jamali",
      "listrik pln jamali", "grid pln jamali",
    ],
  },
  {
    value: "listrik_pln_sumatera",
    label: "Listrik PLN (Grid Sumatera)",
    scope: "Scope 2 (Indirect - Energy)",
    unit: "kWh",
    category: "Electricity",
    // Sumber sama dengan Jamali di atas (dokumen & Kepmen yang sama, tahun
    // data 2019) — CM Ex-Ante (OM 0,5 / BM 0,5), grid Sumatera = 0,93 ton
    // CO2/MWh. Bukan vintage data yang berbeda dari Jamali; keduanya dari
    // dokumen resmi yang sama.
    factors: { ESDM: 0.93, DEFRA: null },
    aliases: [
      "grid sumatera", "grid pln sumatera", "listrik sumatera", "listrik pln grid sumatera", "listrik site sumatera",
      "sumatera selatan", "site sumatera selatan", "konsumsi listrik site sumatera selatan",
      "lampung", "site lampung", "konsumsi listrik site lampung",
      "sumatera utara", "sumatera barat", "riau", "jambi", "bengkulu", "aceh",
      "listrik pln sumatera",
    ],
  },
  {
    value: "listrik_solar_panel",
    label: "Listrik Solar Surya",
    scope: "Scope 2 (Indirect - Energy)",
    unit: "kWh",
    category: "Renewable Energy",
    // Produksi listrik mandiri dari panel surya, dipakai sendiri di lokasi
    // (bukan dibeli dari PLN). Faktor emisi operasional = 0 karena tidak ada
    // pembakaran bahan bakar saat menghasilkan listrik dari sinar matahari.
    factors: { ESDM: 0.00, DEFRA: 0.00 },
    aliases: [
      "listrik solar panel", "listrik solar panel", "listrik solar panel",
      "listrik panel surya", "listrik solar surya", "solar panel",
      "plts", "panel surya", "energi surya",
      "pembelian energi terbarukan", "pembelian energi plts", "pembangkit panel surya",
      "listrik solar panel", "listrik panel surya", "listrik solar surya", "plts", "panel surya", "energi surya",
    ],
  },
  {
    value: "listrik_hidro",
    label: "Listrik Hidro",
    scope: "Scope 2 (Indirect - Energy)",
    unit: "kWh",
    category: "Renewable Energy",
    factors: { ESDM: 0.00, DEFRA: 0.00 },
    aliases: ["listrik hidro", "pltah", "plta", "energi air", "hidroelektrik"],
  },
  {
    value: "listrik_angin",
    label: "Listrik Angin",
    scope: "Scope 2 (Indirect - Energy)",
    unit: "kWh",
    category: "Renewable Energy",
    factors: { ESDM: 0.00, DEFRA: 0.00 },
    aliases: ["listrik angin", "pltb angin", "turbin angin", "energi angin"],
  },

  // ══════════════════════════════════════════════════════════
  // SCOPE 3 — VALUE CHAIN
  // ══════════════════════════════════════════════════════════
  // Semua entri di bawah ini murni dari DEFRA — ESDM tidak menerbitkan
  // faktor untuk transportasi penumpang per-km, limbah per-jenis, material
  // kantor, atau air. Belum diverifikasi cell-by-cell ke workbook resmi
  // terbaru; direkomendasikan verifikasi lanjutan kalau dipakai untuk
  // laporan formal/audit.
  {
    value: "pesawat_domestik",
    label: "Pesawat Domestik",
    scope: "Scope 3 (Value Chain)",
    unit: "Km",
    category: "Transportation",
    factors: { ESDM: null, DEFRA: 0.15 },
    needsVerification: true,
    aliases: ["pesawat domestik", "perjalanan pesawat", "perjalanan dinas pesawat domestik", "penerbangan domestik", "pesawat", "flight domestik", "perjalanan dinas pesawat"],
  },
  {
    value: "pesawat_internasional",
    label: "Pesawat Internasional",
    scope: "Scope 3 (Value Chain)",
    unit: "Km",
    category: "Transportation",
    factors: { ESDM: null, DEFRA: 0.20 },
    needsVerification: true,
    aliases: ["pesawat internasional", "perjalanan dinas pesawat internasional", "penerbangan internasional", "flight internasional", "pesawat luar negeri"],
  },
  {
    value: "kereta",
    label: "Kereta",
    scope: "Scope 3 (Value Chain)",
    unit: "Km",
    category: "Transportation",
    factors: { ESDM: null, DEFRA: 0.04 },
    needsVerification: true,
    aliases: ["kereta", "kereta api", "kai", "krl", "mrt", "lrt", "perjalanan kereta"],
  },
  {
    value: "bus",
    label: "Bus",
    scope: "Scope 3 (Value Chain)",
    unit: "Km",
    category: "Transportation",
    factors: { ESDM: null, DEFRA: 0.10 },
    needsVerification: true,
    aliases: ["bus", "bis", "bus antar kota", "perjalanan bus", "angkutan bus"],
  },
  {
    value: "mobil_logistik",
    label: "Mobil Logistik",
    scope: "Scope 3 (Value Chain)",
    unit: "Km",
    category: "Logistics",
    factors: { ESDM: null, DEFRA: 0.23 },
    needsVerification: true,
    aliases: ["mobil logistik", "van logistik", "pickup", "pick up", "mobil box", "armada logistik"],
  },
  {
    value: "truk_logistik",
    label: "Truk Logistik",
    scope: "Scope 3 (Value Chain)",
    unit: "Km",
    category: "Logistics",
    factors: { ESDM: null, DEFRA: 0.08 },
    needsVerification: true,
    aliases: ["truk logistik", "truk", "truck", "truk kontainer", "fuso", "wingbox"],
  },
  {
    value: "kapal_logistik",
    label: "Kapal Logistik",
    scope: "Scope 3 (Value Chain)",
    unit: "Km",
    category: "Logistics",
    factors: { ESDM: null, DEFRA: 0.016 },
    needsVerification: true,
    aliases: ["kapal logistik", "kapal kargo", "cargo ship", "pengiriman laut", "kapal laut"],
  },
  {
    value: "sampah_organik",
    label: "Sampah Organik",
    scope: "Scope 3 (Value Chain)",
    unit: "Kg",
    category: "Waste",
    factors: { ESDM: null, DEFRA: 0.58 },
    needsVerification: true,
    aliases: ["sampah organik", "limbah organik", "sampah sisa makanan", "sampah dapur"],
  },
  {
    value: "sampah_anorganik",
    label: "Sampah Anorganik",
    scope: "Scope 3 (Value Chain)",
    unit: "Kg",
    category: "Waste",
    factors: { ESDM: null, DEFRA: 0.02 },
    needsVerification: true,
    aliases: ["sampah anorganik", "limbah anorganik", "sampah non organik", "sampah kering"],
  },
  {
    value: "limbah_b3",
    label: "Limbah B3",
    scope: "Scope 3 (Value Chain)",
    unit: "Kg",
    category: "Hazardous Waste",
    factors: { ESDM: null, DEFRA: 1.11 },
    aliases: ["limbah b3", "sampah b3", "limbah berbahaya", "hazardous waste", "limbah kimia"],
  },
  {
    value: "kertas",
    label: "Kertas",
    scope: "Scope 3 (Value Chain)",
    unit: "Kg",
    category: "Office Material",
    factors: { ESDM: null, DEFRA: 1.06 },
    aliases: ["kertas", "kertas a4", "penggunaan kertas", "pembelian kertas", "rim kertas", "paper"],
  },
  {
    value: "plastik",
    label: "Plastik",
    scope: "Scope 3 (Value Chain)",
    unit: "Kg",
    category: "Material",
    factors: { ESDM: null, DEFRA: 3.14 },
    aliases: ["plastik", "kemasan plastik", "botol plastik", "plastic"],
  },
  {
    value: "karton",
    label: "Karton",
    scope: "Scope 3 (Value Chain)",
    unit: "Kg",
    category: "Packaging",
    factors: { ESDM: null, DEFRA: 0.82 },
    aliases: ["karton", "kardus", "box karton", "packaging karton"],
  },
  {
    value: "air_bersih",
    label: "Air Bersih",
    scope: "Scope 3 (Value Chain)",
    unit: "m3",
    category: "Water",
    factors: { ESDM: null, DEFRA: 0.344 },
    aliases: ["air bersih", "air pdam", "pdam", "konsumsi air", "penggunaan air"],
  },
  {
    value: "air_limbah",
    label: "Air Limbah",
    scope: "Scope 3 (Value Chain)",
    unit: "m3",
    category: "Wastewater",
    factors: { ESDM: null, DEFRA: 0.708 },
    needsVerification: true,
    aliases: ["air limbah", "limbah cair", "wastewater", "pengolahan air limbah"],
  },
];

// ── METADATA REFERENSI (untuk UI) ──
export const REFERENCE_METADATA: Record<ReferenceKey, {
  label: string;
  shortLabel: string;
  url: string;
  description: string;
  lastUpdated: string;
  scopeCoverage: string[];
  badge: string;
}> = {
  ESDM: {
    label: "Kementerian ESDM RI",
    shortLabel: "ESDM",
    url: "https://gatrik.esdm.go.id/frontend/download_index/?kode_category=emisi_pl",
    description: "Faktor Emisi Energi, BBM & Batubara Nasional Indonesia. Paling spesifik untuk konteks Indonesia.",
    lastUpdated: "Cek versi terbaru di esdm.go.id / gatrik.esdm.go.id",
    scopeCoverage: ["Scope 1", "Scope 2"],
    badge: "bg-red-100 text-red-700 border-red-200",
  },
  DEFRA: {
    label: "UK DESNZ/DEFRA Conversion Factors",
    shortLabel: "DEFRA",
    // Halaman koleksi ini selalu memuat rilis tahunan terbaru (2026 dirilis
    // 11 Juni 2026, menggantikan rilis 2025). Pakai halaman ini, bukan link
    // publikasi tahun tertentu, karena URL publikasi per-tahun kadang berubah.
    url: "https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting",
    description: "Faktor konversi GRK dari pemerintah UK (DESNZ, sebelumnya DEFRA/BEIS). Detail untuk material, limbah, dan transportasi.",
    lastUpdated: "2026 (DESNZ, dirilis 11 Juni 2026) — perubahan besar rilis 2026 hanya pada faktor listrik/rel/EV, faktor bahan bakar/gas/batubara/pelumas tidak termasuk yang berubah",
    scopeCoverage: ["Scope 1", "Scope 3"],
    badge: "bg-purple-100 text-purple-700 border-purple-200",
  },
};

// ── LABEL MAPPING ──
export const ACTIVITY_LABELS: Record<string, string> = ACTIVITY_OPTIONS.reduce(
  (acc, cur) => { acc[cur.value] = cur.label; return acc; },
  {} as Record<string, string>
);