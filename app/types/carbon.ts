export interface InputRow {
  aktivitas: string;
  detail_aktivitas: string;
  periode: number;
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
  periode: number;
  scope: string;
  jumlah: number;
  satuan: string;
  emisi_tCO2e: number;
  emisi_kgCO2e?: number;
  faktor_konversi?: number;
  file_name?: string | null;
}

export interface ResultData {
  total_tCO2e: number;
  chartData: ChartItem[];
  detail: DetailOutput[];
}
export interface SummaryGHG {
  scope1: number;
  scope2: number;
  scope3: number;
  total: number;
}
