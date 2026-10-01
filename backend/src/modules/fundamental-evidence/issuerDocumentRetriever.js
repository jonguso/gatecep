import crypto from "crypto";
import dns from "dns/promises";
import net from "net";
import axios from "axios";

import {
  validateIssuerDocumentUrl
} from "./issuerDocumentUrlPolicy.js";

/*
 * PC-032G4B1C8G3D6F6D4A
 *
 * Bounded retrieval of already-qualified issuer evidence.
 *
 * Retrieval only:
 * - no filing creation,
 * - no repository persistence,
 * - no verification,
 * - no approval,
 * - no promotion.
 *
 * Every request and redirect hop is validated independently.
 */

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MAX_BYTES = 20 * 1024 * 1024;
const DEFAULT_MAX_REDIRECTS = 3;

function clean(value) {
  return String(value || "").trim();
}

function forbiddenIpv4(address) {
  const parts =
    String(address || "")
      .split(".")
      .map(Number);

  if (
    parts.length !== 4 ||
    parts.some(
      (part) =>
        !Number.isInteger(part) ||
        part < 0 ||
        part > 255
    )
  ) {
    return true;
  }

  const [a, b] = parts;

  return (
    a === 0 ||
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
    ) ||
    a >= 224
  );
}

function forbiddenIpv6(address) {
  const value =
    String(address || "")
      .toLowerCase();

  return (
    value === "::" ||
    value === "::1" ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    value.startsWith("fe80:")
  );
}

export function isForbiddenResolvedAddress(
  address
) {
  const family =
    net.isIP(address);

  if (family === 4) {
    return forbiddenIpv4(address);
  }

  if (family === 6) {
    return forbiddenIpv6(address);
  }

  return true;
}

export async function assertPublicHostname(
  hostname,
  {
    lookup = dns.lookup
  } = {}
) {
  const host =
    clean(hostname)
      .toLowerCase();

  if (!host) {
    throw new Error(
      "Issuer document hostname is required."
    );
  }

  const addresses =
    await lookup(host, {
      all: true,
      verbatim: true
    });

  if (
    !Array.isArray(addresses) ||
    !addresses.length
  ) {
    throw new Error(
      "Issuer document hostname did not resolve."
    );
  }

  const forbidden =
    addresses.find(
      (entry) =>
        isForbiddenResolvedAddress(
          entry?.address
        )
    );

  if (forbidden) {
    throw new Error(
      "Issuer document hostname resolved to a private or prohibited network address."
    );
  }

  return addresses.map(
    (entry) => ({
      address:
        entry.address,
      family:
        entry.family
    })
  );
}

function boundedInteger(
  value,
  fallback,
  minimum,
  maximum
) {
  const parsed =
    Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(
      minimum,
      Math.trunc(parsed)
    )
  );
}

function retrievalConfig() {
  return {
    timeoutMs:
      boundedInteger(
        process.env
          .ISSUER_DOCUMENT_TIMEOUT_MS,
        DEFAULT_TIMEOUT_MS,
        1000,
        30000
      ),

    maxBytes:
      boundedInteger(
        process.env
          .ISSUER_DOCUMENT_MAX_BYTES,
        DEFAULT_MAX_BYTES,
        1024,
        50 * 1024 * 1024
      ),

    maxRedirects:
      boundedInteger(
        process.env
          .ISSUER_DOCUMENT_MAX_REDIRECTS,
        DEFAULT_MAX_REDIRECTS,
        0,
        5
      )
  };
}

function isPdfContentType(
  value
) {
  const type =
    clean(value)
      .toLowerCase()
      .split(";")[0]
      .trim();

  return (
    type === "application/pdf" ||
    type === "application/x-pdf"
  );
}

function hasPdfSignature(buffer) {
  return (
    Buffer.isBuffer(buffer) &&
    buffer.length >= 5 &&
    buffer
      .subarray(0, 5)
      .toString("ascii") === "%PDF-"
  );
}

