import axios from "axios";

import {
  getSecurityBySymbol
} from "../../data/nseSecurityMaster.js";

import {
  listIssuerEvidenceSources
} from "./issuerEvidenceSourceRegistry.js";

import {
  validateIssuerDocumentUrl
} from "./issuerDocumentUrlPolicy.js";

const clean = (value) =>
  String(value ?? "").trim();

const normalizeSymbol = (value) =>
  clean(value).toUpperCase();

const finitePositiveInteger = (
  value,
  fallback,
  minimum,
  maximum
) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(
      minimum,
      Math.floor(number)
    )
  );
};

function configuration() {
  const token =
    clean(process.env.APIFY_API_TOKEN);

  if (!token) {
    throw new Error(
      "APIFY_API_TOKEN is required for issuer document discovery."
    );
  }

  const actorId =
    clean(
      process.env.APIFY_ISSUER_DOCUMENT_ACTOR_ID ||
      "apify/rag-web-browser"
    ).replace(/\//g, "~");

  const timeoutSeconds =
    finitePositiveInteger(
      process.env.APIFY_ISSUER_DOCUMENT_TIMEOUT_SECONDS,
      90,
      30,
      180
    );

  const maxResults =
    finitePositiveInteger(
      process.env.APIFY_ISSUER_DOCUMENT_MAX_RESULTS,
      8,
      1,
      10
    );

  const maxTotalChargeUsd =
    Number(
      process.env.APIFY_ISSUER_DOCUMENT_MAX_TOTAL_CHARGE_USD ||
      0.1
    );

  return {
    token,
    actorId,
    timeoutSeconds,
    maxResults,
    maxTotalChargeUsd
  };
}

function resolveCandidateUrl(row) {
  const candidates = [
    row?.url,
    row?.sourceUrl,
    row?.sourceURL,
    row?.metadata?.url,
    row?.metadata?.sourceUrl
  ];

  for (const value of candidates) {
    const candidate = clean(value);

    if (/^https:\/\//i.test(candidate)) {
      return candidate;
    }
  }

  return null;
}

function resolveCandidateTitle(row) {
  return (
    clean(row?.title) ||
    clean(row?.metadata?.title) ||
    null
  );
}

function buildIssuerDocumentQuery({
  issuerName,
  hosts,
  fiscalYear
}) {
  const year =
    clean(fiscalYear);

  const siteClause =
    hosts
      .map((host) => `site:${host}`)
      .join(" OR ");

  return [
    `"${issuerName}"`,
    year ? `"${year}"` : null,
    "(annual report OR audited financial statements OR financial statements)",
    "(statement of financial position OR balance sheet OR cash flow)",
    siteClause
      ? `(${siteClause})`
      : null
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildIssuerDocumentAcquisitionPlan({
  symbol
} = {}) {
  const requested =
    normalizeSymbol(symbol);

  const security =
    getSecurityBySymbol(requested);

  const canonicalSymbol =
    normalizeSymbol(security?.symbol);

  if (!canonicalSymbol) {
    throw new Error(
      "A valid NSE security symbol is required."
    );
  }

  const sources =
    listIssuerEvidenceSources(
      canonicalSymbol
    );

  if (!sources.length) {
    throw new Error(
      "No qualified issuer evidence source is configured for this security."
    );
  }

  const primary =
    sources.filter(
      (source) =>
        source?.acquisitionRole === "PRIMARY"
    );

  const fallback =
    sources.filter(
      (source) =>
        source?.acquisitionRole === "FALLBACK"
    );

  return {
    symbol: canonicalSymbol,

    primary: primary.map(
      (source) => ({
        ...source
      })
    ),

    fallback: fallback.map(
      (source) => ({
        ...source
      })
    )
  };
}

function normalizeDiscoveryIdentityToken(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeCandidatePathname(url) {
  try {
    return decodeURIComponent(
      new URL(url).pathname
    );
  } catch {
    return "";
  }
}

function extractCmaDocumentPathMetadata(url) {
  let parsed;

  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.hostname.toLowerCase() !==
      "annualreport.cma.or.ke"
  ) {
    return null;
  }

  const pathname =
    decodeCandidatePathname(url);

  const match =
    pathname.match(
      /\/media\/[^/]+\/([^/]+)\/documents\/([^/?#]+)$/i
    );

  if (!match) {
    return {
      issuerPathName: null,
      fileName: null,
      fiscalYear: null
    };
  }

  const issuerPathName =
    String(match[1] || "").trim();

  const fileName =
    String(match[2] || "").trim();

  const yearMatch =
    fileName.match(
      /(?:^|[^0-9])((?:19|20)\d{2})(?:[^0-9]|$)/
    );

  return {
    issuerPathName:
      issuerPathName || null,

    fileName:
      fileName || null,

    fiscalYear:
      yearMatch
        ? Number(yearMatch[1])
        : null
  };
}

function normalizeCmaIssuerIdentity(value) {
  return normalizeDiscoveryIdentityToken(value)
    .replace(/\bplc\b/g, " ")
    .replace(/\bltd\b/g, " ")
    .replace(/\blimited\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cmaIssuerPathMatchesSecurity({
  issuerPathName,
  security
} = {}) {
  const actual =
    normalizeCmaIssuerIdentity(
      issuerPathName
    );

  const expected =
    normalizeCmaIssuerIdentity(
      security?.cmaIssuerName ||
      security?.name
    );

  if (!actual || !expected) {
    return false;
  }

  return actual === expected;
}

export function qualifyDiscoveredCandidateMetadata({
  security,
  url,
  source,
  fiscalYear = null
} = {}) {
  if (
    source?.sourceType !== "REGULATOR" ||
    String(source?.host || "")
      .toLowerCase() !==
      "annualreport.cma.or.ke"
  ) {
    return {
      ok: true,
      metadataQualification:
        "NOT_CMA_STRUCTURED_PATH"
    };
  }

  const metadata =
    extractCmaDocumentPathMetadata(url);

  if (
    !metadata ||
    !metadata.issuerPathName
  ) {
    return {
      ok: false,
      metadataQualification:
        "CMA_ISSUER_PATH_UNAVAILABLE"
    };
  }

  if (
    !cmaIssuerPathMatchesSecurity({
      issuerPathName:
        metadata.issuerPathName,
      security
    })
  ) {
    return {
      ok: false,
      metadataQualification:
        "CMA_ISSUER_PATH_MISMATCH",
      metadata
    };
  }

  const requestedYear =
    Number(fiscalYear);

  if (
    Number.isInteger(requestedYear) &&
    metadata.fiscalYear !== null &&
    metadata.fiscalYear !==
      requestedYear
  ) {
    return {
      ok: false,
      metadataQualification:
        "CMA_FISCAL_YEAR_MISMATCH",
      metadata
    };
  }

  return {
    ok: true,
    metadataQualification:
      metadata.fiscalYear === null
        ? "CMA_IDENTITY_MATCH_YEAR_UNRESOLVED"
        : "CMA_IDENTITY_YEAR_MATCH",
    metadata
  };
}

export function normalizeIssuerDocumentCandidates({
  symbol,
  rows,
  fiscalYear = null
} = {}) {
  const requested =
    normalizeSymbol(symbol);

  const security =
    getSecurityBySymbol(requested);

  const canonicalSymbol =
    normalizeSymbol(security?.symbol);

  if (!canonicalSymbol) {
    throw new Error(
      "A valid NSE security symbol is required."
    );
  }

  const candidates = [];
  const seen = new Set();

  for (const row of Array.isArray(rows) ? rows : []) {
    const url =
      resolveCandidateUrl(row);

    if (!url || seen.has(url)) {
      continue;
    }

    seen.add(url);

    const qualification =
      validateIssuerDocumentUrl({
        symbol: canonicalSymbol,
        url
      });

    if (!qualification.ok) {
      continue;
    }

    const metadataQualification =
      qualifyDiscoveredCandidateMetadata({
        security,
        url,
        source: qualification.source,
        fiscalYear
      });

    if (!metadataQualification.ok) {
      continue;
    }

    candidates.push({
      symbol: canonicalSymbol,
      title: resolveCandidateTitle(row),
      url,
      source: qualification.source,
      metadataQualification:
        metadataQualification
          .metadataQualification,
      discoveryMetadata:
        metadataQualification.metadata ||
        null,
      discoveryProvider:
        "APIFY_RAG_WEB_BROWSER",
      evidenceStatus:
        "DISCOVERED",
      authoritative: false,
      verified: false
    });
  }

  return candidates;
}

export async function discoverIssuerFinancialDocuments({
  symbol,
  fiscalYear,
  httpClient = axios
} = {}) {
  const requested =
    normalizeSymbol(symbol);

  if (!requested) {
    throw new Error(
      "A valid NSE security symbol is required."
    );
  }

  const security =
    getSecurityBySymbol(requested);

  const canonicalSymbol =
    normalizeSymbol(security?.symbol);

  if (!canonicalSymbol) {
    throw new Error(
      "The NSE security could not be resolved."
    );
  }

  const acquisitionPlan =
    buildIssuerDocumentAcquisitionPlan({
      symbol: canonicalSymbol
    });

  const issuerName =
    clean(security?.name) ||
    canonicalSymbol;

  const {
    token,
    actorId,
    timeoutSeconds,
    maxResults,
    maxTotalChargeUsd
  } = configuration();

  const passes = [
    {
      role: "PRIMARY",
      sources: acquisitionPlan.primary
    },
    {
      role: "FALLBACK",
      sources: acquisitionPlan.fallback
    }
  ];

  const attempts = [];

  for (const pass of passes) {
    if (!pass.sources.length) {
      continue;
    }

    const hosts = [
      ...new Set(
        pass.sources
          .map((source) =>
            clean(source?.host).toLowerCase()
          )
          .filter(Boolean)
      )
    ];

    if (!hosts.length) {
      continue;
    }

    const query =
      buildIssuerDocumentQuery({
        issuerName,
        hosts,
        fiscalYear
      });

    const response =
      await httpClient.post(
        `https://api.apify.com/v2/acts/${encodeURIComponent(
          actorId
        )}/run-sync-get-dataset-items`,
        {
          query,
          maxResults,
          outputFormats: ["markdown"],
          requestTimeoutSecs:
            Math.min(
              75,
              timeoutSeconds - 5
            ),
          scrapingTool: "raw-http"
        },
        {
          params: {
            format: "json",
            timeout: timeoutSeconds,
            maxItems: maxResults,
            maxTotalChargeUsd
          },
          headers: {
            Authorization:
              `Bearer ${token}`,
            "Content-Type":
              "application/json"
          },
          timeout:
            (timeoutSeconds + 15) * 1000
        }
      );

    const rows =
      Array.isArray(response?.data)
        ? response.data
        : [];

    const qualifiedCandidates =
      normalizeIssuerDocumentCandidates({
        symbol: canonicalSymbol,
        rows,
        fiscalYear
      });

    attempts.push({
      acquisitionRole: pass.role,
      hosts,
      query,
      candidateCount: rows.length,
      qualifiedCandidateCount:
        qualifiedCandidates.length
    });

    if (qualifiedCandidates.length) {
      return {
        symbol: canonicalSymbol,
        fiscalYear:
          clean(fiscalYear) || null,
        provider:
          "APIFY_RAG_WEB_BROWSER",
        acquisitionRole:
          pass.role,
        query,
        retrievedAt:
          new Date().toISOString(),
        candidateCount:
          rows.length,
        qualifiedCandidates,
        attempts,
        persistence: "NONE",
        authoritative: false,
        verified: false
      };
    }
  }

  return {
    symbol: canonicalSymbol,
    fiscalYear:
      clean(fiscalYear) || null,
    provider:
      "APIFY_RAG_WEB_BROWSER",
    acquisitionRole: null,
    query:
      attempts.at(-1)?.query || null,
    retrievedAt:
      new Date().toISOString(),
    candidateCount:
      attempts.reduce(
        (total, attempt) =>
          total + attempt.candidateCount,
        0
      ),
    qualifiedCandidates: [],
    attempts,
    persistence: "NONE",
    authoritative: false,
    verified: false
  };
}

export default {
  discoverIssuerFinancialDocuments,
  normalizeIssuerDocumentCandidates,
  buildIssuerDocumentAcquisitionPlan
};
