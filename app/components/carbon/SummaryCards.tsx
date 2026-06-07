import SummaryCard from "./SummaryCard";

import { ResultData } from "@/app/types/carbon";

import { formatNumber } from "@/app/utils/format";

interface Props {
  resultData: ResultData;
}

export default function SummaryCards({
  resultData,
}: Props) {
  return (
    <div
      className="
      grid
      grid-cols-1
      sm:grid-cols-2
      xl:grid-cols-4
      gap-4
      "
    >
      <SummaryCard
        title="Total Emisi"
        value={`${formatNumber(
          resultData.total_tCO2e
        )} tCO₂e`}
      />

      {resultData.chartData.map((item) => (
        <SummaryCard
          key={item.name}
          title={item.name}
          value={`${formatNumber(item.value)} tco2e`}
          color={item.color}
        />
      ))}
    </div>
  );
}