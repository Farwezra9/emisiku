"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

interface DetailOutput {
  scope: string;
  periode: number;
  emisi_tCO2e: number;
}

interface Props {
  detail: DetailOutput[];
}

export default function EmissionLineChart({ detail }: Props) {
  // Mengelompokkan emisi berdasarkan periode waktu (X-Axis)
  const formattedData = useMemo(() => {
    const group: Record<string, { name: string; "Scope 1": number; "Scope 2": number; "Scope 3": number }> = {};

   detail.forEach((item) => {
  const periode = item.periode
    ? String(item.periode)
    : "Lainnya";

  if (!group[periode]) {
    group[periode] = {
      name: periode,
      "Scope 1": 0,
      "Scope 2": 0,
      "Scope 3": 0,
    };
  }

  if (item.scope.includes("Scope 1")) {
    group[periode]["Scope 1"] += item.emisi_tCO2e;
  } else if (item.scope.includes("Scope 2")) {
    group[periode]["Scope 2"] += item.emisi_tCO2e;
  } else if (item.scope.includes("Scope 3")) {
    group[periode]["Scope 3"] += item.emisi_tCO2e;
  }
});

    // Urutkan berdasarkan string periode agar urut secara kronologis di chart
    return Object.values(group).sort((a, b) => a.name.localeCompare(b.name));
  }, [detail]);

  if (!detail?.length) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Tren Emisi Berkala</h3>
        <div className="h-72 flex items-center justify-center text-gray-400">Tidak ada data</div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Tren Emisi Berkala</h3>

      <div className="h-72 min-w-0">
        <ResponsiveContainer width="100%" height="100%" minHeight={280}>
          <LineChart data={formattedData} margin={{ top: 10, right: 20, left: -20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
            <XAxis dataKey="name" tickLine={false} fontSize={12} stroke="#9CA3AF" />
            <YAxis tickLine={false} fontSize={12} stroke="#9CA3AF" />
           <Tooltip 
  contentStyle={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #E5E7EB" }}
  formatter={(value: any) => {
    // Pastikan nilai divalidasi ke format angka sebelum di-toFixed
    const numValue = typeof value === "number" ? value : parseFloat(value) || 0;
    return [`${numValue.toFixed(4)} tCO₂e`, "Emisi"];
  }}
/>
            <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
            
            <Line type="monotone" dataKey="Scope 1" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="Scope 2" stroke="#EAB308" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="Scope 3" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}