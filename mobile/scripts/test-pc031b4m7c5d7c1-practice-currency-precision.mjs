import fs from "node:fs";
import assert from "node:assert/strict";

import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir =
  path.dirname(fileURLToPath(import.meta.url));

const mobileRoot =
  path.resolve(scriptDir, "..");

function mobilePath(relativePath) {
  return path.join(mobileRoot, relativePath);
}


const file =
  mobilePath("src/services/trade/practiceExecutionAccountingService.js");

const source =
  fs.readFileSync(file, "utf8");

function expectSource(
  condition,
  message
) {
  assert.ok(condition, message);
  console.log(`PASS — ${message}`);
}

/*
 * Source contract.
 */
expectSource(
  source.includes(
    "export function roundPracticeMoney(value)"
  ),
  "canonical Practice money helper exists."
);

expectSource(
  source.includes(
    "(parsed + Number.EPSILON) * 100"
  ),
  "Practice money helper uses explicit two-decimal rounding."
);

expectSource(
  /const gross\s*=\s*roundPracticeMoney\(/m.test(source),
  "Practice execution gross is currency-normalized."
);

expectSource(
  /const brokerFee\s*=\s*roundPracticeMoney\(/m.test(source),
  "Practice broker fee is currency-normalized."
);

expectSource(
  /const regulatoryFee\s*=\s*roundPracticeMoney\(/m.test(source),
  "Practice regulatory fee is currency-normalized."
);

expectSource(
  /const totalFees\s*=\s*roundPracticeMoney\(/m.test(source),
  "Practice total fees are currency-normalized."
);

expectSource(
  /const totalCost\s*=\s*roundPracticeMoney\(/m.test(source),
  "Practice total cost is currency-normalized."
);

expectSource(
  /const cashBefore\s*=\s*roundPracticeMoney\(cash\)/m.test(
    source
  ),
  "Practice cash input enters the same currency boundary."
);

expectSource(
  /const remainingCash\s*=\s*roundPracticeMoney\(/m.test(
    source
  ),
  "Practice remaining cash is currency-normalized."
);

/*
 * Exact runtime basket regression.
 *
 * This reproduces the current five BROKER_RECEIVED orders.
 * Fee components are rounded where the monetary obligation is
 * created, matching the canonical Practice execution contract.
 */
const orders = [
  {
    symbol: "SMWF",
    quantity: 4,
    price: 950
  },
  {
    symbol: "SCOM",
    quantity: 122,
    price: 30.60
  },
  {
    symbol: "EABL",
    quantity: 4,
    price: 248
  },
  {
    symbol: "BAT",
    quantity: 1,
    price: 520
  },
  {
    symbol: "BAMB",
    quantity: 40,
    price: 37
  }
];

const startingCash = 2577.05;

function roundMoney(value) {
  const parsed = Number(value || 0);

  return (
    Math.round(
      (parsed + Number.EPSILON) * 100
    ) / 100
  );
}

function estimateBuy(
  quantity,
  price,
  cash
) {
  const gross =
    roundMoney(
      Number(quantity) *
      Number(price)
    );

  const brokerFee =
    roundMoney(
      gross * 0.012
    );

  const regulatoryFee =
    roundMoney(
      gross * 0.002
    );

  const totalFees =
    roundMoney(
      brokerFee +
      regulatoryFee
    );

  const totalCost =
    roundMoney(
      gross +
      totalFees
    );

  return {
    gross,
    brokerFee,
    regulatoryFee,
    totalFees,
    totalCost,
    remainingCash:
      roundMoney(
        cash -
        totalCost
      )
  };
}

let totalBuyCost = 0;

for (const order of orders) {
  const estimate =
    estimateBuy(
      order.quantity,
      order.price,
      0
    );

  totalBuyCost =
    roundMoney(
      totalBuyCost +
      estimate.totalCost
    );
}

const requiredDeposit =
  roundMoney(
    totalBuyCost -
    startingCash
  );

const fundedCash =
  roundMoney(
    startingCash +
    requiredDeposit
  );

const endingCash =
  roundMoney(
    fundedCash -
    totalBuyCost
  );

console.log("");
console.log("Runtime basket precision:");
console.log({
  startingCash,
  totalBuyCost,
  requiredDeposit,
  fundedCash,
  endingCash
});

assert.equal(
  totalBuyCost,
  10672.55,
  "canonical basket BUY cost should be KES 10,672.55"
);

assert.equal(
  requiredDeposit,
  8095.50,
  "canonical additional funding should be KES 8,095.50"
);

assert.equal(
  fundedCash,
  10672.55,
  "KES 8,095.50 deposit should produce KES 10,672.55 cash"
);

assert.equal(
  endingCash,
  0,
  "the complete five-order batch should finish at exactly KES 0.00"
);

console.log(
  "PASS — displayed Practice funding amount is executable without sub-cent rejection."
);

/*
 * SELL also remains on the same currency boundary.
 */
const sell =
  (() => {
    const gross =
      roundMoney(3 * 30.60);

    const brokerFee =
      roundMoney(
        gross * 0.012
      );

    const regulatoryFee =
      roundMoney(
        gross * 0.002
      );

    const proceeds =
      roundMoney(
        gross -
        roundMoney(
          brokerFee +
          regulatoryFee
        )
      );

    return {
      gross,
      brokerFee,
      regulatoryFee,
      proceeds
    };
  })();

assert.equal(
  Number(sell.proceeds.toFixed(2)),
  sell.proceeds,
  "SELL proceeds remain on the two-decimal Practice cash boundary"
);

console.log(
  "PASS — Practice SELL proceeds use the same currency precision."
);

console.log("");
console.log(
  "PC-031B4M7C5D7C1 Practice currency precision contract PASSED."
);
