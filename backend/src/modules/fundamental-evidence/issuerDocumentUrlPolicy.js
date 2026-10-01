import net from "net";

import {
  resolveIssuerEvidenceSource
} from "./issuerEvidenceSourceRegistry.js";

/*
 * PC-032G4B1C8G3D6F6D2
 *
 * Fail-closed issuer document URL policy.
 *
 * This performs deterministic URL/host validation only.
 * DNS resolution and redirect-hop validation belong to the
 * retrieval adapter that will consume this policy.
 */

function clean(value) {
  return String(value || "").trim();
}

function normalizeHostname(value) {
  return clean(value)
    .toLowerCase()
    .replace(/^www\./, "");
}

function isForbiddenLiteralIp(
  hostname
) {
  const host =
    normalizeHostname(hostname);

  if (!net.isIP(host)) {
    return false;
  }

  if (
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0"
  ) {
    return true;
  }

  if (net.isIP(host) === 4) {
    const octets =
      host
        .split(".")
        .map(Number);

    const [a, b] = octets;

    return (
      a === 10 ||
      a === 127 ||
      (
        a === 169 &&
        b === 254
      ) ||
      (
        a === 172 &&
        b >= 16 &&
        b <= 31
      ) ||
      (
        a === 192 &&
        b === 168
      )
    );
  }

  const normalized =
    host.toLowerCase();

  return (
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

export function validateIssuerDocumentUrl({
  symbol,
  url
} = {}) {
  const rawUrl =
    clean(url);

  if (!rawUrl) {
    return {
      ok: false,
      code: "URL_REQUIRED",
      error:
        "An issuer document URL is required."
    };
  }

  let parsed;

  try {
    parsed =
      new URL(rawUrl);
  } catch {
    return {
      ok: false,
      code: "INVALID_URL",
      error:
        "The issuer document URL is invalid."
    };
  }

  if (parsed.protocol !== "https:") {
    return {
      ok: false,
      code: "HTTPS_REQUIRED",
      error:
        "Issuer documents must use HTTPS."
    };
  }

  if (
    parsed.username ||
    parsed.password
  ) {
    return {
      ok: false,
      code: "URL_CREDENTIALS_FORBIDDEN",
      error:
        "Issuer document URLs may not contain credentials."
    };
  }

  const hostname =
    normalizeHostname(
      parsed.hostname
    );

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    isForbiddenLiteralIp(hostname)
  ) {
    return {
      ok: false,
      code: "PRIVATE_HOST_FORBIDDEN",
      error:
        "Private or local issuer document hosts are not allowed."
    };
  }

  const source =
    resolveIssuerEvidenceSource({
      symbol,
      hostname
    });

  if (!source) {
    return {
      ok: false,
      code: "UNQUALIFIED_ISSUER_HOST",
      error:
        "The issuer document host has not been qualified for this security."
    };
  }

  return {
    ok: true,
    code: "QUALIFIED",
    url:
      parsed.toString(),
    hostname,
    source
  };
}
