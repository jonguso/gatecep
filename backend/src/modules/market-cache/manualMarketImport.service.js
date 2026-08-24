import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { normalizeMyStocksCsv } from "../../services/marketData/MyStocksCsvNormalizer.js";
import { normalizeApifyEodExport } from "../../services/marketData/ApifyEodExportNormalizer.js";
import { readLatestVerifiedEodSnapshot, saveVerifiedEodSnapshot } from "./marketEod.repository.js";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultAuditDirectory = path.resolve(moduleDirectory, "../../../data/market-imports");
const auditDirectory = process.env.MARKET_IMPORT_AUDIT_DIR || defaultAuditDirectory;

function publicSummary(snapshot) {
  return {
    provider: snapshot.provider,
    upstreamSource: snapshot.upstreamSource,
    kind: snapshot.kind,
    coverage: snapshot.coverage,
    valuationEligible: snapshot.valuationEligible,
    marketDate: snapshot.marketDate,
    generatedAt: snapshot.generatedAt,
    fileName: snapshot.fileName,
    checksum: snapshot.checksum,
    count: snapshot.count,
    rejectedCount: snapshot.rejected?.length || 0,
    sample: snapshot.data.slice(0, 5)
  };
}

export function previewManualMarketImport(payload = {}) {
  return publicSummary(normalizeManualMarketImport(payload));
}

export function normalizeManualMarketImport(payload = {}) {
  const name = String(payload.fileName || "");
  const text = String(payload.fileText ?? payload.csvText ?? "").replace(/^\uFEFF/, "").trim();
  const isApify = /apify|dataset_african-stock-market-data/i.test(name)
    || /"(?:ticker|exchange|scraped_at)"/.test(text.slice(0, 500))
    || (/^(?:\[|\{)/.test(text) && /"scraped_at"/.test(text.slice(0, 2000)));
  return isApify ? normalizeApifyEodExport({ ...payload, fileText: text }) : normalizeMyStocksCsv(payload);
}

export async function persistManualMarketImport(snapshot) {
  await fs.mkdir(auditDirectory, { recursive: true });
  const safeTime = snapshot.importedAt.replace(/[:.]/g, "-");
  const safeKind = snapshot.kind.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const auditName = `${snapshot.marketDate}_${safeTime}_${safeKind}_${snapshot.checksum.slice(0, 12)}.json`;
  const auditPath = path.join(auditDirectory, auditName);
  await fs.writeFile(auditPath, `${JSON.stringify(snapshot, null, 2)}\n`, { flag: "wx" });
  await fs.writeFile(path.join(auditDirectory, "latest-audit.json"), `${JSON.stringify(snapshot, null, 2)}\n`);
  if (snapshot.valuationEligible) {
    await fs.writeFile(path.join(auditDirectory, "latest-valuation.json"), `${JSON.stringify(snapshot, null, 2)}\n`);
  }
  return { auditName };
}

export async function prepareManualMarketImport(payload = {}) {
  const snapshot = normalizeManualMarketImport(payload);
  const audit = await persistManualMarketImport(snapshot);
  return { snapshot, audit };
}

export async function publishManualVerifiedEod(snapshot) {
  if (snapshot?.provider !== "APIFY_MANUAL_EOD" || snapshot?.valuationEligible !== true) return null;
  const latest = await readLatestVerifiedEodSnapshot();
  if (latest?.marketDate && snapshot.marketDate < latest.marketDate) {
    const error = new Error(`The ${snapshot.marketDate} export is older than the current ${latest.marketDate} verified EOD snapshot.`);
    error.code = "STALE_MARKET_SNAPSHOT";
    throw error;
  }
  if (latest?.marketDate === snapshot.marketDate && latest?.payloadHash === snapshot.checksum) {
    return { duplicate: true, marketDate: snapshot.marketDate, count: snapshot.count, payloadHash: snapshot.checksum };
  }
  return { duplicate: false, ...(await saveVerifiedEodSnapshot(snapshot)) };
}

export async function readLatestManualMarketImport() {
  try {
    return JSON.parse(await fs.readFile(path.join(auditDirectory, "latest-valuation.json"), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}
