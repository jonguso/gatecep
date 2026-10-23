import assert from "node:assert/strict";

import {
  deriveAdminCashBalance,
  deriveAdminValuationHoldings
} from "../src/modules/admin/adminReconciliationEvidenceDerivation.service.js";

let assertions = 0;

function check(
  condition,
  message
) {
  assert.ok(
    condition,
    message
  );

  assertions += 1;

  console.log(
    `PASS ${assertions} — ${message}`
  );
}

function expectCode(
  fn,
  code,
  message
) {
  let thrown = null;

  try {
    fn();
  } catch (error) {
    thrown = error;
  }

  check(
    thrown?.code === code,
    message
  );
}

const verified = {
  identityVerified: true
};

const holdings =
  deriveAdminValuationHoldings({
    identityVerification:
      verified,
    extraction: {
      reportType:
        "valuation",
      rows: [
        {
          Security: "SCOM",
          Quantity: 100,
          "Avg.Price": 25.5
        },
        {
          Security: " kcb ",
          Quantity: "1,200",
          "Avg.Price": "48.75"
        }
      ]
    }
  });

check(
  holdings.length === 2,
  "valuation derives every structured holding"
);

check(
  holdings[0].symbol ===
    "SCOM",
  "valuation preserves canonical uppercase symbol"
);

check(
  holdings[1].symbol ===
    "KCB",
  "valuation normalizes symbol whitespace and case"
);

check(
  holdings[1].quantity ===
    1200,
  "valuation normalizes numeric quantity"
);

check(
  holdings[1].averagePrice ===
    48.75,
  "valuation normalizes average price"
);

const cash =
  deriveAdminCashBalance({
    identityVerification:
      verified,
    extraction: {
      reportType: "cash",
      rows: [
        {
          Date:
            "15-Oct-2026",
          Balance:
            "60,000.00",
          Particulars:
            "15-Oct-2026 Receipt 60,000.00 Cr"
        },
        {
          Date:
            "16-Oct-2026",
          Balance:
            "55,991.05",
          Particulars:
            "16-Oct-2026 Purchase 55,991.05 Cr"
        },
        {
          Date:
            "16-Oct-2026",
          Balance:
            "55,852.35",
          Particulars:
            "16-Oct-2026 Purchase 55,852.35 Cr"
        },
        {
          Date:
            "16-Oct-2026",
          Balance:
            "55,818.80",
          Particulars:
            "16-Oct-2026 Purchase 55,818.80 Cr"
        }
      ]
    }
  });

check(
  cash === 55818.8,
  "cash derives latest same-day statement balance by document order"
);

expectCode(
  () =>
    deriveAdminCashBalance({
      identityVerification: {
        identityVerified:
          false
      },
      extraction: {
        reportType: "cash",
        rows: [
          {
            Date:
              "16-Oct-2026",
            Balance:
              "55,818.80"
          }
        ]
      }
    }),
  "RECONCILIATION_EVIDENCE_IDENTITY_UNVERIFIED",
  "unverified identity cannot derive authoritative cash"
);

expectCode(
  () =>
    deriveAdminValuationHoldings({
      identityVerification:
        verified,
      extraction: {
        reportType: "cash",
        rows: [
          {
            Security: "SCOM",
            Quantity: 100,
            "Avg.Price": 25
          }
        ]
      }
    }),
  "RECONCILIATION_EVIDENCE_REPORT_TYPE_INVALID",
  "wrong report type cannot derive holdings"
);

expectCode(
  () =>
    deriveAdminCashBalance({
      identityVerification:
        verified,
      extraction: {
        reportType: "cash",
        rows: []
      }
    }),
  "RECONCILIATION_EVIDENCE_ROWS_REQUIRED",
  "empty evidence cannot become authoritative"
);

