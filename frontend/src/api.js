const API_BASE = "http://localhost:8001";

export async function analyzeReportText(reportText) {
  const response = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ report_text: reportText }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Analysis failed");
  }

  return response.json();
}

export async function analyzeReportFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/analyze-file`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Analysis failed");
  }

  return response.json();
}