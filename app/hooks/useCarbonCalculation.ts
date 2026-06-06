import { useState } from "react";

import { calculateEmission } from "@/app/services/carbon.service";

import {
  ResultData,
  InputRow,
} from "@/app/types/carbon";

export function useCarbonCalculation() {
  const [loading, setLoading] =
    useState(false);

  const calculate = async (
    inputs: InputRow[]
  ): Promise<ResultData> => {
    try {
      setLoading(true);

      return await calculateEmission(inputs);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    calculate,
  };
}