expectCode(
  () =>
    deriveAdminCashBalance({
      identityVerification:
        verified,
      extraction: {
        reportType: "cash",
        rows: [
          {
            Date:
              "16-Oct-2026",
            Balance:
              "-1.00"
          }
        ]
      }
    }),
  "RECONCILIATION_CASH_ROW_INVALID",
  "negative authoritative cash is rejected"
);

expectCode(
  () =>
    deriveAdminValuationHoldings({
      identityVerification:
        verified,
      extraction: {
        reportType:
          "valuation",
        rows: [
          {
            Security: "",
            Quantity: 100,
            "Avg.Price": 25
          }
        ]
      }
    }),
  "RECONCILIATION_VALUATION_ROW_INVALID",
  "invalid valuation row is rejected"
);

console.log(
  `R8J4C_ASSERTIONS=${assertions}`
);

console.log(
  "ADMIN_003D6_R8J4C=COMPLETE"
);

// ADMIN-003D6-R8J5B — authoritative cash direction guard.
{
  const verified = {
    identityVerified: true
  };

  const credit =
    deriveAdminCashBalance({
      extraction: {
        reportType: "cash",
        rows: [
          {
            Date: "16-Oct-2026",
            Balance: "55,818.80",
            Particulars:
              "16-Oct-2026 Purchase 55,818.80 Cr"
          }
        ]
      },
      identityVerification:
        verified
    });

  assert.equal(
    credit,
    55818.8
  );

  console.log(
    "PASS 12 — explicit Cr closing balance is authoritative"
  );
}

{
  assert.throws(
    () =>
      deriveAdminCashBalance({
        extraction: {
          reportType: "cash",
          rows: [
            {
              Date: "16-Oct-2026",
              Balance: "100.00",
              Particulars:
                "16-Oct-2026 Purchase 100.00 Dr"
            }
          ]
        },
        identityVerification: {
          identityVerified: true
        }
      }),
    (error) =>
      error?.status === 422 &&
      error?.code ===
        "RECONCILIATION_CASH_BALANCE_DIRECTION_UNSAFE"
  );

  console.log(
    "PASS 13 — Dr closing balance fails closed"
  );
}

{
  assert.throws(
    () =>
      deriveAdminCashBalance({
        extraction: {
          reportType: "cash",
          rows: [
            {
              Date: "16-Oct-2026",
              Balance: "100.00",
              Particulars:
                "16-Oct-2026 Purchase 100.00"
            }
          ]
        },
        identityVerification: {
          identityVerified: true
        }
      }),
    (error) =>
      error?.status === 422 &&
      error?.code ===
        "RECONCILIATION_CASH_BALANCE_DIRECTION_UNSAFE"
  );

  console.log(
    "PASS 14 — directionless closing balance fails closed"
  );
}

{
  assert.throws(
    () =>
      deriveAdminCashBalance({
        extraction: {
          reportType: "cash",
          rows: [
            {
              Date: "16-Oct-2026",
              Balance: "100.00",
              Particulars:
                "16-Oct-2026 100.00 Cr Dr"
            }
          ]
        },
        identityVerification: {
          identityVerified: true
        }
      }),
    (error) =>
      error?.status === 422 &&
      error?.code ===
        "RECONCILIATION_CASH_BALANCE_DIRECTION_UNSAFE"
  );

  console.log(
    "PASS 15 — ambiguous Cr/Dr closing balance fails closed"
  );
}

// ADMIN-003D6-R8J5C5B — zero quantity must fail closed.
{
  assert.throws(
    () =>
      deriveAdminValuationHoldings({
        identityVerification: {
          identityVerified: true
        },
        extraction: {
          reportType: "valuation",
          rows: [
            {
              Security: "SCOM",
              Quantity: "0",
              "Avg.Price": "20.00"
            }
          ]
        }
      }),
    (error) =>
      error?.status === 422 &&
      error?.code ===
        "RECONCILIATION_VALUATION_ROW_INVALID"
  );

  console.log(
    "PASS 16 — zero-quantity valuation row fails closed"
  );
}
