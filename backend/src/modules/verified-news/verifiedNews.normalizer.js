import crypto from "crypto";
import { NSE_SECURITIES } from "../../data/nseSecurityMaster.js";

const SOURCE_RULES = [
  { host: "nse.co.ke", key: "NSE", name: "Nairobi Securities Exchange", trustLevel: "OFFICIAL" },
  { host: "businessdailyafrica.com", key: "BUSINESS_DAILY", name: "Business Daily Africa", trustLevel: "REPORTED" },
  { host: "standardmedia.co.ke", key: "STANDARD_BUSINESS", name: "The Standard Business", trustLevel: "REPORTED" }
];

function cleanText(value, max = 500) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#*_`>|]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^\s*\d+\s+(?:minute|hour|day|week|month|year)s?\s+ago\s*[—–-]\s*/i, "")
    .replace(/\s*Read more\s*$/i, "")
    .trim()
    .slice(0, max);
}

function cleanCalendarEvidence(value, max = 20000) {
  return String(value || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, "\n")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[\t ]+/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

function nested(row, name) {
  return row?.[name] ?? name.split(".").reduce((value, key) => value?.[key], row);
}

function canonicalUrl(value) {
  try {
    const url = new URL(String(value || ""));
    url.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"].forEach((key) => url.searchParams.delete(key));
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return null;
  }
}

function sourceFor(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return SOURCE_RULES.find((source) => hostname === source.host || hostname.endsWith(`.${source.host}`)) || null;
  } catch {
    return null;
  }
}

function markdownTitle(value) {
  const match = String(value || "").match(/^\s*#{1,3}\s+(.+?)\s*$/m);
  return cleanText(match?.[1] || "", 240);
}

function isOfficialCorporateActionsUrl(url, source) {
  if (source?.key !== "NSE") return false;
  try {
    return /^\/corporate-actions\/?$/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

function extractPublishedAt(row) {
  const direct = [nested(row, "metadata.datePublished"), nested(row, "metadata.publishedTime"), nested(row, "searchResult.date"), row?.publishedAt];
  const openGraph = nested(row, "metadata.openGraph");
  if (Array.isArray(openGraph)) {
    for (const item of openGraph) {
      if (/published_time|datePublished/i.test(String(item?.property || item?.name || ""))) direct.push(item?.content);
    }
  }
  for (const value of direct) {
    const parsed = Date.parse(value || "");
    if (Number.isFinite(parsed) && parsed <= Date.now() + 5 * 60 * 1000) return new Date(parsed).toISOString();
  }
  return null;
}

function categoryFor(text) {
  const value = String(text || "").toLowerCase();
  if (/dividend|book closure|books closure|ex-dividend|record date|distribution/.test(value)) return "Dividends";
  if (/financial results|earnings|profit|loss|acquisition|merger|appointment|resignation|annual report|interim report|issuer|company/.test(value)) return "Company";
  return "Market";
}

function normalizedWords(value) {
  return String(value || "").toUpperCase().replace(/&/g, " AND ").replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function matchSymbols(text) {
  const haystack = ` ${normalizedWords(text)} `;
  return NSE_SECURITIES.filter((security) => {
    const candidates = [security.symbol, ...(security.aliases || [])]
      .map(normalizedWords)
      .filter((value) => value.length >= 3);
    const company = normalizedWords(security.name).replace(/\b(PLC|LTD|LIMITED|HOLDINGS|GROUP|KENYA)\b/g, " ").replace(/\s+/g, " ").trim();
    return candidates.some((value) => haystack.includes(` ${value} `)) || (company.length >= 6 && haystack.includes(company));
  }).map((security) => security.symbol);
}

export function normalizeApifyNewsItems(rows = [], { actorRunId = null } = {}) {
  const accepted = [];
  const rejected = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const crawlStatus = String(nested(row, "crawl.requestStatus") || "").toLowerCase();
    const crawlHttpStatus = Number(nested(row, "crawl.httpStatusCode"));
    if ((crawlStatus && crawlStatus !== "handled") || (Number.isFinite(crawlHttpStatus) && crawlHttpStatus >= 400)) {
      rejected.push({ reason: "CRAWL_FAILED", httpStatus: Number.isFinite(crawlHttpStatus) ? crawlHttpStatus : null, requestStatus: crawlStatus || null });
      continue;
    }
    const urlCandidates = [nested(row, "metadata.canonicalUrl"), nested(row, "metadata.url"), nested(row, "searchResult.url"), row?.url]
      .map(canonicalUrl)
      .filter(Boolean);
    const url = urlCandidates.find((candidate) => sourceFor(candidate)) || urlCandidates[0] || null;
    const source = sourceFor(url);
    const calendarEvidence = cleanCalendarEvidence(row?.markdown || nested(row, "content.markdown") || row?.text || nested(row, "content.text") || "", 20000);
    const title = cleanText(
      nested(row, "searchResult.title")
      || nested(row, "metadata.title")
      || row?.title
      || markdownTitle(calendarEvidence)
      || (calendarEvidence && isOfficialCorporateActionsUrl(url, source) ? "NSE Corporate Actions" : ""),
      240
    );
    const summary = cleanText(nested(row, "searchResult.description") || nested(row, "metadata.description") || row?.description, 420);
    if (!url || !source || !title) {
      rejected.push({ reason: !source ? "SOURCE_NOT_ALLOWED" : "MISSING_REQUIRED_EVIDENCE", url, candidateUrls: urlCandidates.slice(0, 4) });
      continue;
    }
    const evidenceText = `${title} ${summary}`;
    const publishedAt = extractPublishedAt(row);
    const contentHash = crypto.createHash("sha256").update(`${source.key}|${title.toLowerCase()}|${summary.toLowerCase()}`).digest("hex");
    accepted.push({
      canonicalUrl: url,
      sourceKey: source.key,
      sourceName: source.name,
      trustLevel: source.trustLevel,
      category: categoryFor(evidenceText),
      title,
      summary: summary || null,
      publishedAt,
      matchedSymbols: matchSymbols(evidenceText),
      contentHash,
      actorRunId,
      // Transient extraction evidence. The repository intentionally does not persist it.
      calendarEvidence
    });
  }
  return { accepted, rejected };
}

export { canonicalUrl, categoryFor, cleanCalendarEvidence, cleanText, matchSymbols };
