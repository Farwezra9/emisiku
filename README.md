# 🌱 Emisiku

**Emisiku** adalah aplikasi web kalkulator emisi gas rumah kaca (GRK) untuk perusahaan di Indonesia. Aplikasi ini menghitung jejak karbon berdasarkan **Scope 1, 2, dan 3** dengan pilihan **referensi faktor emisi** (ESDM, IPCC, GHG Protocol, DEFRA) dan rumus perhitungan yang transparan.

![Next.js](https://img.shields.io/badge/Next.js-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)

---

## ✨ Fitur

- **Perhitungan emisi Scope 1, 2, dan 3** dari data aktivitas (BBM, listrik, transportasi, limbah, dll.)
- **Selektor referensi faktor emisi**: ESDM, IPCC, GHG Protocol, dan DEFRA, dapat dipilih per perhitungan
- **Input data aktivitas** lewat form dengan validasi dua lapis, atau **impor dari Excel**
- **Laporan baris yang dilewati** saat impor, supaya tidak ada data yang hilang tanpa diketahui
- **Ekspor Excel format flat** yang kompatibel dengan Tableau untuk analisis lanjutan
- **Penyimpanan data** di Supabase (PostgreSQL)

---

## 🧮 Metodologi Perhitungan

### Rumus dasar

```
Emisi (kg CO₂e) = Data Aktivitas × Faktor Emisi
```

Emisi total per scope dijumlahkan dari seluruh sumber emisi. Nilai antara dijaga pada presisi penuh dan pembulatan hanya dilakukan saat ditampilkan.

### Bahan bakar minyak (BBM)

Faktor emisi nasional ESDM tersedia dalam satuan energi (ton CO₂/TJ) dan nilai kalor netto (TJ/Gg). Untuk mendapatkan faktor per liter, Emisiku memakai konversi berikut:

```
FE (kg CO₂/liter) = (FE_nasional × NCV / 1000) × ρ
```

| Simbol | Keterangan | Sumber |
|---|---|---|
| `FE_nasional` | Faktor emisi CO₂ (ton CO₂/TJ) | Tabel FE & NCV ESDM |
| `NCV` | Nilai kalor netto (TJ/Gg) | Tabel FE & NCV ESDM |
| `ρ` | Berat jenis BBM pada 15 °C (kg/L) | Spesifikasi BBM (SK Dirjen Migas) |

**Contoh: Pertamax (RON 92)**

- FE = 69,04 ton CO₂/TJ, NCV = 44,61 TJ/Gg
- Berat jenis spesifikasi 715–770 kg/m³, titik tengah ≈ 0,7425 kg/L
- FE per liter = (69,04 × 44,61 / 1000) × 0,7425 ≈ **2,29 kg CO₂/liter**

> Berat jenis pada spesifikasi berupa rentang (min–max). Jika tersedia, gunakan nilai aktual hasil uji laboratorium.

### Listrik (Scope 2, location-based)

```
Emisi (kg CO₂e) = Konsumsi listrik (kWh) × Faktor emisi grid (kg CO₂e/kWh)
```

Faktor emisi grid PLN mengacu pada Kepmen ESDM No. 163.K/HK.02/MEM.S/2021 (mis. Jamali 0,87 dan Sumatera 0,93 kg CO₂e/kWh).

### CO₂ ekuivalen

```
CO₂e = Σ (Emisi gas × GWP gas)
```

<!-- TODO: sebutkan versi GWP yang dipakai (mis. IPCC AR5 / AR6) -->

---

## 📚 Referensi Faktor Emisi

| Referensi | Dipakai untuk | Tautan |
|---|---|---|
| **ESDM** | FE & NCV nasional BBM, gas, batubara | [Dokumen FE BBM & Batubara](https://www.esdm.go.id/assets/media/content/content-faktor-emisi-bahan-bakar-minyak-bbm-dan-batubara.pdf) |
| **Kepmen ESDM 163.K/HK.02/MEM.S/2021** | Faktor emisi grid ketenagalistrikan (PLN) | [JDIH ESDM](https://jdih.esdm.go.id) |
| **Spesifikasi BBM (Ditjen Migas)** | Berat jenis BBM untuk konversi ke per liter | [Spesifikasi Produk BBM, BBN & LPG](https://onesolution.pertamina.com/Product/Download?filename=20201201035120atc_spesifikasi.pdf) |
| **DEFRA / DESNZ (2026)** | Faktor konversi GRK (BBM, transportasi, limbah, dll.) | [GOV.UK GHG Conversion Factors](https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting) |
| **IPCC** | Faktor emisi default dan rentang ketidakpastian | [IPCC EFDB](https://www.ipcc-nggip.iges.or.jp/EFDB/main.php) |
| **GHG Protocol** | Kerangka Scope 1/2/3 dan panduan perhitungan | [ghgprotocol.org](https://ghgprotocol.org) |

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org) + TypeScript
- **Database & Backend**: [Supabase](https://supabase.com) (PostgreSQL)
- **Impor/Ekspor**: Excel (`.xlsx`), format flat untuk Tableau

---

## 🚀 Memulai

### Prasyarat

- Node.js 18+
- Akun [Supabase](https://supabase.com) dan sebuah project

### Instalasi

```bash
git clone https://github.com/<username>/emisiku.git
cd emisiku
npm install
```

### Konfigurasi environment

Buat file `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

### Setup database

Jalankan skema SQL dan seed faktor emisi di Supabase (SQL Editor atau migrasi):

```bash
# contoh, sesuaikan dengan struktur repo
supabase db push
```

### Menjalankan aplikasi

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

---

## 📁 Struktur Proyek

> Sesuaikan dengan struktur repo yang sebenarnya.

```
emisiku/
├── app/                # Halaman & API routes (Next.js)
├── components/         # Komponen UI (InputForm, EmissionTable, dll.)
├── hooks/              # Custom hooks
├── lib/                # Service layer, util (excelUtils, kalkulasi)
├── supabase/           # Skema & seed faktor emisi
└── public/
```

---

## ⚠️ Catatan & Keterbatasan

- **Risiko double-counting Scope 1 dan 3** pada sumber transportasi perlu diperhatikan saat mengisi data.
- **Faktor emisi grid bersifat statis** dan belum bervariasi per tahun. Pembaruan tahunan masih direncanakan.
- **CO₂ biogenik** dari campuran biodiesel (mis. Bio Solar) belum diungkapkan terpisah.
- Penanganan **faktor campuran BBM nabati (bio-blend)** dan **satuan LNG/CNG** masih dalam penyempurnaan.

---

## 🗺️ Roadmap

- [ ] Pembaruan faktor emisi grid per tahun
- [ ] Dukungan bio-blend dan pengungkapan CO₂ biogenik
- [ ] Klarifikasi satuan LNG/CNG
- [ ] Dashboard visualisasi emisi

---

## 🤝 Kontribusi

Pull request dan issue sangat diterima. Untuk perubahan besar, silakan buka issue terlebih dahulu.

## 📄 Lisensi

<!-- TODO: pilih lisensi, mis. MIT -->

## 👤 Penulis

**Fazal** — [GitHub](https://github.com/<username>)
