// app/constants/activities.ts
//
// ============================================================
// SISTEM MULTI-REFERENSI FAKTOR EMISI
// ============================================================
// Setiap activity memiliki 3 faktor berdasarkan referensi berbeda:
// ESDM, IPCC, DEFRA.
// null = referensi tersebut tidak menerbitkan faktor untuk aktivitas ini.
// ============================================================

export type ReferenceKey = "ESDM" | "IPCC" | "DEFRA";

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
// Jika null, fallback ke urutan prioritas: ESDM -> IPCC -> DEFRA
//
// Urutan ini sengaja: ESDM paling spesifik untuk konteks Indonesia dan jadi
// rujukan legal di banyak regulasi domestik. IPCC jadi fallback kedua (bukan
// DEFRA) karena regulasi GRK Indonesia (Permen LHK soal inventarisasi GRK)
// dibangun di atas metodologi IPCC. DEFRA jadi fallback terakhir, dipakai
// terutama untuk kategori yang tidak punya angka siap-pakai di ESDM/IPCC
// (material kantor, limbah per-jenis, air, transportasi per-km).
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

// Basis GWP (Global Warming Potential) yang dipakai oleh masing-masing
// referensi saat menerbitkan faktor emisinya. Ini metadata informasional
// (GWP sudah "dipanggang" ke dalam faktor oleh lembaga penerbit, bukan
// dihitung ulang oleh aplikasi ini).
//
// KOREKSI (diverifikasi ulang Juni 2026): label "AR4 (IPCC 2007)" untuk
// ESDM/IPCC pada versi sebelumnya TIDAK didukung sumber primer dan sudah
// diperbaiki. Dua dokumen resmi yang dicek:
//   1. KLHK, "Pedoman Penyelenggaraan Inventarisasi GRK Nasional", Buku II
//      Vol. 3 (AFOLU) — tabel GWP eksplisit mencantumkan CH4=23, N2O=296,
//      bersumber dari "IPCC Third Assessment Report (2001)" (TAR), bukan AR4.
//   2. Laporan Inventarisasi GRK Provinsi Bali (2025, dokumen resmi daerah
//      mengikuti pedoman KLHK) — menyatakan eksplisit GWP yang dipakai
//      "mengikuti Laporan Penilaian Kedua IPCC", yaitu Second Assessment
//      Report (SAR, 1995).
// Kedua dokumen ini tidak konsisten satu sama lain (SAR vs TAR), tapi
// sama-sama menunjukkan basis GWP nasional Indonesia jauh lebih lawas dari
// AR4 — kemungkinan karena pedoman teknis GRK Indonesia mewarisi konvensi
// pelaporan UNFCCC lama (Decision 17/CP.8) yang mewajibkan SAR, dan belum
// semua dokumen turunan diperbarui secara seragam. KESIMPULAN: basis GWP
// ESDM/IPCC versi Indonesia TIDAK BISA diklaim tunggal sebagai SAR atau TAR
// secara pasti tanpa mengecek dokumen spesifik yang dipakai per laporan —
// yang BISA dipastikan adalah BUKAN AR4. Catatan tambahan: dokumen sumber
// faktor BBM/batubara ESDM ("Nilai Faktor Emisi (FE) CO2 Nasional") secara
// eksplisit hanya menerbitkan faktor CO2 murni (CO2 only), bukan CO2e
// gabungan CO2+CH4+N2O — sehingga basis GWP secara ketat tidak berlaku untuk
// entri tersebut sama sekali (GWP cuma relevan kalau ada gas non-CO2 yang
// dikonversi). Pelabelan unit "kg CO2e" untuk entri ber-sumber ESDM BBM
// adalah simplifikasi yang umum dipakai praktisi (karena CO2 mendominasi
// >99% total CO2e pembakaran bahan bakar), bukan kesalahan fatal, tapi
// sebaiknya didokumentasikan sebagai pendekatan, bukan presisi penuh.
//
// DEFRA tetap terverifikasi solid: workbook resmi (Introduction tab, baris
// 35) menyatakan eksplisit basis AR5 (2013), dan ini konsisten dari rilis
// 2025 ke rilis 2026 (perubahan besar 2026 hanya di listrik/rel/EV, tidak
// menyentuh metodologi GWP).
export function getGwpBasisLabel(usedRef: ReferenceKey | null): string {
  if (usedRef === "DEFRA") return "AR5 (IPCC 2013)";
  if (usedRef === "ESDM" || usedRef === "IPCC")
    return "SAR/TAR (bervariasi per dokumen — bukan AR4, perlu cek dokumen spesifik)";
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
    // Dipilih varian 100% mineral (bukan "average biofuel blend" 2,075) karena
    // Premium tidak diwajibkan campuran etanol seperti bensin UK.
    // CATATAN VERIFIKASI (Jun 2026): nilai DEFRA ini tidak termasuk kategori
    // yang disebut berubah pada rilis 2026 (lihat Major Changes Report —
    // hanya listrik/rel/EV), jadi kemungkinan besar masih valid, tapi belum
    // dicek cell-by-cell ke workbook xlsx resmi (tidak bisa diakses langsung
    // dari sandbox ini). ESDM/IPCC: dokumen sumber ESDM menerbitkan FE per TJ
    // + NCV per Gg (bukan langsung per liter); konversi ke kg/liter butuh
    // tabel densitas BBM yang tidak tersedia di dokumen itu, sehingga angka
    // 2,31 di sini belum independently reproducible dari sumber primer.
    factors: { ESDM: 2.31, IPCC: 2.27, DEFRA: 2.35 },
    needsVerification: true,
    aliases: ["premium", "bensin premium", "bbm premium"],
  },
  {
    value: "pertalite",
    label: "Pertalite",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Fuel",
    factors: { ESDM: 2.31, IPCC: 2.27, DEFRA: 2.35 },
    needsVerification: true,
    aliases: ["pertalite", "bensin", "bensin kendaraan", "bbm", "bahan bakar"],
  },
  {
    value: "pertamax",
    label: "Pertamax",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Fuel",
    factors: { ESDM: 2.30, IPCC: 2.27, DEFRA: 2.35 },
    needsVerification: true,
    aliases: ["pertamax", "bensin pertamax", "pertamax 92", "pertamax plus"],
  },
  {
    value: "solar",
    label: "Solar",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Fuel",
    // DEFRA: kategori "Diesel (100% mineral diesel)" = 2,66155 kg CO2e/liter.
    factors: { ESDM: 2.68, IPCC: 2.68, DEFRA: 2.66 },
    needsVerification: true,
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
    // Tidak representatif — DEFRA dikosongkan, fallback ke ESDM/IPCC.
    factors: { ESDM: 2.54, IPCC: 1.74, DEFRA: null },
    needsVerification: true,
    aliases: ["bio solar", "biosolar", "b30", "b35"],
  },
  {
    value: "dexlite",
    label: "Dexlite",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Fuel",
    factors: { ESDM: 2.68, IPCC: 2.68, DEFRA: 2.66 },
    needsVerification: true,
    aliases: ["dexlite", "bbm dexlite"],
  },
  {
    value: "pertamina_dex",
    label: "Pertamina Dex",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Fuel",
    factors: { ESDM: 2.67, IPCC: 2.68, DEFRA: 2.66 },
    needsVerification: true,
    aliases: ["pertamina dex", "pertaminadex", "dex"],
  },
  {
    value: "lpg",
    label: "LPG",
    scope: "Scope 1 (Direct)",
    unit: "Kg",
    category: "Gas",
    // Terverifikasi cocok: DEFRA LPG tonnes 2939,36 / 1000 = 2,939 ≈ 2,94.
    factors: { ESDM: 3.02, IPCC: 2.98, DEFRA: 2.94 },
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
    // regasifikasi (m3) — perlu konfirmasi sebelum diisi. DEFRA dikosongkan,
    // fallback ke ESDM/IPCC yang sudah tervalidasi terhadap dokumen ESDM.
    factors: { ESDM: 2.19, IPCC: 2.02, DEFRA: null },
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
    // untuk CNG tanpa asumsi densitas gas terkompresi (tidak dipublikasikan
    // langsung). DEFRA dikosongkan, fallback ke ESDM/IPCC.
    factors: { ESDM: 1.97, IPCC: 1.87, DEFRA: null },
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
    factors: { ESDM: 1.97, IPCC: 1.87, DEFRA: 2.05 },
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
    factors: { ESDM: 2.68, IPCC: 2.70, DEFRA: 2.76 },
    needsVerification: true,
    aliases: ["genset diesel", "solar genset", "genset solar", "generator diesel"],
  },
  {
    value: "genset_bensin",
    label: "Genset Bensin",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Generator",
    factors: { ESDM: 2.31, IPCC: 2.30, DEFRA: 2.35 },
    needsVerification: true,
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
    // CATATAN TAMBAHAN (Jun 2026): dokumen sumber ESDM membagi batubara jadi
    // 4 kelas kalor (rendah/sedang/tinggi/tinggi sekali) dengan FE & NCV
    // berbeda-beda per kelas — hasil konversi kasar ke kg CO2/kg yang saya
    // hitung dari tabel itu berkisar ~1,6–2,7 kg CO2/kg tergantung kelas
    // kalor yang dipakai, jadi nilai tunggal 2,42 di sini perlu dipastikan
    // mengacu ke kelas kalor batubara yang mana (kemungkinan "tinggi sekali"
    // atau campuran spesifik) — bukan otomatis salah, tapi harus didokumentasikan
    // kelas kalor mana yang dipakai sebagai basis.
    factors: { ESDM: 2.42, IPCC: 2.38, DEFRA: 2.42 },
    needsVerification: true,
    aliases: ["batubara", "batu bara", "coal", "pembakaran batubara"],
  },
  {
    value: "pelumas",
    label: "Pelumas",
    scope: "Scope 1 (Direct)",
    unit: "Liter",
    category: "Industrial",
    // Terverifikasi: DEFRA "Lubricants", litres = 2,74934 ≈ 2,75.
    factors: { ESDM: null, IPCC: 2.59, DEFRA: 2.75 },
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
    
    factors: { ESDM: null, IPCC: 0.87, DEFRA: 0.72 },
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
    // IPCC/DEFRA dikosongkan — tidak ada faktor grid Indonesia dari sumber itu.
    // TERVERIFIKASI ULANG (20 Jun 2026): dicek langsung ke halaman resmi
    // gatrik.esdm.go.id (kategori "Faktor Emisi Pembangkit Listrik") — per
    // tanggal cek, dokumen "Faktor Emisi GRK Tahun 2019" MASIH dokumen
    // terbaru yang dipublikasikan resmi (belum ada rilis 2020 dst). Jadi
    // nilai ini BUKAN data usang yang ketinggalan update — ini memang angka
    // resmi paling mutakhir yang tersedia sampai saat ini.
    factors: { ESDM: 0.87, IPCC: null, DEFRA: null },
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
    // Sumber sama dengan Jamali di atas.
    // CM Ex-Ante (OM 0,5 / BM 0,5), grid Sumatera = 0,93 ton CO2/MWh.
    // TERVERIFIKASI ULANG (20 Jun 2026): sama seperti grid Jamali di atas —
    // dokumen 2019 (Kepmen 2021) ini memang masih yang terbaru secara resmi
    // per saat ini, bukan vintage data yang perlu "dikejar update"-nya.
    // needsVerification dihapus karena sudah dikonfirmasi tidak ada versi
    // lebih baru yang tersedia.
    factors: { ESDM: 0.93, IPCC: null, DEFRA: null },
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
    scope: "Scope 1 (Direct - On-site Generation)",
    unit: "kWh",
    category: "Renewable Energy",
    // Produksi Listrik Mandiri dari Panel Surya (Energi Terbarukan Internal).
    // Faktor emisi operasional = 0 karena tidak ada pembakaran bahan bakar
    // saat menghasilkan listrik dari sinar matahari. Konsisten dengan
    // listrik_hidro & listrik_angin di bawah. (Nilai 0,93 sebelumnya keliru —
    // itu adalah faktor Combined Margin untuk proyek CDM/JCM yang menjual
    // listrik ke grid PLN, bukan untuk listrik yang diproduksi & dipakai sendiri.)
    factors: { ESDM: 0.00, IPCC: 0.00, DEFRA: 0.00 },
    aliases: [
      "listrik solar panel", "listrik panel surya", "listrik solar surya", "solar panel",
      "plts", "panel surya", "energi surya",
      "produksi listrik mandiri", "produksi listrik mandiri dari panel surya",
      "energi terbarukan internal", "pembangkit mandiri panel surya",
    ],
  },
  {
    value: "listrik_hidro",
    label: "Listrik Hidro",
    scope: "Scope 1 (Direct - On-site Generation)",
    unit: "kWh",
    category: "Renewable Energy",
    factors: { ESDM: 0.00, IPCC: 0.00, DEFRA: 0.00 },
    aliases: ["listrik hidro", "pltah", "plta", "energi air", "hidroelektrik"],
  },
  {
    value: "listrik_angin",
    label: "Listrik Angin",
    scope: "Scope 1 (Direct - On-site Generation)",
    unit: "kWh",
    category: "Renewable Energy",
    factors: { ESDM: 0.00, IPCC: 0.00, DEFRA: 0.00 },
    aliases: ["listrik angin", "pltb angin", "turbin angin", "energi angin"],
  },

  // ══════════════════════════════════════════════════════════
  // SCOPE 3 — VALUE CHAIN
  // ══════════════════════════════════════════════════════════
  // CATATAN ATRIBUSI: kolom "IPCC" pada beberapa entri di bawah ini (transportasi,
  // limbah) belum diverifikasi terhadap dokumen 2006 IPCC Guidelines secara
  // langsung. IPCC 2006 tidak menerbitkan angka siap-pakai per-km atau per-kg
  // untuk kategori ini — metodologinya butuh beberapa parameter tambahan
  // (mis. DOC, MCF untuk limbah). Nilai di bawah kemungkinan berasal dari
  // kalkulator/database pihak ketiga, bukan langsung dari IPCC. Belum diubah
  // karena belum dicek ulang ke sumber primer — direkomendasikan verifikasi
  // lanjutan kalau dipakai untuk laporan formal/audit.
  {
    value: "pesawat_domestik",
    label: "Pesawat Domestik",
    scope: "Scope 3 (Value Chain)",
    unit: "Km",
    category: "Transportation",
    factors: { ESDM: null, IPCC: 0.11, DEFRA: 0.15 },
    needsVerification: true,
    aliases: ["pesawat domestik", "perjalanan pesawat", "perjalanan dinas pesawat domestik", "penerbangan domestik", "pesawat", "flight domestik", "perjalanan dinas pesawat"],
  },
  {
    value: "pesawat_internasional",
    label: "Pesawat Internasional",
    scope: "Scope 3 (Value Chain)",
    unit: "Km",
    category: "Transportation",
    factors: { ESDM: null, IPCC: 0.13, DEFRA: 0.20 },
    needsVerification: true,
    aliases: ["pesawat internasional", "perjalanan dinas pesawat internasional", "penerbangan internasional", "flight internasional", "pesawat luar negeri"],
  },
  {
    value: "kereta",
    label: "Kereta",
    scope: "Scope 3 (Value Chain)",
    unit: "Km",
    category: "Transportation",
    factors: { ESDM: null, IPCC: 0.03, DEFRA: 0.04 },
    needsVerification: true,
    aliases: ["kereta", "kereta api", "kai", "krl", "mrt", "lrt", "perjalanan kereta"],
  },
  {
    value: "bus",
    label: "Bus",
    scope: "Scope 3 (Value Chain)",
    unit: "Km",
    category: "Transportation",
    factors: { ESDM: null, IPCC: 0.08, DEFRA: 0.10 },
    needsVerification: true,
    aliases: ["bus", "bis", "bus antar kota", "perjalanan bus", "angkutan bus"],
  },
  {
    value: "mobil_logistik",
    label: "Mobil Logistik",
    scope: "Scope 3 (Value Chain)",
    unit: "Km",
    category: "Logistics",
    factors: { ESDM: null, IPCC: 0.22, DEFRA: 0.23 },
    needsVerification: true,
    aliases: ["mobil logistik", "van logistik", "pickup", "pick up", "mobil box", "armada logistik"],
  },
  {
    value: "truk_logistik",
    label: "Truk Logistik",
    scope: "Scope 3 (Value Chain)",
    unit: "Km",
    category: "Logistics",
    factors: { ESDM: null, IPCC: 0.09, DEFRA: 0.08 },
    needsVerification: true,
    aliases: ["truk logistik", "truk", "truck", "truk kontainer", "fuso", "wingbox"],
  },
  {
    value: "kapal_logistik",
    label: "Kapal Logistik",
    scope: "Scope 3 (Value Chain)",
    unit: "Km",
    category: "Logistics",
    factors: { ESDM: null, IPCC: 0.010, DEFRA: 0.016 },
    needsVerification: true,
    aliases: ["kapal logistik", "kapal kargo", "cargo ship", "pengiriman laut", "kapal laut"],
  },
  {
    value: "sampah_organik",
    label: "Sampah Organik",
    scope: "Scope 3 (Value Chain)",
    unit: "Kg",
    category: "Waste",
    factors: { ESDM: null, IPCC: 0.45, DEFRA: 0.58 },
    needsVerification: true,
    aliases: ["sampah organik", "limbah organik", "sampah sisa makanan", "sampah dapur"],
  },
  {
    value: "sampah_anorganik",
    label: "Sampah Anorganik",
    scope: "Scope 3 (Value Chain)",
    unit: "Kg",
    category: "Waste",
    factors: { ESDM: null, IPCC: 0.05, DEFRA: 0.02 },
    needsVerification: true,
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
    description: "Panduan inventarisasi GRK nasional oleh IPCC. Default global Tier 1. Masih berlaku — belum ada revisi resmi pengganti.",
    lastUpdated: "2006, dengan 2019 Refinement (masih versi terkini per Juni 2026)",
    scopeCoverage: ["Scope 1", "Scope 3 (transportasi & limbah)"],
    badge: "bg-blue-100 text-blue-700 border-blue-200",
  },
  DEFRA: {
    label: "UK DESNZ/DEFRA Conversion Factors",
    shortLabel: "DEFRA",
    // Halaman koleksi ini selalu memuat rilis tahunan terbaru (2026 dirilis
    // 11 Juni 2026, menggantikan rilis 2025). Pakai halaman ini, bukan link
    // publikasi tahun tertentu, karena URL publikasi per-tahun kadang berubah.
    url: "https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting",
    description: "Faktor konversi GRK dari pemerintah UK (DESNZ, sebelumnya DEFRA/BEIS). Detail untuk material, limbah, dan transportasi.",
    lastUpdated: "2026 (DESNZ, dirilis 11 Juni 2026, dikonfirmasi via gov.uk) — perubahan besar rilis 2026 hanya pada faktor listrik/rel/EV (turun ~26% untuk listrik), faktor bahan bakar/gas/batubara/pelumas TIDAK termasuk yang berubah",
    scopeCoverage: ["Scope 1", "Scope 3"],
    badge: "bg-purple-100 text-purple-700 border-purple-200",
  },
};

// ── LABEL MAPPING ──
export const ACTIVITY_LABELS: Record<string, string> = ACTIVITY_OPTIONS.reduce(
  (acc, cur) => { acc[cur.value] = cur.label; return acc; },
  {} as Record<string, string>
);