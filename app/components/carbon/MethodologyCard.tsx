"use client";

import { BookOpen, ExternalLink } from "lucide-react";

export default function MethodologyCard() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
        <BookOpen size={18} className="text-emerald-600" />
        Metodologi & Referensi Standar
      </h3>

      <div className="text-sm text-gray-600 leading-relaxed space-y-4">
        <p>
          Sistem kalkulasi ini dirancang menggunakan basis kerangka kerja{" "}
          <strong className="text-gray-900">GHG Protocol (Greenhouse Gas Protocol) Corporate Standard</strong>. 
          Pendekatan perhitungan menggunakan metode batasan kendali operasional (*Operational Control Boundary*).
        </p>
        
        <p>
          Rumus konversi mengikuti perhitungan matematis standar internasional:
        </p>

        {/* Rumus matematika dibungkus ke kontainer statis agar aman dari compiler TypeScript */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center font-mono my-3 overflow-x-auto text-gray-800 text-xs leading-relaxed">
  <span className="font-bold text-emerald-700">Total Emisi (tCO₂e)</span> = 
  {" "}(Data Aktivitas × Faktor Konversi) 
</div>

       <p>
  Demi menyajikan laporan yang ringkas, seluruh kalkulasi emisi otomatis dikonversi 
  langsung ke dalam satuan metrik <strong className="text-gray-900">Ton setara Karbondioksida (tCO₂e)</strong>. 
  Hal ini memastikan hasil perhitungan siap digunakan untuk standar pelaporan industri dan audit keberlanjutan.
</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col justify-between">
    <div>
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
        Scope 1 & Scope 3 (BBM, Gas, & Rantai Pasok)
      </h4>
     <p className="text-xs text-gray-600 leading-relaxed">
  Koefisien faktor konversi emisi langsung Scope 1 seperti BBM kendaraan cair (Pertalite: <span className="font-semibold">0.00231 tCO₂e/liter</span>, Solar: <span className="font-semibold">0.00268 tCO₂e/liter</span>) disarikan dari <strong className="text-gray-800">IPCC Guidelines</strong>. Sementara untuk aktivitas rantai pasok Scope 3 seperti perjalanan dinas (Pesawat Domestik: <span className="font-semibold">0.00012 tCO₂e/km</span>) dan material kantor merujuk pada standar <strong className="text-gray-800">Defra Standards (UK)</strong>.
</p>
    </div>
  </div>

  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col justify-between">
    <div>
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
        Scope 2 (Konsumsi Listrik Tidak Langsung)
      </h4>
      <p className="text-xs text-gray-600 leading-relaxed">
        Faktor emisi jaringan ketenagalistrikan umum menggunakan nilai koefisien basis rata-rata interkoneksi grid nasional <strong className="text-gray-800">Jamali (Jawa-Madura-Bali)</strong> sebesar <span className="font-semibold">0.00085 tCO₂e/kWh</span>, merujuk pada ketetapan data mutakhir dari <strong className="text-gray-800">Direktorat Jenderal Ketenagalistrikan Kementerian ESDM RI</strong>.
      </p>
    </div>
  </div>
</div>

<div className="flex flex-wrap gap-5 mt-6 pt-4 border-t border-gray-100 text-xs font-medium">
  <a
    href="https://ghgprotocol.org/"
    target="_blank"
    rel="noreferrer"
    className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 transition-colors hover:underline"
  >
    GHG Protocol Corporate Standard
    <ExternalLink size={12} />
  </a>

  <a
    href="https://gatrik.esdm.go.id/"
    target="_blank"
    rel="noreferrer"
    className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 transition-colors hover:underline"
  >
    Ditjen Gatrik Kementerian ESDM
    <ExternalLink size={12} />
  </a>

  {/* Menambahkan referensi resmi Defra UK untuk validasi data Scope 3 */}
  <a
    href="https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting"
    target="_blank"
    rel="noreferrer"
    className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 transition-colors hover:underline"
  >
    Defra UK Carbon Factors
    <ExternalLink size={12} />
  </a>
</div>
    </div>
  );
}