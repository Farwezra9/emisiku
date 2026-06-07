"use client";

import { useMemo } from "react";
import { formatNumber } from "@/app/utils/format";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";

interface Props {
  chartData: any[];
}

export default function EmissionBarChart({ chartData }: Props) {
  console.log("EmissionBarChart Render:", chartData?.length);

  // Mengecek apakah data benar-benar kosong atau akumulasi semua value bernilai 0
  const isDataEmpty = useMemo(() => {
    if (!chartData || chartData.length === 0) return true;
    return chartData.every((item) => item.value === 0);
  }, [chartData]);

  if (isDataEmpty) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">
          Komparasi Batang
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
        Komparasi Batang
      </h3>

      <div className="h-72 min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
          <BarChart
            data={chartData}
            margin={{
              top: 10,
              right: 10,
              left: 0,
              bottom: 10,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />

            <XAxis dataKey="name" tickLine={false} fontSize={12} />

            <YAxis tickLine={false} fontSize={12} />

            <Tooltip />

            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}