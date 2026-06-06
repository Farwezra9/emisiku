const API_URL =
  "";

export async function importEmissionFile(
  file: File
) {
  const formData = new FormData();

  formData.append("file", file);

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