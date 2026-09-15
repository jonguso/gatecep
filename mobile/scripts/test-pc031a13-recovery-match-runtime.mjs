import assert from "node:assert/strict";

import {
  findVerifiedEvidenceMatches,
  buildVerifiedEvidenceMatchAudit
} from "../src/features/broker-sync/realOrderExecutionEvidenceMatchCore.js";

function order(overrides = {}) {
  return {
    id: "ORDER-A13-1",
    executionMode: "REAL",
    status: "BROKER_SELECTED",
    brokerStatus: "SUBMISSION_UNCERTAIN",

    symbol: "SCOM",
    side: "BUY",
    quantity: 100,

    brokerId: "ABC",
    brokerName: "ABC Capital",
    submissionBrokerId: "ABC",

    lastSubmissionAttemptAt:
      "2026-09-14T10:00:00.000Z",

    ...overrides
  };
}

function evidence(overrides = {}) {
  return {
    id: "EVIDENCE-A13-1",

    date:
      "2026-09-14T11:00:00.000Z",

    symbol: "SCOM",
    side: "BUY",
    quantity: 100,
    price: 25,

    broker: "ABC Capital",
    brokerReference: "ABC-REF-001",

    fees: 25,
    settlementStatus: "SETTLED",
    status: "FILLED",

    source: "TRANSACTION_UPLOAD",

    ...overrides
  };
}

function match(orderValue, records) {
  return findVerifiedEvidenceMatches({
    order: orderValue,
    records
  });
}

function audit(orderValue, records) {
  return buildVerifiedEvidenceMatchAudit({
    order: orderValue,
    records
  });
}

// 1. Unique verified execution.
{
  const matches = match(
    order(),
    [evidence()]
  );

  assert.equal(matches.length, 1);

  const result = audit(
    order(),
    [evidence()]
  );

  assert.equal(
    result.status,
    "UNIQUE_VERIFIED_MATCH"
  );

  assert.equal(result.matchCount, 1);

  console.log(
    "PASS: unique completed verified evidence matches."
  );
}

// 2. Two genuine candidates remain ambiguous.
{
  const records = [
    evidence({
      id: "EVIDENCE-A13-A",
      brokerReference: "ABC-REF-A"
    }),
    evidence({
      id: "EVIDENCE-A13-B",
      brokerReference: "ABC-REF-B"
    })
  ];

  assert.equal(
    match(order(), records).length,
    2
  );

  const result = audit(
    order(),
    records
  );

  assert.equal(
    result.status,
    "AMBIGUOUS_VERIFIED_MATCH"
  );

  assert.equal(result.matchCount, 2);

  console.log(
    "PASS: duplicate genuine candidates remain ambiguous."
  );
}

// 3. Non-executed evidence can never resolve.
for (const status of [
  "REJECTED",
  "REFUSED",
  "CANCELLED"
]) {
  const records = [
    evidence({ status })
  ];

  assert.equal(
    match(order(), records).length,
    0
  );

  const result = audit(
    order(),
    records
  );

  assert.equal(
    result.status,
    "NO_VERIFIED_MATCH"
  );

  assert.equal(
    result.evidence[0]?.checks?.verified,
    false
  );

  assert.equal(
    result.evidence[0]?.qualifies,
    false
  );
}

console.log(
  "PASS: rejected/refused/cancelled evidence cannot resolve execution."
);

// 4. Missing verification evidence cannot match.
{
  const incomplete = evidence({
    brokerReference: "",
    fees: "",
    settlementStatus: ""
  });

  assert.equal(
    match(
      order(),
      [incomplete]
    ).length,
    0
  );

  const result = audit(
    order(),
    [incomplete]
  );

  assert.equal(
    result.status,
    "NO_VERIFIED_MATCH"
  );

  assert.equal(
    result.evidence[0]?.checks?.verified,
    false
  );

  assert.ok(
    result.evidence[0]?.missingEvidence?.length > 0
  );

  console.log(
    "PASS: incomplete broker evidence cannot qualify."
  );
}

// 5. Wrong broker.
{
  const wrong = evidence({
    broker: "NCBA Investment Bank"
  });

  assert.equal(
    match(order(), [wrong]).length,
    0
  );

  assert.equal(
    audit(
      order(),
      [wrong]
    ).evidence[0]?.checks?.brokerMatch,
    false
  );

  console.log(
    "PASS: wrong broker does not match."
  );
}

// 6. Wrong symbol.
{
  const wrong = evidence({
    symbol: "EQTY"
  });

  assert.equal(
    match(order(), [wrong]).length,
    0
  );

  assert.equal(
    audit(
      order(),
      [wrong]
    ).evidence[0]?.checks?.symbolMatch,
    false
  );

  console.log(
    "PASS: wrong symbol does not match."
  );
}

// 7. Wrong side.
{
  const wrong = evidence({
    side: "SELL"
  });

  assert.equal(
    match(order(), [wrong]).length,
    0
  );

  assert.equal(
    audit(
      order(),
      [wrong]
    ).evidence[0]?.checks?.sideMatch,
    false
  );

  console.log(
    "PASS: wrong side does not match."
  );
}

