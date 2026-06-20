//hooks/useCarbonCalculation.ts
import { useState } from "react";

import { calculateEmission } from "@/app/services/carbon.service";
import { ReferenceKey } from "@/app/constants/activities";

import {
  ResultData,
  InputRow,
} from "@/app/types/carbon";

export function useCarbonCalculation() {
  const [loading, setLoading] = useState(false);

  const calculate = async (
    inputs: InputRow[],
    reference: ReferenceKey = "ESDM"
  ): Promise<ResultData> => {
    try {
      setLoading(true);

      return await calculateEmission(inputs, reference);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    calculate,
  };
}