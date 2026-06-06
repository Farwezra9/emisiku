export interface InputRow {
  aktivitas: string;
  detail_aktivitas: string;
  periode?: string;
  jumlah: number;
}

export interface ChartItem {
  name: string;
  value: number;
  color: string;
  deskripsi: string;
}

export interface DetailOutput {
  aktivitas: string;
  detail_aktivitas?: string;
  periode?: string;
  scope: string;
  jumlah: number;
  satuan: string;
  emisi_tCO2e: number;
  emisi_kgCO2e?: number;
  faktor_konversi?: number;
}

export interface ResultData {
  total_tCO2e: number;
  chartData: ChartItem[];
  detail: DetailOutput[];
}