// 8. Wrong quantity.
{
  const wrong = evidence({
    quantity: 99
  });

  assert.equal(
    match(order(), [wrong]).length,
    0
  );

  assert.equal(
    audit(
      order(),
      [wrong]
    ).evidence[0]?.checks?.quantityMatch,
    false
  );

  console.log(
    "PASS: wrong quantity does not match."
  );
}

// 9. Outside the allowed -1/+7 day window.
{
  const beforeWindow = evidence({
    date:
      "2026-09-13T09:59:59.000Z"
  });

  const afterWindow = evidence({
    date:
      "2026-09-21T10:00:01.000Z"
  });

  assert.equal(
    match(
      order(),
      [beforeWindow]
    ).length,
    0
  );

  assert.equal(
    match(
      order(),
      [afterWindow]
    ).length,
    0
  );

  assert.equal(
    audit(
      order(),
      [beforeWindow]
    ).evidence[0]
      ?.checks
      ?.submissionWindowMatch,
    false
  );

  assert.equal(
    audit(
      order(),
      [afterWindow]
    ).evidence[0]
      ?.checks
      ?.submissionWindowMatch,
    false
  );

  console.log(
    "PASS: evidence outside the submission window does not match."
  );
}

// 10. Existing brokerOrderId requires exact reference.
{
  const referencedOrder = order({
    brokerOrderId:
      "ABC-CONFIRMED-555"
  });

  const exact = evidence({
    brokerReference:
      "ABC-CONFIRMED-555"
  });

  assert.equal(
    match(
      referencedOrder,
      [exact]
    ).length,
    1
  );

  const result = audit(
    referencedOrder,
    [exact]
  );

  assert.equal(
    result.matchMode,
    "BROKER_REFERENCE"
  );

  assert.equal(
    result.status,
    "UNIQUE_VERIFIED_MATCH"
  );

  assert.equal(
    result.evidence[0]
      ?.checks
      ?.referenceMatch,
    true
  );

  console.log(
    "PASS: confirmed broker order ID uses exact-reference matching."
  );
}

// 11. Wrong reference never falls back to heuristics.
{
  const referencedOrder = order({
    brokerOrderId:
      "ABC-CONFIRMED-555"
  });

  const wrongReference = evidence({
    brokerReference:
      "ABC-DIFFERENT-999"
  });

  assert.equal(
    match(
      referencedOrder,
      [wrongReference]
    ).length,
    0
  );

  const result = audit(
    referencedOrder,
    [wrongReference]
  );

  assert.equal(
    result.status,
    "NO_VERIFIED_MATCH"
  );

  assert.equal(
    result.evidence[0]
      ?.checks
      ?.referenceMatch,
    false
  );

  assert.equal(
    result.evidence[0]
      ?.checks
      ?.symbolMatch,
    true
  );

  assert.equal(
    result.evidence[0]
      ?.checks
      ?.sideMatch,
    true
  );

  assert.equal(
    result.evidence[0]
      ?.checks
      ?.quantityMatch,
    true
  );

  assert.equal(
    result.evidence[0]
      ?.checks
      ?.brokerMatch,
    true
  );

  assert.equal(
    result.evidence[0]?.qualifies,
    false
  );

  console.log(
    "PASS: wrong confirmed broker reference never falls back to heuristics."
  );
}

// 12. A12 relevance ranking cannot manufacture qualification.
{
  const highlyRelevantRejected =
    evidence({
      status: "REJECTED"
    });

  const result = audit(
    order(),
    [highlyRelevantRejected]
  );

  assert.equal(
    result.status,
    "NO_VERIFIED_MATCH"
  );

  assert.equal(
    result.matchCount,
    0
  );

  assert.equal(
    result.relevantEvidenceCount,
    1
  );

  assert.ok(
    result.relevantEvidence[0]
      ?.relevanceScore > 0
  );

  assert.equal(
    result.relevantEvidence[0]
      ?.checks
      ?.verified,
    false
  );

  assert.equal(
    result.relevantEvidence[0]
      ?.qualifies,
    false
  );

  console.log(
    "PASS: display relevance cannot manufacture execution qualification."
  );
}

// 13. Supported broker-name normalization.
{
  const variations = [
    ["AIB", "AIB-AXYS"],
    ["ABC", "ABC Capital"],
    ["NCBA", "NCBA Investment Bank"]
  ];

  for (
    const [brokerId, brokerName]
    of variations
  ) {
    assert.equal(
      match(
        order({
          brokerId,
          brokerName: brokerId,
          submissionBrokerId:
            brokerId
        }),
        [
          evidence({
            broker: brokerName
          })
        ]
      ).length,
      1
    );
  }

  console.log(
    "PASS: supported broker-name variations remain matchable."
  );
}

console.log("");
console.log(
  "PC-031A13 runtime recovery matching tests PASSED."
);
