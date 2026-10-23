import assert from "node:assert/strict";

import {
  authorizeFundamentalDocumentRetention
} from "../src/modules/fundamental-evidence/fundamentalDocumentRetentionAction.policy.js";

console.log(
  "===== FUND-010F14J — ADMIN RETENTION ACTION POLICY TEST ====="
);

const authorized =
  authorizeFundamentalDocumentRetention({
    actor: {
      id:
        "admin-test-user",
      role:
        "ADMIN"
    },
    confirmed:
      true,
    reason:
      "Retain validated issuer annual report evidence."
  });

assert.deepEqual(
  authorized.actor,
  {
    id:
      "admin-test-user",
    role:
      "ADMIN"
  }
);

assert.equal(
  authorized.confirmed,
  true
);

assert.equal(
  authorized.reason,
  "Retain validated issuer annual report evidence."
);

console.log(
  "PASS — explicit ADMIN retention action authorized."
);

assert.throws(
  () =>
    authorizeFundamentalDocumentRetention({
      actor: {
        id:
          "user-test",
        role:
          "USER"
      },
      confirmed:
        true,
      reason:
        "Test"
    }),
  /Administrator authority is required/
);

console.log(
  "PASS — non-admin actor rejected."
);

assert.throws(
  () =>
    authorizeFundamentalDocumentRetention({
      actor: {
        id:
          "",
        role:
          "ADMIN"
      },
      confirmed:
        true,
      reason:
        "Test"
    }),
  /persisted actor is required/
);

console.log(
  "PASS — missing persisted actor rejected."
);

assert.throws(
  () =>
    authorizeFundamentalDocumentRetention({
      actor: {
        id:
          "admin-test-user",
        role:
          "ADMIN"
      },
      confirmed:
        false,
      reason:
        "Test"
    }),
  /Explicit confirmation is required/
);

console.log(
  "PASS — missing explicit confirmation rejected."
);

assert.throws(
  () =>
    authorizeFundamentalDocumentRetention({
      actor: {
        id:
          "admin-test-user",
        role:
          "ADMIN"
      },
      confirmed:
        true,
      reason:
        "   "
    }),
  /retention reason is required/
);

console.log(
  "PASS — missing retention reason rejected."
);

console.log(
  "F10F14J_DOCUMENT_WRITE=NONE"
);
console.log(
  "F10F14J_DOCUMENT_DOWNLOAD=NONE"
);
console.log(
  "F10F14J_PROVIDER_CALL=NONE"
);
console.log(
  "F10F14J_PROVIDER_COST=ZERO"
);
console.log(
  "F10F14J_DATABASE_MUTATION=NONE"
);
console.log(
  "F10F14J_FUNDAMENTAL_MUTATION=NONE"
);
console.log(
  "F10F14J_VERIFICATION=NONE"
);
console.log(
  "F10F14J_APPROVAL=NONE"
);
console.log(
  "F10F14J_PROMOTION=NONE"
);
console.log(
  "F10F14J_PUBLICATION=NONE"
);

console.log(
  "===== FUND-010F14J PASS ====="
);
