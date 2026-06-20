import {
  ACTIVITY_OPTIONS,
  ReferenceKey,
  getEmissionFactorValue,
} from "@/app/constants/activities";

export interface InputRow {
  aktivitas: string;
  detail_aktivitas?: string;
  periode?: string;
  jumlah: number;
}

// Fungsi pembantu untuk normalisasi string input (bebas spasi/huruf besar)
export function normalizeKey(text: string): string {
  return text.toLowerCase().trim().replace(/ /g, "_").replace(/-/g, "_");
}

export function prosesPerhitungan(
  dataInputs: InputRow[],
  reference: ReferenceKey = "ESDM"
) {
  const hasilPerhitungan: any[] = [];
  const summary: Record<string, number> = {
    "Scope 1 (Direct)": 0,
    "Scope 2 (Indirect - Energy)": 0,
    "Scope 3 (Value Chain)": 0,
  };

  // Mengubah array ACTIVITY_OPTIONS menjadi Key-Value Pair secara dinamis
  const faktorEmisiMap = ACTIVITY_OPTIONS.reduce((acc, curr) => {
    acc[curr.value] = curr;
    return acc;
  }, {} as Record<string, typeof ACTIVITY_OPTIONS[0]>);

  for (const item of dataInputs) {
    const key = normalizeKey(item.aktivitas);

    // Skip jika aktivitas tidak terdaftar di activities.ts
    if (!(key in faktorEmisiMap)) continue;

    const meta = faktorEmisiMap[key];
    const jumlah = Number(item.jumlah);

    // Ambil faktor sesuai referensi terpilih (dengan fallback otomatis jika null)
    const faktor = getEmissionFactorValue(meta, reference);

    // Rumus emisi standar ghg protocol: Emisi = Jumlah * Faktor Emisi
    const emisiKg = jumlah * faktor;
    const emisiTon = emisiKg / 1000;

    summary[meta.scope] += emisiTon;

    hasilPerhitungan.push({
      aktivitas: item.aktivitas,
      detail_aktivitas: item.detail_aktivitas || "",
      periode: item.periode || "",
      scope: meta.scope,
      kategori: meta.category,
      jumlah: jumlah,
      satuan: meta.unit,
      faktor_konversi: faktor,
      referensi: reference,
      emisi_kgCO2e: Number(emisiKg.toFixed(4)),
      emisi_tCO2e: Number(emisiTon.toFixed(4)),
    });
  }

  if (hasilPerhitungan.length === 0) {
    throw new Error("Tidak ada data aktivitas valid atau cocok dengan faktor emisi kami.");
  }

  const chartData = [
    { name: "Scope 1", value: Number(summary["Scope 1 (Direct)"].toFixed(4)), color: "#EF4444", deskripsi: "Bahan bakar langsung" },
    { name: "Scope 2", value: Number(summary["Scope 2 (Indirect - Energy)"].toFixed(4)), color: "#EAB308", deskripsi: "Konsumsi listrik" },
    { name: "Scope 3", value: Number(summary["Scope 3 (Value Chain)"].toFixed(4)), color: "#3B82F6", deskripsi: "Logistik & supply chain" },
  ];

  const totaltCO2e = Number(
    (summary["Scope 1 (Direct)"] + summary["Scope 2 (Indirect - Energy)"] + summary["Scope 3 (Value Chain)"]).toFixed(4)
  );

  return {
    total_tCO2e: totaltCO2e,
    detail: hasilPerhitungan,
    chartData: chartData,
  };
}