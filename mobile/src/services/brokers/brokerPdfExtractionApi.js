import { Platform } from "react-native";
import { API_URL } from "../../config/apiConfig";
import { getCurrentSession } from "../../auth/authStore";
import { getStoredAccessToken } from "../../features/auth/storage/authStorage";

async function accessToken() {
  const session = await getCurrentSession();
  return session?.token || session?.accessToken || session?.user?.token ||
    session?.user?.accessToken || await getStoredAccessToken();
}

export async function extractBrokerPdf(file, reportType) {
  const token = await accessToken();
  if (!token) throw new Error("Your session expired. Log in before uploading broker evidence.");

  const form = new FormData();
  form.append("reportType", reportType);
  if (Platform.OS === "web" && file.file) form.append("file", file.file, file.name);
  else form.append("file", { uri: file.uri, name: file.name, type: "application/pdf" });

  const response = await fetch(`${API_URL}/broker-reports/extract-pdf`, {
    method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error || "The broker PDF could not be extracted.");
  return data;
}
