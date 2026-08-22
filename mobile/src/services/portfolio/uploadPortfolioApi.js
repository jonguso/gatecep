import { API_URL } from "../../config/apiConfig";
import { getCurrentSession } from "../../auth/authStore";

export async function uploadConfirmedPortfolio(portfolio = [], tokenOverride = null) {
  const session = await getCurrentSession();

const token =
  tokenOverride ||
  session?.token ||
  session?.accessToken ||
  session?.user?.token ||
  session?.user?.accessToken;

  if (!token) {
    throw new Error("Authentication token missing");
  }

  const cleanPortfolio = (portfolio || []).filter((h) => {
    const symbol = String(h.symbol || "").trim().toUpperCase();
    const quantity = Number(h.quantity || 0);

    return symbol && symbol !== "N/A" && quantity > 0;
  });

  console.log(
    "Uploading confirmed portfolio:",
    cleanPortfolio.length,
    "valid of",
    portfolio.length
  );

  if (!cleanPortfolio.length) {
    throw new Error("No valid holdings to upload");
  }

  const response = await fetch(`${API_URL}/user-portfolio`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      holdings: cleanPortfolio
    })
  });

  const data = await response.json();

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "Unable to upload confirmed portfolio");
  }

  return data;
}

export async function replaceAuthoritativeBrokerPortfolio({ holdings = [], cashBalance, brokerAccountKey, tokenOverride = null } = {}) {
  const session = await getCurrentSession();
  const token = tokenOverride || session?.token || session?.accessToken || session?.user?.token || session?.user?.accessToken;
  if (!token) throw new Error("Authentication token missing");
  if (!brokerAccountKey) throw new Error("Verified broker account identity is required");

  const response = await fetch(`${API_URL}/user-portfolio/authoritative-snapshot`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ brokerAccountKey, holdings, cashBalance })
  });
  const data = await response.json();
  if (!response.ok || data?.ok === false) throw new Error(data?.error || "Unable to replace the authoritative broker portfolio");
  return data;
}
