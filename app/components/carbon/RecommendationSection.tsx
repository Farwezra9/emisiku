"use client";

import {
  CheckCircle2,
  Lightbulb,
} from "lucide-react";

import {
  ACTIVITY_LABELS,
} from "@/app/constants/activities";

interface DetailOutput {
  aktivitas: string;
  emisi_tCO2e: number;
}

interface Props {
  detail: DetailOutput[];
}

const rekomendasiMitigasi: Record<
  string,
  {
    judul: string;
    tips: string[];
  }
> = {
  // ==================================================
  // FUEL
  // ==================================================

  premium: {
    judul:
      "Efisiensi Konsumsi Premium",
    tips: [
      "Kurangi idle kendaraan.",
      "Gunakan eco-driving.",
      "Pertimbangkan migrasi ke BBM rendah emisi.",
    ],
  },

  pertalite: {
    judul:
      "Optimalisasi Konsumsi Pertalite",
    tips: [
      "Gunakan kendaraan hemat bahan bakar.",
      "Kurangi perjalanan tidak perlu.",
      "Lakukan servis kendaraan berkala.",
    ],
  },

  pertamax: {
    judul:
      "Efisiensi Penggunaan Pertamax",
    tips: [
      "Optimalkan rute operasional.",
      "Gunakan kendaraan hybrid.",
      "Lakukan monitoring konsumsi BBM.",
    ],
  },

  solar: {
    judul:
      "Efisiensi Solar/Diesel",
    tips: [
      "Gunakan biosolar bila memungkinkan.",
      "Lakukan maintenance mesin rutin.",
      "Kurangi beban kendaraan berlebih.",
    ],
  },

  bio_solar: {
    judul:
      "Optimalisasi Biosolar",
    tips: [
      "Pantau efisiensi konsumsi bahan bakar.",
      "Gunakan kendaraan logistik efisien.",
      "Minimalkan perjalanan kosong.",
    ],
  },

  dexlite: {
    judul:
      "Pengurangan Emisi Dexlite",
    tips: [
      "Gunakan mesin diesel modern.",
      "Kurangi akselerasi agresif.",
      "Optimalkan distribusi logistik.",
    ],
  },

  pertamina_dex: {
    judul:
      "Efisiensi Pertamina Dex",
    tips: [
      "Lakukan eco-driving.",
      "Gunakan armada rendah emisi.",
      "Pantau penggunaan BBM secara berkala.",
    ],
  },

  // ==================================================
  // GAS
  // ==================================================

  lpg: {
    judul:
      "Efisiensi Penggunaan LPG",
    tips: [
      "Periksa kebocoran gas secara rutin.",
      "Gunakan peralatan hemat energi.",
      "Optimalkan penggunaan boiler/gas.",
    ],
  },

  lng: {
    judul:
      "Optimalisasi LNG",
    tips: [
      "Minimalkan kebocoran gas.",
      "Lakukan maintenance sistem gas.",
      "Gunakan teknologi efisiensi energi.",
    ],
  },

  cng: {
    judul:
      "Efisiensi CNG",
    tips: [
      "Optimalkan tekanan distribusi gas.",
      "Lakukan inspeksi berkala.",
      "Gunakan kendaraan CNG efisien.",
    ],
  },

  gas_alam: {
    judul:
      "Efisiensi Gas Alam",
    tips: [
      "Gunakan burner efisiensi tinggi.",
      "Kurangi pemborosan energi panas.",
      "Lakukan audit energi rutin.",
    ],
  },

  // ==================================================
  // GENERATOR
  // ==================================================

  genset_diesel: {
    judul:
      "Optimalisasi Genset Diesel",
    tips: [
      "Kurangi penggunaan genset saat tidak diperlukan.",
      "Gunakan listrik PLN atau energi terbarukan.",
      "Lakukan servis berkala.",
    ],
  },

  genset_bensin: {
    judul:
      "Efisiensi Genset Bensin",
    tips: [
      "Matikan genset saat idle.",
      "Gunakan genset sesuai kapasitas.",
      "Pertimbangkan solar panel.",
    ],
  },

  // ==================================================
  // INDUSTRIAL
  // ==================================================

  batubara: {
    judul:
      "Pengurangan Emisi Batubara",
    tips: [
      "Kurangi konsumsi batubara bertahap.",
      "Migrasi ke energi bersih.",
      "Gunakan teknologi boiler efisien.",
    ],
  },

  pelumas: {
    judul:
      "Efisiensi Penggunaan Pelumas",
    tips: [
      "Gunakan pelumas ramah lingkungan.",
      "Kurangi kebocoran mesin.",
      "Lakukan maintenance berkala.",
    ],
  },

  // ==================================================
  // ELECTRICITY
  // ==================================================

  listrik_pln: {
    judul:
      "Efisiensi Konsumsi Listrik",
    tips: [
      "Gunakan lampu LED.",
      "Matikan perangkat idle.",
      "Gunakan sensor otomatis.",
    ],
  },

  listrik_solar_panel: {
    judul:
      "Optimalisasi Solar Panel",
    tips: [
      "Bersihkan panel secara berkala.",
      "Maksimalkan penggunaan energi siang hari.",
      "Gunakan baterai penyimpanan energi.",
    ],
  },

  listrik_hidro: {
    judul:
      "Efisiensi Energi Hidro",
    tips: [
      "Lakukan maintenance turbin.",
      "Optimalkan distribusi energi.",
      "Pantau efisiensi sistem.",
    ],
  },

  listrik_angin: {
    judul:
      "Optimalisasi Energi Angin",
    tips: [
      "Lakukan maintenance turbin angin.",
      "Optimalkan penyimpanan energi.",
      "Pantau performa energi berkala.",
    ],
  },

  // ==================================================
  // TRANSPORTATION
  // ==================================================

  pesawat_domestik: {
    judul:
      "Pengurangan Emisi Penerbangan Domestik",
    tips: [
      "Gunakan meeting online.",
      "Gabungkan jadwal perjalanan.",
      "Prioritaskan transportasi darat bila memungkinkan.",
    ],
  },

  pesawat_internasional: {
    judul:
      "Efisiensi Perjalanan Internasional",
    tips: [
      "Kurangi perjalanan tidak penting.",
      "Gunakan konferensi virtual.",
      "Offset emisi penerbangan.",
    ],
  },

  kereta: {
    judul:
      "Optimalisasi Transportasi Kereta",
    tips: [
      "Prioritaskan kereta dibanding pesawat.",
      "Gabungkan perjalanan bisnis.",
      "Gunakan transportasi publik.",
    ],
  },

  bus: {
    judul:
      "Efisiensi Transportasi Bus",
    tips: [
      "Gunakan bus massal dibanding kendaraan pribadi.",
      "Optimalkan rute perjalanan.",
      "Kurangi perjalanan kosong.",
    ],
  },

  // ==================================================
  // LOGISTICS
  // ==================================================

  mobil_logistik: {
    judul:
      "Efisiensi Mobil Logistik",
    tips: [
      "Optimalkan rute distribusi.",
      "Kurangi perjalanan kosong.",
      "Gunakan kendaraan rendah emisi.",
    ],
  },

  truk_logistik: {
    judul:
      "Efisiensi Truk Logistik",
    tips: [
      "Gunakan sistem manajemen armada.",
      "Lakukan maintenance rutin.",
      "Optimalkan kapasitas muatan.",
    ],
  },

  kapal_logistik: {
    judul:
      "Efisiensi Kapal Logistik",
    tips: [
      "Optimalkan jadwal pengiriman.",
      "Gunakan bahan bakar rendah sulfur.",
      "Kurangi idle pelabuhan.",
    ],
  },

  // ==================================================
  // WASTE
  // ==================================================

  sampah_organik: {
    judul:
      "Pengelolaan Sampah Organik",
    tips: [
      "Lakukan komposting.",
      "Kurangi food waste.",
      "Pisahkan sampah organik.",
    ],
  },

  sampah_anorganik: {
    judul:
      "Pengurangan Sampah Anorganik",
    tips: [
      "Tingkatkan program daur ulang.",
      "Kurangi penggunaan plastik sekali pakai.",
      "Pisahkan sampah anorganik.",
    ],
  },

  limbah_b3: {
    judul:
      "Pengelolaan Limbah B3",
    tips: [
      "Gunakan vendor pengolah limbah resmi.",
      "Kurangi penggunaan bahan berbahaya.",
      "Lakukan penyimpanan limbah sesuai standar.",
    ],
  },

  // ==================================================
  // MATERIAL
  // ==================================================

  kertas: {
    judul:
      "Pengurangan Penggunaan Kertas",
    tips: [
      "Gunakan dokumen digital.",
      "Cetak dua sisi.",
      "Gunakan kertas daur ulang.",
    ],
  },

  plastik: {
    judul:
      "Pengurangan Plastik",
    tips: [
      "Gunakan reusable packaging.",
      "Kurangi plastik sekali pakai.",
      "Tingkatkan program recycle.",
    ],
  },

  karton: {
    judul:
      "Efisiensi Penggunaan Karton",
    tips: [
      "Gunakan karton daur ulang.",
      "Optimalkan ukuran packaging.",
      "Reuse karton pengiriman.",
    ],
  },

  // ==================================================
  // WATER
  // ==================================================

  air_bersih: {
    judul:
      "Efisiensi Penggunaan Air Bersih",
    tips: [
      "Perbaiki kebocoran air.",
      "Gunakan alat hemat air.",
      "Lakukan monitoring konsumsi air.",
    ],
  },

  air_limbah: {
    judul:
      "Pengelolaan Air Limbah",
    tips: [
      "Gunakan instalasi pengolahan air limbah.",
      "Kurangi pencemaran air.",
      "Reuse air hasil treatment.",
    ],
  },
};

