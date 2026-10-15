import { getCurrentSession } from "../../auth/authStore";
import { userGetItem, userSetItem } from "../../auth/userStorage";
import { getStoredAccessToken } from "../auth/storage/authStorage";
import { loadPortfolio, savePortfolio } from "../../services/portfolio/portfolioStore";
import { replaceAuthoritativeBrokerPortfolio } from "../../services/portfolio/uploadPortfolioApi";
import { loadUnifiedPortfolio } from "../../services/portfolio/unifiedPortfolioApi";
import { refreshCanonicalRealPortfolioSnapshot } from "../../services/portfolio/portfolioSnapshotTrigger";
import { addBrokerSyncAuditEvent } from "./brokerSyncAuditStore";
import { isVerifiedRealBrokerMirror } from "./brokerSyncService";
import {
  loadBrokerAccountEvidence,
  removeBrokerAccountEvidence
} from "./brokerAccountEvidenceStore";

function money(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

function holdingsValue(holdings = []) {
  return money(holdings.reduce((sum, item) => sum + Number(item?.marketValue ?? item?.value ?? 0), 0));
}

export async function loadAuthoritativeBrokerSnapshotPreview({
  brokerAccountKey
} = {}) {
  const normalizedAccountKey =
    String(brokerAccountKey || "").trim().toUpperCase();

  if (!normalizedAccountKey) {
    return null;
  }
  const mirror = await loadBrokerAccountEvidence(normalizedAccountKey);
  if (!isVerifiedRealBrokerMirror(mirror) || mirror?.cashEvidenceAvailable !== true) return null;

  const currentHoldings = await loadPortfolio({ revalue: false });
  const currentCash = money(await userGetItem("availableCash"));
  const nextHoldings = Array.isArray(mirror.holdings) ? mirror.holdings : [];

  return {
    mirror,
    current: { holdingsCount: currentHoldings.length, holdingsValue: holdingsValue(currentHoldings), cash: currentCash },
    next: { holdingsCount: nextHoldings.length, holdingsValue: holdingsValue(nextHoldings), cash: money(mirror.cashBalance) }
  };
}

export async function adoptVerifiedBrokerSnapshot({
  brokerAccountKey
} = {}) {
  const preview = await loadAuthoritativeBrokerSnapshotPreview({
    brokerAccountKey
  });
  if (!preview) throw new Error("Verified valuation and matching cash evidence are required.");

  const { mirror, current, next } = preview;
  const previousHoldings = await loadPortfolio({ revalue: false });
  const previousCash = await userGetItem("availableCash");
  const session = await getCurrentSession();
  const token = session?.token || session?.accessToken || session?.user?.token || session?.user?.accessToken || await getStoredAccessToken();
  if (!token) throw new Error("Session expired. Please log in again.");

  try {
    const authoritativeHoldings = mirror.holdings.map((holding) => ({
      ...holding,
      broker: mirror.brokerAccountKey,
      source: "AUTHORITATIVE_BROKER_SNAPSHOT"
    }));
    const normalizedAccountKey = String(
      mirror.brokerAccountKey || ""
    ).trim().toUpperCase();

    const preservedHoldings = previousHoldings.filter(
      (holding) =>
        String(
          holding?.brokerAccountKey ??
          holding?.broker ??
          ""
        ).trim().toUpperCase() !== normalizedAccountKey
    );

    await savePortfolio([
      ...preservedHoldings,
      ...authoritativeHoldings
    ]);
    const replacement = await replaceAuthoritativeBrokerPortfolio({
      holdings: authoritativeHoldings,
      cashBalance: next.cash,
      brokerAccountKey: mirror.brokerAccountKey,
      tokenOverride: token
    });
    if (Number(replacement?.count) !== authoritativeHoldings.length) {
      throw new Error("Backend replacement count does not match the verified broker snapshot.");
    }

    const adoptedAt = new Date().toISOString();
    await userSetItem("LatestAuthoritativeBrokerSnapshot", JSON.stringify({
      adoptedAt,
      brokerId: mirror.brokerId,
      tradingAccount: mirror.tradingAccount,
      cdsNumber: mirror.cdsNumber,
      brokerAccountKey: mirror.brokerAccountKey,
      valuationFileName: mirror.evidenceFileName || mirror.fileName,
      cashFileName: mirror.cashEvidenceFileName,
      holdingsCount: next.holdingsCount,
      holdingsValue: next.holdingsValue,
      cashBalance: next.cash
    }));
    await addBrokerSyncAuditEvent({
      type: "BROKER_SNAPSHOT_ADOPTED",
      broker: mirror.brokerId || mirror.broker,
      accountName: mirror.accountName,
      status: "ADOPTED",
      classification: "BROKER_SOURCE_OF_TRUTH",
      brokerTotal: next.holdingsValue + next.cash,
      gatecepTotal: current.holdingsValue + current.cash,
      difference: next.holdingsValue + next.cash - current.holdingsValue - current.cash,
      cashDifference: next.cash - current.cash,
      holdingsCount: next.holdingsCount,
      matched: 0,
      mismatched: 0,
      missingAtBroker: 0,
      extraAtBroker: 0,
      issues: []
    });
    const canonicalPortfolio = await loadUnifiedPortfolio({
      broker: "ALL"
    });

    const combinedAvailableCash =
      Number(canonicalPortfolio?.availableCash);

    if (!Number.isFinite(combinedAvailableCash)) {
      throw new Error(
        "Canonical combined broker cash is unavailable after authoritative replacement."
      );
    }

    await userSetItem(
      "availableCash",
      String(combinedAvailableCash)
    );

    await refreshCanonicalRealPortfolioSnapshot({
      reason: "AUTHORITATIVE_BROKER_SNAPSHOT_ADOPTED"
    });

    await removeBrokerAccountEvidence(
      normalizedAccountKey
    );

    return {
      adoptedAt,
      ...next,
      availableCash: combinedAvailableCash
    };
  } catch (error) {
    await savePortfolio(previousHoldings);
    await userSetItem("availableCash", previousCash ?? "0");
    throw error;
  }
}