function createPinnedLookup(
  resolvedAddresses = []
) {
  const addresses =
    Array.isArray(resolvedAddresses)
      ? resolvedAddresses.filter(
          (entry) =>
            entry?.address &&
            (
              entry?.family === 4 ||
              entry?.family === 6
            )
        )
      : [];

  if (!addresses.length) {
    throw new Error(
      "Issuer document request has no validated public address."
    );
  }

  /*
   * Node's lookup contract may request either one address
   * or all addresses. Never perform a second DNS lookup here:
   * return only addresses already approved by
   * assertPublicHostname().
   */
  return (
    hostname,
    options,
    callback
  ) => {
    const done =
      typeof options === "function"
        ? options
        : callback;

    const lookupOptions =
      typeof options === "object" &&
      options !== null
        ? options
        : {};

    if (typeof done !== "function") {
      throw new Error(
        "Pinned issuer lookup requires a callback."
      );
    }

    const requestedFamily =
      Number(lookupOptions.family || 0);

    const eligible =
      requestedFamily === 4 ||
      requestedFamily === 6
        ? addresses.filter(
            (entry) =>
              entry.family ===
              requestedFamily
          )
        : addresses;

    if (!eligible.length) {
      const error =
        new Error(
          "No validated issuer address matches the requested network family."
        );

      error.code = "ENOTFOUND";
      done(error);
      return;
    }

    if (lookupOptions.all === true) {
      done(
        null,
        eligible.map(
          (entry) => ({
            address:
              entry.address,
            family:
              entry.family
          })
        )
      );
      return;
    }

    const selected =
      eligible[0];

    done(
      null,
      selected.address,
      selected.family
    );
  };
}

async function validateHop({
  symbol,
  url,
  lookup
}) {
  const policy =
    validateIssuerDocumentUrl({
      symbol,
      url
    });

  if (!policy.ok) {
    const error =
      new Error(policy.error);

    error.code =
      policy.code;

    throw error;
  }

  const resolvedAddresses =
    await assertPublicHostname(
      policy.hostname,
      { lookup }
    );

  return {
    ...policy,
    resolvedAddresses
  };
}

export async function retrieveIssuerDocument({
  symbol,
  url,
  lookup = dns.lookup,
  httpClient = axios
} = {}) {
  const config =
    retrievalConfig();

  let currentUrl =
    clean(url);

  let redirectCount = 0;

  const hops = [];

  while (true) {
    const hop =
      await validateHop({
        symbol,
        url:
          currentUrl,
        lookup
      });

    hops.push({
      url:
        hop.url,
      hostname:
        hop.hostname,
      resolvedAddresses:
        hop.resolvedAddresses
    });

    const response =
      await httpClient.get(
        hop.url,
        {
          responseType:
            "arraybuffer",

          timeout:
            config.timeoutMs,

          maxContentLength:
            config.maxBytes,

          maxBodyLength:
            config.maxBytes,

          maxRedirects:
            0,

          /*
           * Pin the transport lookup to addresses already
           * validated for this exact request/redirect hop.
           *
           * The URL remains hostname-based so normal TLS
           * hostname/SNI verification is preserved.
           */
          lookup:
            createPinnedLookup(
              hop.resolvedAddresses
            ),

          validateStatus:
            (status) =>
              (
                status >= 200 &&
                status < 300
              ) ||
              (
                status >= 300 &&
                status < 400
              )
        }
      );

    if (
      response.status >= 300 &&
      response.status < 400
    ) {
      const location =
        clean(
          response.headers?.location
        );

      if (!location) {
        throw new Error(
          "Issuer document redirect did not provide a location."
        );
      }

      if (
        redirectCount >=
        config.maxRedirects
      ) {
        throw new Error(
          "Issuer document exceeded the redirect limit."
        );
      }

      currentUrl =
        new URL(
          location,
          hop.url
        ).toString();

      redirectCount += 1;
      continue;
    }

    const buffer =
      Buffer.from(
        response.data || []
      );

    if (!buffer.length) {
      throw new Error(
        "Issuer document response was empty."
      );
    }

    if (
      buffer.length >
      config.maxBytes
    ) {
      throw new Error(
        "Issuer document exceeded the maximum allowed size."
      );
    }

    const contentType =
      clean(
        response.headers?.[
          "content-type"
        ]
      );

    if (
      !isPdfContentType(
        contentType
      )
    ) {
      throw new Error(
        "Issuer document response is not a supported PDF content type."
      );
    }

    if (
      !hasPdfSignature(
        buffer
      )
    ) {
      throw new Error(
        "Issuer document response does not contain a valid PDF signature."
      );
    }

    const checksum =
      crypto
        .createHash("sha256")
        .update(buffer)
        .digest("hex");

    return {
      ok: true,

      retrievalOnly: true,

      persistence:
        "NONE",

      verifiedFiling:
        false,

      authoritative:
        false,

      verified:
        false,

      symbol:
        hop.source.symbol,

      issuerName:
        hop.source.issuerName,

      sourceType:
        hop.source.sourceType,

      trustLevel:
        hop.source.trustLevel,

      requestedUrl:
        clean(url),

      finalUrl:
        hop.url,

      hostname:
        hop.hostname,

      contentType,

      byteLength:
        buffer.length,

      checksumAlgorithm:
        "SHA-256",

      checksum,

      retrievedAt:
        new Date().toISOString(),

      redirectCount,

      hops,

      documentBuffer:
        buffer
    };
  }
}
