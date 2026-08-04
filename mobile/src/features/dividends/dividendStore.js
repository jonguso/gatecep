import {
  userGetItem,
  userSetItem
} from "../../auth/userStorage";

const DIVIDEND_RECORDS_KEY =
  "dividendRecords";

/*
 * ============================================================
 * NORMALIZATION
 * ============================================================
 */

function normalizeRecords(
  value
) {
  if (!value) {
    return [];
  }

  if (
    Array.isArray(
      value
    )
  ) {
    return value;
  }

  if (
    typeof value ===
    "string"
  ) {
    try {
      const parsed =
        JSON.parse(
          value
        );

      return Array.isArray(
        parsed
      )
        ? parsed
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeDate(
  value
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date.toISOString();
}

function normalizeDividendRecord(
  record = {}
) {
  const now =
    new Date()
      .toISOString();

  const symbol =
    String(
      record?.symbol ||
      ""
    )
      .trim()
      .toUpperCase();

  const dividendPerShare =
    Number(
      record?.dividendPerShare ||
      0
    );

  const withholdingTaxRate =
    Number(
      record?.withholdingTaxRate ||
      0
    );

  return {
    id:
      record?.id ||
      `DIV-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()}`,

    type:
      "DIVIDEND_RECORD",

    symbol,

    companyName:
      record?.companyName ||
      symbol ||
      null,

    sector:
      record?.sector ||
      null,

    currency:
      record?.currency ||
      "KES",

    dividendType:
      record?.dividendType ||
      "FINAL",

    dividendPerShare,

    withholdingTaxRate,

    netDividendPerShare:
      Number(
        record?.netDividendPerShare ??
        (
          dividendPerShare *
          (
            1 -
            withholdingTaxRate /
              100
          )
        )
      ),

    announcementDate:
      normalizeDate(
        record?.announcementDate
      ),

    bookClosureDate:
      normalizeDate(
        record?.bookClosureDate
      ),

    exDividendDate:
      normalizeDate(
        record?.exDividendDate
      ),

    recordDate:
      normalizeDate(
        record?.recordDate
      ),

    paymentDate:
      normalizeDate(
        record?.paymentDate
      ),

    financialYear:
      record?.financialYear ||
      null,

    status:
      record?.status ||
      "ANNOUNCED",

    paymentReference:
  record?.paymentReference ||
  null,

entitlementQuantity:
  Number(
    record?.entitlementQuantity ||
    0
  ),

grossAmount:
  Number(
    record?.grossAmount ||
    0
  ),

taxAmount:
  Number(
    record?.taxAmount ||
    0
  ),

netAmount:
  Number(
    record?.netAmount ||
    0
  ),

paidAt:
  normalizeDate(
    record?.paidAt
  ),

receivedBy:
  record?.receivedBy ||
  null,

ledgerEventId:
  record?.ledgerEventId ||
  null,

    confidence:
      record?.confidence ||
      "CONFIRMED",

    source:
      record?.source ||
      "MANUAL_ENTRY",

    sourceReference:
      record?.sourceReference ||
      null,

    notes:
      record?.notes ||
      null,

    createdAt:
      record?.createdAt ||
      now,

    updatedAt:
      record?.updatedAt ||
      now
  };
}

/*
 * ============================================================
 * LOAD
 * ============================================================
 */

export async function loadDividendRecords() {
  const raw =
    await userGetItem(
      DIVIDEND_RECORDS_KEY
    );

  return normalizeRecords(
    raw
  );
}

/*
 * ============================================================
 * SAVE
 * ============================================================
 */

export async function saveDividendRecords(
  records = []
) {
  const safeRecords =
    Array.isArray(
      records
    )
      ? records
          .map(
            normalizeDividendRecord
          )
          .filter(
            (record) =>
              Boolean(
                record?.symbol
              )
          )
      : [];

  await userSetItem(
    DIVIDEND_RECORDS_KEY,
    JSON.stringify(
      safeRecords
    )
  );

  return safeRecords;
}

/*
 * ============================================================
 * CREATE OR UPDATE
 * ============================================================
 */

export async function saveDividendRecord(
  record = {}
) {
  if (
    !record?.symbol
  ) {
    throw new Error(
      "Dividend security symbol is required."
    );
  }

  if (
    Number(
      record?.dividendPerShare ||
      0
    ) < 0
  ) {
    throw new Error(
      "Dividend per share cannot be negative."
    );
  }

  const records =
    await loadDividendRecords();

  const normalized =
    normalizeDividendRecord(
      record
    );

  const existing =
    records.find(
      (item) =>
        item?.id ===
          normalized.id ||
        (
          item?.symbol ===
            normalized.symbol &&
          item?.dividendType ===
            normalized.dividendType &&
          item?.paymentDate ===
            normalized.paymentDate &&
          Boolean(
            normalized.paymentDate
          )
        )
    );

  let updated;

  if (existing) {
    updated =
      records.map(
        (item) =>
          item?.id ===
          existing.id
            ? normalizeDividendRecord({
                ...item,
                ...record,

                id:
                  existing.id,

                createdAt:
                  existing.createdAt,

                updatedAt:
                  new Date()
                    .toISOString()
              })
            : item
      );
  } else {
    updated = [
      normalized,
      ...records
    ];
  }

  await saveDividendRecords(
    updated
  );

  return (
    updated.find(
      (item) =>
        item?.id ===
        (
          existing?.id ||
          normalized.id
        )
    ) ||
    normalized
  );
}

/*
 * ============================================================
 * GET
 * ============================================================
 */

export async function getDividendRecord(
  recordId
) {
  if (!recordId) {
    return null;
  }

  const records =
    await loadDividendRecords();

  return (
    records.find(
      (item) =>
        item?.id ===
        recordId
    ) ||
    null
  );
}

/*
 * ============================================================
 * FILTER BY SYMBOL
 * ============================================================
 */

export async function loadDividendRecordsForSymbol(
  symbol
) {
  const normalizedSymbol =
    String(
      symbol ||
      ""
    )
      .trim()
      .toUpperCase();

  if (!normalizedSymbol) {
    return [];
  }

  const records =
    await loadDividendRecords();

  return records.filter(
    (item) =>
      item?.symbol ===
      normalizedSymbol
  );
}

/*
 * ============================================================
 * UPCOMING DIVIDENDS
 * ============================================================
 */

export async function loadUpcomingDividendRecords() {
  const records =
    await loadDividendRecords();

  const now =
    new Date();

  return records
    .filter(
      (item) => {
        const paymentDate =
          item?.paymentDate
            ? new Date(
                item.paymentDate
              )
            : null;

        return (
          paymentDate &&
          !Number.isNaN(
            paymentDate.getTime()
          ) &&
          paymentDate >= now &&
          item?.status !==
            "CANCELLED"
        );
      }
    )
    .sort(
      (a, b) =>
        new Date(
          a.paymentDate
        ).getTime() -
        new Date(
          b.paymentDate
        ).getTime()
    );
}

/*
 * ============================================================
 * DELETE
 * ============================================================
 */

export async function deleteDividendRecord(
  recordId
) {
  if (!recordId) {
    return false;
  }

  const records =
    await loadDividendRecords();

  const updated =
    records.filter(
      (item) =>
        item?.id !==
        recordId
    );

  await saveDividendRecords(
    updated
  );

  return (
    updated.length !==
    records.length
  );
}

/*
 * ============================================================
 * CLEAR
 * ============================================================
 */

export async function clearDividendRecords() {
  await saveDividendRecords(
    []
  );
}