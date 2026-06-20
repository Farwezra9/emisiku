// app/constants/activities.ts
//
// ============================================================
// SISTEM MULTI-REFERENSI FAKTOR EMISI
// ============================================================
// Setiap activity memiliki 4 faktor berdasarkan referensi berbeda:
// ESDM, IPCC, DEFRA.
// null = referensi tersebut tidak menerbitkan faktor untuk aktivitas ini.
// ============================================================

export type ReferenceKey = "ESDM" | "IPCC"  | "DEFRA";

export interface EmissionFactors {
  ESDM: number | null;
  IPCC: number | null;
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
}

// Hasil pengambilan faktor: value yang dipakai, apakah hasil fallback, dan referensi asalnya
export interface EmissionFactorResult {
  value: number;
  isFallback: boolean;
  usedRef: ReferenceKey | null;
}

// Ambil faktor berdasarkan referensi yang dipilih.
// Jika null, fallback ke urutan prioritas: ESDM -> IPCC -> GHG_PROTOCOL -> DEFRA
export function getEmissionFactor(
  activity: ActivityOption,
  ref: ReferenceKey
): EmissionFactorResult {
  const fallbackOrder: ReferenceKey[] = ["ESDM", "IPCC", "DEFRA"];

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
    factors: { ESDM: 2.31, IPCC: 2.27, DEFRA: 2.31 },
    aliases: ["premium", "bensin premium", "bbm premium"],
  },
  {
    value: "pertalite",
    label: "Pertalite",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Fuel",
    factors: { ESDM: 2.31, IPCC: 2.27, DEFRA: 2.31 },
    aliases: ["pertalite", "bensin", "bensin kendaraan", "bbm", "bahan bakar"],
  },
  {
    value: "pertamax",
    label: "Pertamax",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Fuel",
    factors: { ESDM: 2.30, IPCC: 2.27,  DEFRA: 2.31 },
    aliases: ["pertamax", "bensin pertamax", "pertamax 92", "pertamax plus"],
  },
  {
    value: "solar",
    label: "Solar",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Fuel",
    factors: { ESDM: 2.68, IPCC: 2.68, DEFRA: 2.71 },
    aliases: ["solar", "bahan bakar solar", "hsd", "diesel fuel"],
  },
  {
    value: "bio_solar",
    label: "Bio Solar",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Fuel",
    factors: { ESDM: 2.54, IPCC: 1.74, DEFRA: 2.44 },
    aliases: ["bio solar", "biosolar", "b30", "b35"],
  },
  {
    value: "dexlite",
    label: "Dexlite",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Fuel",
    factors: { ESDM: 2.68, IPCC: 2.68, DEFRA: 2.71 },
    aliases: ["dexlite", "bbm dexlite"],
  },
  {
    value: "pertamina_dex",
    label: "Pertamina Dex",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Fuel",
    factors: { ESDM: 2.67, IPCC: 2.68, DEFRA: 2.71 },
    aliases: ["pertamina dex", "pertaminadex", "dex"],
  },
  {
    value: "lpg",
    label: "LPG",
    scope: "Scope 1 (Direct)",
    unit: "Kg",
    category: "Gas",
    factors: { ESDM: 3.02, IPCC: 2.98, DEFRA: 2.94 },
    aliases: ["lpg", "elpiji", "gas lpg", "tabung lpg"],
  },
  {
    value: "lng",
    label: "LNG",
    scope: "Scope 1 (Direct)",
    unit: "m3",
    category: "Gas",
    factors: { ESDM: 2.19, IPCC: 2.02, DEFRA: 2.07 },
    aliases: ["lng", "liquified natural gas", "gas alam cair"],
  },
  {
    value: "cng",
    label: "CNG",
    scope: "Scope 1 (Direct)",
    unit: "m3",
    category: "Gas",
    factors: { ESDM: 1.97, IPCC: 1.87, DEFRA: 1.89 },
    aliases: ["cng", "compressed natural gas", "bbt", "bahan bakar gas"],
  },
  {
    value: "gas_alam",
    label: "Gas Alam",
    scope: "Scope 1 (Direct)",
    unit: "m3",
    category: "Gas",
    factors: { ESDM: 1.97, IPCC: 1.87, DEFRA: 2.04 },
    aliases: ["gas alam", "gas bumi", "natural gas", "gas pipa"],
  },
  {
    value: "genset_diesel",
    label: "Genset Diesel",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Generator",
    factors: { ESDM: 2.68, IPCC: 2.70, DEFRA: 2.71 },
    aliases: ["genset diesel", "solar genset", "genset solar", "generator diesel"],
  },
  {
    value: "genset_bensin",
    label: "Genset Bensin",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Generator",
    factors: { ESDM: 2.31, IPCC: 2.30, DEFRA: 2.36 },
    aliases: ["genset bensin", "generator bensin", "bensin genset"],
  },
  {
    value: "batubara",
    label: "Batubara",
    scope: "Scope 1 (Direct)",
    unit: "Kg",
    category: "Industrial Fuel",
    factors: { ESDM: 2.42, IPCC: 2.38, DEFRA: 2.23 },
    aliases: ["batubara", "batu bara", "coal", "pembakaran batubara"],
  },
  {
    value: "pelumas",
    label: "Pelumas",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Industrial",
    factors: { ESDM: null, IPCC: 2.59, DEFRA: 2.72 },
    aliases: ["pelumas", "oli", "oil", "oli mesin", "pelumas mesin"],
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
    factors: { ESDM: 0.85, IPCC: 0.85, DEFRA: 0.85 },
    aliases: ["listrik pln", "listrik", "pln", "tagihan listrik", "konsumsi listrik", "daya listrik"],
  },
  {
    value: "listrik_solar_panel",
    label: "Listrik Solar Panel",
    scope: "Scope 2 (Indirect - Energy)",
    unit: "kWh",
    category: "Renewable Energy",
    factors: { ESDM: 0.00, IPCC: 0.05, DEFRA: 0.05 },
    aliases: ["listrik solar panel", "listrik panel surya", "listrik solar surya", "solar panel", "plts", "panel surya", "energi surya"],
  },
  {
    value: "listrik_hidro",
    label: "Listrik Hidro",
    scope: "Scope 2 (Indirect - Energy)",
    unit: "kWh",
    category: "Renewable Energy",
    factors: { ESDM: 0.00, IPCC: 0.02, DEFRA: 0.02 },
    aliases: ["listrik hidro", "pltah", "plta", "energi air", "hidroelektrik"],
  },
  {
    value: "listrik_angin",
    label: "Listrik Angin",
    scope: "Scope 2 (Indirect - Energy)",
    unit: "kWh",
    category: "Renewable Energy",
    factors: { ESDM: 0.00, IPCC: 0.01, DEFRA: 0.01 },
    aliases: ["listrik angin", "pltb angin", "turbin angin", "energi angin"],
  },

  // ══════════════════════════════════════════════════════════
  // SCOPE 3 — VALUE CHAIN
  // ══════════════════════════════════════════════════════════
  {
    value: "pesawat_domestik",
    label: "Pesawat Domestik",
    scope: "Scope 3 (Value Chain)",
    unit: "Km",
    category: "Transportation",
    factors: { ESDM: null, IPCC: 0.11, DEFRA: 0.15 },
    aliases: ["pesawat domestik", "perjalanan pesawat", "perjalanan dinas pesawat domestik", "penerbangan domestik", "pesawat", "flight domestik", "perjalanan dinas pesawat"],
  },
  {
    value: "pesawat_internasional",
    label: "Pesawat Internasional",
    scope: "Scope 3 (Value Chain)",
    unit: "Km",
    category: "Transportation",
    factors: { ESDM: null, IPCC: 0.13, DEFRA: 0.20 },
    aliases: ["pesawat internasional", "perjalanan dinas pesawat internasional", "penerbangan internasional", "flight internasional", "pesawat luar negeri"],
  },
  {
    value: "kereta",
    label: "Kereta",
    scope: "Scope 3 (Value Chain)",
    unit: "Km",
    category: "Transportation",
    factors: { ESDM: null, IPCC: 0.03, DEFRA: 0.04 },
    aliases: ["kereta", "kereta api", "kai", "krl", "mrt", "lrt", "perjalanan kereta"],
  },
  {
    value: "bus",
    label: "Bus",
    scope: "Scope 3 (Value Chain)",
    unit: "Km",
    category: "Transportation",
    factors: { ESDM: null, IPCC: 0.08, DEFRA: 0.10 },
    aliases: ["bus", "bis", "bus antar kota", "perjalanan bus", "angkutan bus"],
  },
  {
    value: "mobil_logistik",
    label: "Mobil Logistik",
    scope: "Scope 3 (Value Chain)",
    unit: "Km",
    category: "Logistics",
    factors: { ESDM: null, IPCC: 0.22, DEFRA: 0.23 },
    aliases: ["mobil logistik", "van logistik", "pickup", "pick up", "mobil box", "armada logistik"],
  },
  {
    value: "truk_logistik",
    label: "Truk Logistik",
    scope: "Scope 3 (Value Chain)",
    unit: "Km",
    category: "Logistics",
    factors: { ESDM: null, IPCC: 0.09, DEFRA: 0.08 },
    aliases: ["truk logistik", "truk", "truck", "truk kontainer", "fuso", "wingbox"],
  },
  {
    value: "kapal_logistik",
    label: "Kapal Logistik",
    scope: "Scope 3 (Value Chain)",
    unit: "Km",
    category: "Logistics",
    factors: { ESDM: null, IPCC: 0.010, DEFRA: 0.016 },
    aliases: ["kapal logistik", "kapal kargo", "cargo ship", "pengiriman laut", "kapal laut"],
  },
  {
    value: "sampah_organik",
    label: "Sampah Organik",
    scope: "Scope 3 (Value Chain)",
    unit: "Kg",
    category: "Waste",
    factors: { ESDM: null, IPCC: 0.45, DEFRA: 0.58 },
    aliases: ["sampah organik", "limbah organik", "sampah sisa makanan", "sampah dapur"],
  },
  {
    value: "sampah_anorganik",
    label: "Sampah Anorganik",
    scope: "Scope 3 (Value Chain)",
    unit: "Kg",
    category: "Waste",
    factors: { ESDM: null, IPCC: 0.05, DEFRA: 0.02 },
    aliases: ["sampah anorganik", "limbah anorganik", "sampah non organik", "sampah kering"],
  },
  {
    value: "limbah_b3",
    label: "Limbah B3",
    scope: "Scope 3 (Value Chain)",
    unit: "Kg",
    category: "Hazardous Waste",
    factors: { ESDM: null, IPCC: null, DEFRA: 1.11 },
    aliases: ["limbah b3", "sampah b3", "limbah berbahaya", "hazardous waste", "limbah kimia"],
  },
  {
    value: "kertas",
    label: "Kertas",
    scope: "Scope 3 (Value Chain)",
    unit: "Kg",
    category: "Office Material",
    factors: { ESDM: null, IPCC: null, DEFRA: 1.06 },
    aliases: ["kertas", "kertas a4", "penggunaan kertas", "pembelian kertas", "rim kertas", "paper"],
  },
  {
    value: "plastik",
    label: "Plastik",
    scope: "Scope 3 (Value Chain)",
    unit: "Kg",
    category: "Material",
    factors: { ESDM: null, IPCC: null, DEFRA: 3.14 },
    aliases: ["plastik", "kemasan plastik", "botol plastik", "plastic"],
  },
  {
    value: "karton",
    label: "Karton",
    scope: "Scope 3 (Value Chain)",
    unit: "Kg",
    category: "Packaging",
    factors: { ESDM: null, IPCC: null, DEFRA: 0.82 },
    aliases: ["karton", "kardus", "box karton", "packaging karton"],
  },
  {
    value: "air_bersih",
    label: "Air Bersih",
    scope: "Scope 3 (Value Chain)",
    unit: "m3",
    category: "Water",
    factors: { ESDM: null, IPCC: null, DEFRA: 0.344 },
    aliases: ["air bersih", "air pdam", "pdam", "konsumsi air", "penggunaan air"],
  },
  {
    value: "air_limbah",
    label: "Air Limbah",
    scope: "Scope 3 (Value Chain)",
    unit: "m3",
    category: "Wastewater",
    factors: { ESDM: null, IPCC: 0.60, DEFRA: 0.708 },
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
    url: "https://www.esdm.go.id/assets/media/content/content-faktor-emisi-bahan-bakar-minyak-bbm-dan-batubara.pdf",
    description: "Faktor Emisi BBM & Batubara Nasional Indonesia. Paling spesifik untuk konteks Indonesia.",
    lastUpdated: "Cek versi terbaru di esdm.go.id",
    scopeCoverage: ["Scope 1", "Scope 2"],
    badge: "bg-red-100 text-red-700 border-red-200",
  },
  IPCC: {
    label: "IPCC 2006 Guidelines",
    shortLabel: "IPCC 2006",
    url: "https://www.ipcc-nggip.iges.or.jp/public/2006gl/",
    description: "Panduan inventarisasi GRK nasional oleh IPCC. Default global Tier 1.",
    lastUpdated: "2006 (dengan 2019 Refinement)",
    scopeCoverage: ["Scope 1", "Scope 3 (transportasi & limbah)"],
    badge: "bg-blue-100 text-blue-700 border-blue-200",
  },
  DEFRA: {
    label: "UK DEFRA Conversion Factors",
    shortLabel: "DEFRA",
    url: "https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting",
    description: "Faktor konversi GRK dari pemerintah UK. Detail untuk material, limbah, dan transportasi.",
    lastUpdated: "Diperbarui tiap tahun (biasanya Juni)",
    scopeCoverage: ["Scope 1", "Scope 3"],
    badge: "bg-purple-100 text-purple-700 border-purple-200",
  },
};

// ── LABEL MAPPING ──
export const ACTIVITY_LABELS: Record<string, string> = ACTIVITY_OPTIONS.reduce(
  (acc, cur) => { acc[cur.value] = cur.label; return acc; },
  {} as Record<string, string>
);