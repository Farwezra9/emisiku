//services/import.service.ts
import { ReferenceKey } from "@/app/constants/activities";

const API_URL = "";

export async function importEmissionFile(
  file: File,
  reference: ReferenceKey = "ESDM"
) {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("reference", reference);

  const response = await fetch(
    `${API_URL}/api/import-file`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(
      "Failed import emission file"
    );
  }

  return response.json();
}