export default function RecommendationSection({
  detail,
}: Props) {
  const aktivitasTerinput =
    Array.from(
      new Set(
        detail
          .filter(
            (item) =>
              item.emisi_tCO2e > 0
          )
          .map((item) =>
            item.aktivitas
              .toLowerCase()
              .trim()
          )
      )
    );

  if (
    aktivitasTerinput.length === 0
  )
    return null;

  return (
    <div
      className="
      bg-emerald-50
      border
      border-emerald-100
      p-6
      rounded-2xl
      shadow-sm
      "
    >
      <h3
        className="
        text-sm
        font-bold
        text-emerald-900
        uppercase
        mb-6
        flex
        items-center
        gap-2
        "
      >
        <Lightbulb
          size={18}
          className="text-emerald-600"
        />

        Rekomendasi Dekarbonisasi
      </h3>

      <div
        className="
        grid
        grid-cols-1
        md:grid-cols-2
        gap-4
        "
      >
        {aktivitasTerinput.map(
          (slug) => {
            const data =
              rekomendasiMitigasi[
                slug
              ];

            if (!data)
              return null;

            return (
              <div
                key={slug}
                className="
                bg-white
                p-4
                rounded-xl
                border
                border-emerald-200
                "
              >
                <div
                  className="
                  flex
                  items-center
                  gap-2
                  mb-2
                  text-emerald-800
                  font-semibold
                  text-sm
                  "
                >
                  <CheckCircle2
                    size={16}
                  />

                  {
                    ACTIVITY_LABELS[
                      slug
                    ]
                  }
                </div>

                <div
                  className="
                  text-xs
                  text-emerald-700
                  mb-3
                  "
                >
                  {data.judul}
                </div>

                <ul
                  className="
                  space-y-2
                  text-xs
                  text-gray-600
                  "
                >
                  {data.tips.map(
                    (
                      tip,
                      idx
                    ) => (
                      <li
                        key={idx}
                        className="
                        flex
                        gap-2
                        "
                      >
                        <span>
                          •
                        </span>

                        <span>
                          {tip}
                        </span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}