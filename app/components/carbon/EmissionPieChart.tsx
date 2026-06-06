"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

interface Props {
  chartData: any[];
  total: number;
}

export default function EmissionPieChart({ chartData, total }: Props) {
  console.log("EmissionPieChart Render:", chartData?.length);

  // Mengecek apakah akumulasi semua value bernilai 0 atau totalnya masih 0
  const isDataEmpty = useMemo(() => {
    if (!chartData || chartData.length === 0) return true;
    return chartData.every((item) => item.value === 0) || total === 0;
  }, [chartData, total]);

  if (isDataEmpty) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">
          Distribusi Emisi
        </h3>

        <div className="h-72 flex items-center justify-center text-gray-400 text-sm font-medium">
          Tidak Ada Data
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">
        Distribusi Emisi
      </h3>

      <div className="h-72 min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>

            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        {chartData.map((item, i) => (
          <div key={i} className="text-center">
            <div
              className="font-bold text-sm"
              style={{
                color: item.color,
              }}
            >
              {item.name}
            </div>

            <div className="text-xs text-gray-500">
              {total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}