import { useCallback, useEffect, useState } from "react";
import { NSE_SECURITIES, applySecurityMaster } from "../../utils/nseSecurityMaster";
import { API_URL } from "../../config/apiConfig";

export default function useMarketData() {
  const [rows, setRows] = useState([]);
  const [verifiedRows, setVerifiedRows] = useState([]);
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

      const verifiedBySymbol = new Map(
        list
          .map(applySecurityMaster)
          .filter((x) => x.symbol && Number(x.price || x.lastPrice || 0) > 0)
          .map((row) => [row.symbol, row])
      );

      const mastered = NSE_SECURITIES
        .map((security) => {
          const verified = verifiedBySymbol.get(security.symbol);

          if (verified) {
            return {
              ...verified,
              hasVerifiedPrice: true
            };
          }

          return {
            ...security,
            price: null,
            lastPrice: null,
            prevClose: null,
            change: null,
            changePct: null,
            volume: null,
            turnover: null,
            bid: null,
            ask: null,
            hasLivePrice: false,
            hasVerifiedPrice: false,
            priceSource: null,
            quotedAt: null
          };
        })
        .sort((a, b) => String(a.symbol).localeCompare(String(b.symbol)));

      setRows(mastered);
      setVerifiedRows(
        mastered.filter(
          (row) =>
            row?.hasVerifiedPrice === true &&
            Number(row?.price ?? row?.lastPrice ?? 0) > 0
        )
      );
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
    verifiedRows,
    connected,
    loading,
    lastUpdated,
    provider,
    error,
    reload: load
  };
}
