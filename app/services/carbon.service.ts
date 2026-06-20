//services/carbon.service.ts
import { InputRow } from "@/app/types/carbon";
import { ReferenceKey } from "@/app/constants/activities";

const API_URL = "";

export async function calculateEmission(
  payload: InputRow[],
  reference: ReferenceKey = "ESDM"
) {
  try {
    const response = await fetch(
      `${API_URL}/api/hitung-emisi`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payload, reference }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    return response.json();
  } catch (error) {
    console.error("Carbon Service Error:", error);
    throw error;
  }
}