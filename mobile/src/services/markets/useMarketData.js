import { useCallback, useEffect, useState } from "react";
import { applySecurityMaster } from "../../utils/nseSecurityMaster";
import { API_URL } from "../../config/apiConfig";

export default function useMarketData() {
  const [rows, setRows] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [error, setError] = useState("");
  const [provider, setProvider] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/prices`);

      if (!response.ok) {
        throw new Error("Market request failed.");
      }

      const json = await response.json();

      const list = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json?.prices)
        ? json.prices
        : [];

      const mastered = list
        .map(applySecurityMaster)
        .filter((x) => x.symbol)
        .sort((a, b) => String(a.symbol).localeCompare(String(b.symbol)));

      setRows(mastered);
      setConnected(true);
      setLastUpdated(json?.generatedAt || new Date().toISOString());
      setProvider(json?.provider || "");
    } catch (error) {
      console.log("Market data unavailable:", error.message);
      setRows([]);
      setConnected(false);
      setError(error.message || "Verified market prices are unavailable.");
      setProvider("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    rows,
    connected,
    loading,
    lastUpdated,
    provider,
    error,
    reload: load
  };
}
