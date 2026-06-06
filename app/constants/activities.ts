// app/constants/activities.ts

export const ACTIVITY_OPTIONS = [
  // ======================================================
  // SCOPE 1
  // ======================================================

  {
    value: "premium",
    label: "Premium",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Fuel",
    factor: 2.31,
  },

  {
    value: "pertalite",
    label: "Pertalite",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Fuel",
    factor: 2.31,
  },

  {
    value: "pertamax",
    label: "Pertamax",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Fuel",
    factor: 2.31,
  },

  {
    value: "solar",
    label: "Solar",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Fuel",
    factor: 2.68,
  },

  {
    value: "bio_solar",
    label: "Bio Solar",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Fuel",
    factor: 2.54,
  },

  {
    value: "dexlite",
    label: "Dexlite",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Fuel",
    factor: 2.68,
  },

  {
    value: "pertamina_dex",
    label: "Pertamina Dex",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Fuel",
    factor: 2.68,
  },

  {
    value: "lpg",
    label: "LPG",
    scope: "Scope 1 (Direct)",
    unit: "Kg",
    category: "Gas",
    factor: 2.98,
  },

  {
    value: "lng",
    label: "LNG",
    scope: "Scope 1 (Direct)",
    unit: "m3",
    category: "Gas",
    factor: 2.75,
  },

  {
    value: "cng",
    label: "CNG",
    scope: "Scope 1 (Direct)",
    unit: "m3",
    category: "Gas",
    factor: 2.75,
  },

  {
    value: "gas_alam",
    label: "Gas Alam",
    scope: "Scope 1 (Direct)",
    unit: "m3",
    category: "Gas",
    factor: 2.75,
  },

  {
    value: "genset_diesel",
    label: "Genset Diesel",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Generator",
    factor: 2.68,
  },

  {
    value: "genset_bensin",
    label: "Genset Bensin",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Generator",
    factor: 2.31,
  },

  {
    value: "batubara",
    label: "Batubara",
    scope: "Scope 1 (Direct)",
    unit: "Kg",
    category: "Industrial Fuel",
    factor: 2.42,
  },

  {
    value: "pelumas",
    label: "Pelumas",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Industrial",
    factor: 2.90,
  },

  // ======================================================
  // SCOPE 2
  // ======================================================

  {
    value: "listrik_pln",
    label: "Listrik PLN",
    scope: "Scope 2 (Indirect - Energy)",
    unit: "kWh",
    category: "Electricity",
    factor: 0.85,
  },

  {
    value: "listrik_solar_panel",
    label: "Listrik Solar Panel",
    scope: "Scope 2 (Indirect - Energy)",
    unit: "kWh",
    category: "Renewable Energy",
    factor: 0.05,
  },

  {
    value: "listrik_hidro",
    label: "Listrik Hidro",
    scope: "Scope 2 (Indirect - Energy)",
    unit: "kWh",
    category: "Renewable Energy",
    factor: 0.02,
  },

  {
    value: "listrik_angin",
    label: "Listrik Angin",
    scope: "Scope 2 (Indirect - Energy)",
    unit: "kWh",
    category: "Renewable Energy",
    factor: 0.01,
  },

  // ======================================================
  // SCOPE 3
  // ======================================================

  {
    value: "pesawat_domestik",
    label: "Pesawat Domestik",
    scope: "Scope 3 (Value Chain)",
    unit: "Km",
    category: "Transportation",
    factor: 0.12,
  },

  {
    value: "pesawat_internasional",
    label: "Pesawat Internasional",
    scope: "Scope 3 (Value Chain)",
    unit: "Km",
    category: "Transportation",
    factor: 0.15,
  },

  {
    value: "kereta",
    label: "Kereta",
    scope: "Scope 3 (Value Chain)",
    unit: "Km",
    category: "Transportation",
    factor: 0.04,
  },

  {
    value: "bus",
    label: "Bus",
    scope: "Scope 3 (Value Chain)",
    unit: "Km",
    category: "Transportation",
    factor: 0.10,
  },

  {
    value: "mobil_logistik",
    label: "Mobil Logistik",
    scope: "Scope 3 (Value Chain)",
    unit: "Km",
    category: "Logistics",
    factor: 0.21,
  },

  {
    value: "truk_logistik",
    label: "Truk Logistik",
    scope: "Scope 3 (Value Chain)",
    unit: "Km",
    category: "Logistics",
    factor: 0.27,
  },

  {
    value: "kapal_logistik",
    label: "Kapal Logistik",
    scope: "Scope 3 (Value Chain)",
    unit: "Km",
    category: "Logistics",
    factor: 0.015,
  },

  {
    value: "sampah_organik",
    label: "Sampah Organik",
    scope: "Scope 3 (Value Chain)",
    unit: "Kg",
    category: "Waste",
    factor: 0.50,
  },

  {
    value: "sampah_anorganik",
    label: "Sampah Anorganik",
    scope: "Scope 3 (Value Chain)",
    unit: "Kg",
    category: "Waste",
    factor: 0.20,
  },

  {
    value: "limbah_b3",
    label: "Limbah B3",
    scope: "Scope 3 (Value Chain)",
    unit: "Kg",
    category: "Hazardous Waste",
    factor: 1.80,
  },

  {
    value: "kertas",
    label: "Kertas",
    scope: "Scope 3 (Value Chain)",
    unit: "Kg",
    category: "Office Material",
    factor: 1.30,
  },

  {
    value: "plastik",
    label: "Plastik",
    scope: "Scope 3 (Value Chain)",
    unit: "Kg",
    category: "Material",
    factor: 2.50,
  },

  {
    value: "karton",
    label: "Karton",
    scope: "Scope 3 (Value Chain)",
    unit: "Kg",
    category: "Packaging",
    factor: 0.94,
  },

  {
    value: "air_bersih",
    label: "Air Bersih",
    scope: "Scope 3 (Value Chain)",
    unit: "m3",
    category: "Water",
    factor: 0.344,
  },

  {
    value: "air_limbah",
    label: "Air Limbah",
    scope: "Scope 3 (Value Chain)",
    unit: "m3",
    category: "Wastewater",
    factor: 0.708,
  },
];

