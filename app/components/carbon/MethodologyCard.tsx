"use client";

import { BookOpen, ExternalLink, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function MethodologyCard() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">

      {/* Header */}
      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
        <BookOpen size={18} className="text-emerald-600" />
        Cara Kami Menghitung
      </h3>

      {/* Penjelasan utama */}
      <div className="text-sm text-gray-600 leading-relaxed space-y-3">
        <p>
          Perhitungan di aplikasi ini mengikuti standar internasional yang paling umum dipakai perusahaan di seluruh dunia, yaitu{" "}
          <strong className="text-gray-900">GHG Protocol</strong>. Yang dihitung adalah semua aktivitas yang berada di
          bawah kendali operasional perusahaan kamu — kendaraan, listrik, sampah, dan sebagainya.
        </p>

        {/* Rumus inti */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-5 py-4 text-center space-y-1">
          <p className="text-[11px] text-emerald-600 font-semibold uppercase tracking-wider">Rumus :</p>
          <p className="font-mono text-sm text-gray-800">
            Emisi (kgCO₂e) = Jumlah Aktivitas (unit) × Faktor Emisi (kgCO₂e/unit)
          </p>
          <p className="font-mono text-sm text-gray-800">
            Emisi (tCO₂e) = Emisi (kgCO₂e) ÷ 1.000
          </p>
          <p className="text-[10px] text-emerald-600 mt-1">
            Misalnya: pakai 100 liter solar × 2,68 kg CO₂ per liter = 268 kg emisi. Semua angka dijaga presisi penuh
            selama proses hitung, baru dibulatkan di tampilan akhir — supaya hasilnya tidak meleset karena pembulatan berulang.
          </p>
        </div>
      </div>
      

      {/* Grid scope */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Scope 1 */}
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
            <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider">Scope 1 — Dari Aktivitas Sendiri</h4>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Emisi yang langsung dihasilkan perusahaan: bahan bakar kendaraan dinas, genset, atau mesin yang dibakar sendiri.
          </p>
          <div className="text-[11px] space-y-0.5 text-gray-500 font-mono">
            <p>Pertalite: <span className="text-gray-700 font-semibold">2,31</span> kg/Liter</p>
            <p>Solar: <span className="text-gray-700 font-semibold">2,68</span> kg/Liter</p>
            <p>LPG: <span className="text-gray-700 font-semibold">3,02</span> kg/Kg</p>
          </div>
          <p className="text-[10px] text-gray-400">Sumber angka: Kementerian ESDM &amp; IPCC</p>
        </div>

        {/* Scope 2 */}
        <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shrink-0" />
            <h4 className="text-xs font-bold text-yellow-700 uppercase tracking-wider">Scope 2 — Dari Listrik Beli</h4>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Emisi dari listrik yang dibeli dari PLN. Angkanya beda-beda tergantung lokasi pembangkit listriknya, jadi
            kami pisahkan per wilayah.
          </p>
          <div className="text-[11px] space-y-0.5 text-gray-500 font-mono">
            <p>Listrik PLN (Jawa-Bali): <span className="text-gray-700 font-semibold">0,85</span> kg/kWh</p>
            <p>Listrik PLN (Sumatera): <span className="text-gray-700 font-semibold">0,89</span> kg/kWh*</p>
            <p>Solar Panel / Air / Angin: <span className="text-gray-700 font-semibold">0,00</span> kg/kWh</p>
          </div>
          <p className="text-[10px] text-gray-400">Sumber angka: Kementerian ESDM RI</p>
        </div>

        {/* Scope 3 */}
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
            <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider">Scope 3 — Dari Pihak Lain</h4>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Emisi yang muncul karena aktivitas perusahaan, tapi dihasilkan pihak lain: perjalanan dinas, pengiriman barang, sampah, dan pemakaian air.
          </p>
          <div className="text-[11px] space-y-0.5 text-gray-500 font-mono">
            <p>Pesawat Domestik: <span className="text-gray-700 font-semibold">0,15</span> kg/km</p>
            <p>Sampah Organik: <span className="text-gray-700 font-semibold">0,58</span> kg/Kg</p>
            <p>Plastik: <span className="text-gray-700 font-semibold">3,14</span> kg/Kg</p>
          </div>
          <p className="text-[10px] text-gray-400">Sumber angka: DEFRA Pemerintah UK &amp; IPCC</p>
        </div>
      </div>

      {/* Faktor Grid Regional — verifikasi Sumatera */}
      <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 flex gap-3">
        <CheckCircle2 size={16} className="text-teal-600 shrink-0 mt-0.5" />
        <div className="text-xs text-teal-800 space-y-1.5">
          <p className="font-bold">✓ Listrik Sumatera (termasuk Lampung) sudah pakai angka resmi</p>
          <p className="text-teal-700 leading-relaxed">
            Kalau site kamu ada di Sumatera Selatan, Lampung, atau provinsi Sumatera lainnya, angka yang dipakai
            adalah <strong>0,89 kg CO₂ per kWh</strong> — bukan disamakan dengan listrik Jawa-Bali. Angka ini kami
            ambil dari data resmi pemerintah, bukan perkiraan.
          </p>
          <p className="text-amber-700 leading-relaxed">
            * Catatan kecil: angka listrik Jawa-Bali kami pakai data tahun 2020, sedangkan angka Sumatera dari data
            tahun 2017 (itu data resmi terbaru yang berhasil kami temukan). Kalau kamu butuh laporan untuk audit
            formal, sebaiknya cek dulu apakah ada data Sumatera yang lebih baru di situs resmi ESDM.
          </p>
        </div>
      </div>

      {/* GWP Basis - simplified */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div>
          <p className="font-bold text-gray-700 mb-1">Kenapa angkanya bisa beda-beda?</p>
          <p className="text-gray-500 leading-relaxed">
            Tiap lembaga (ESDM, IPCC, DEFRA) punya cara hitung sendiri yang sedikit berbeda, makanya angka faktor
            emisi untuk aktivitas yang sama bisa sedikit beda antar lembaga. Semua sudah dalam satuan yang sama
            (kg CO₂ setara), jadi tetap bisa dibandingkan dan dijumlahkan.
          </p>
        </div>
        <div>
          <p className="font-bold text-gray-700 mb-1">Soal Listrik</p>
          <p className="text-gray-500 leading-relaxed">
            Kami hitung berdasarkan rata-rata emisi pembangkit listrik di wilayah kamu (location-based). Kalau
            perusahaan kamu beli sertifikat energi hijau (REC) atau punya kontrak listrik bersih (PPA), itu belum
            dihitung terpisah di versi ini.
          </p>
        </div>
        <div>
          <p className="font-bold text-gray-700 mb-1">Soal Perjalanan</p>
          <p className="text-gray-500 leading-relaxed">
            Faktor pesawat, kereta, dan bus dihitung <strong>per orang per km</strong>, bukan per kendaraan. Jadi
            kalau 1 mobil isi 4 orang, emisinya tetap dihitung per penumpang sesuai standar internasional.
          </p>
        </div>
      </div>

      {/* Limitasi - simplified */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
        <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 space-y-1">
          <p className="font-bold">Hal yang perlu kamu tahu</p>
          <ul className="list-disc list-inside space-y-0.5 text-amber-700">
            <li>Saat ini baru ada angka listrik untuk wilayah <strong>Jawa-Bali</strong> dan <strong>Sumatera</strong>. Wilayah Kalimantan, Sulawesi, dan Indonesia Timur belum punya angka khusus.</li>
            <li>Angka listrik Jawa-Bali dan Sumatera diambil dari tahun yang berbeda (2020 vs 2017) — kemungkinan ada sedikit selisih kalau dibandingkan apple-to-apple.</li>
            <li>Perhitungan ini belum mencakup gas pendingin AC/kulkas (refrigerant), emisi dari proses produksi industri, dan perubahan tata guna lahan.</li>
            <li>Kategori Scope 3 yang sudah tersedia: perjalanan dinas, logistik, sampah, air, dan material kantor. Belum semua 15 kategori GHG Protocol tersedia.</li>
          </ul>
        </div>
      </div>

      {/* Referensi links */}
      <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-100 text-xs font-medium">
        <a href="https://ghgprotocol.org/corporate-standard" target="_blank" rel="noreferrer"
          className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 transition hover:underline">
          Standar GHG Protocol <ExternalLink size={11} />
        </a>
        <a href="https://gatrik.esdm.go.id/" target="_blank" rel="noreferrer"
          className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 transition hover:underline">
          Data ESDM RI <ExternalLink size={11} />
        </a>
        <a href="https://www.jcm.go.jp/id-jp/methodologies/128/attached_document1" target="_blank" rel="noreferrer"
          className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 transition hover:underline">
          Sumber Angka Listrik Sumatera <ExternalLink size={11} />
        </a>
        <a href="https://www.ipcc-nggip.iges.or.jp/public/2006gl/" target="_blank" rel="noreferrer"
          className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 transition hover:underline">
          Panduan IPCC <ExternalLink size={11} />
        </a>
        <a href="https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting" target="_blank" rel="noreferrer"
          className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 transition hover:underline">
          Data DEFRA UK <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}