export const ACTIVITY_LABELS: Record<
  string,
  string
> = {
  premium:
    "Bahan bakar kendaraan Premium",

  pertalite:
    "Bahan bakar kendaraan Pertalite",

  pertamax:
    "Bahan bakar kendaraan Pertamax",

  solar:
    "Bahan bakar kendaraan Solar",

  bio_solar:
    "Bahan bakar Bio Solar",

  dexlite:
    "Bahan bakar Dexlite",

  pertamina_dex:
    "Bahan bakar Pertamina Dex",

  lpg:
    "Liquified Petroleum Gas",

  lng:
    "Liquified Natural Gas",

  cng:
    "Compressed Natural Gas",

  gas_alam:
    "Gas alam industri",

  genset_diesel:
    "Operasional genset diesel",

  genset_bensin:
    "Operasional genset bensin",

  batubara:
    "Pembakaran batubara industri",

  pelumas:
    "Penggunaan pelumas mesin",

  listrik_pln:
    "Konsumsi listrik PLN",

  listrik_solar_panel:
    "Energi listrik solar panel",

  listrik_hidro:
    "Energi listrik hidro",

  listrik_angin:
    "Energi listrik tenaga angin",

  pesawat_domestik:
    "Perjalanan pesawat domestik",

  pesawat_internasional:
    "Perjalanan pesawat internasional",

  kereta:
    "Transportasi kereta",

  bus:
    "Transportasi bus",

  mobil_logistik:
    "Distribusi mobil logistik",

  truk_logistik:
    "Distribusi truk logistik",

  kapal_logistik:
    "Distribusi kapal logistik",

  sampah_organik:
    "Sampah organik",

  sampah_anorganik:
    "Sampah anorganik",

  limbah_b3:
    "Limbah bahan berbahaya",

  kertas:
    "Penggunaan kertas",

  plastik:
    "Penggunaan plastik",

  karton:
    "Penggunaan karton",

  air_bersih:
    "Konsumsi air bersih",

  air_limbah:
    "Pengolahan air limbah",
};