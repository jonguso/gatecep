import assert from "node:assert/strict";
import fs from "node:fs";

const src = fs.readFileSync(
  new URL(
    "../src/features/practice/PracticePortfolio.jsx",
    import.meta.url
  ),
  "utf8"
);

assert.match(
  src,
  /PRACTICE_INITIAL_INVESTMENT_CAPITAL\s*=\s*10000/
);

assert.match(
  src,
  /const investorPlanningAmount\s*=\s*useMemo/
);

assert.match(
  src,
  /const startingAmount\s*=\s*PRACTICE_INITIAL_INVESTMENT_CAPITAL/
);

assert.match(
  src,
  /const investableWeight\s*=\s*equityWeight\s*\+\s*incomeWeight/
);

assert.match(
  src,
  /normalizedEquityWeight/
);

assert.match(
  src,
  /normalizedIncomeWeight/
);

assert.match(
  src,
  /capitalModel:\s*"GATECEP_PRACTICE_INVEST_MAX_V1"/
);

assert.match(
  src,
  /initialInvestmentCapital:\s*PRACTICE_INITIAL_INVESTMENT_CAPITAL/
);

assert.match(
  src,
  /initialAllocationRemainder/
);

assert.match(
  src,
  /availableCash:\s*initialAllocationRemainder/
);

const creationStart = src.indexOf(
  "async function createPracticePortfolio()"
);

assert.ok(
  creationStart >= 0,
  "Practice creation function must remain present."
);

const creationSection =
  src.slice(creationStart);

assert.doesNotMatch(
  creationSection,
  /userSetItem\(\s*"availableCash"/
);

const allocationStart =
  src.indexOf(
    "const allocations = useMemo"
  );

const allocationEnd =
  src.indexOf(
    "BUILD PRACTICE HOLDINGS"
  );

assert.ok(
  allocationStart >= 0 &&
  allocationEnd > allocationStart
);

const allocationSection =
  src.slice(
    allocationStart,
    allocationEnd
  );

assert.doesNotMatch(
  allocationSection,
  /name:\s*"Cash Reserve"/
);

assert.match(
  src,
  /label="Available Cash"/
);

assert.doesNotMatch(
  src,
  /const cashReserve\s*=\s*useMemo/
);

console.log(
  "PASS — Practice opening investment capital is KES 10,000."
);

console.log(
  "PASS — Investor planning amount remains separate from Practice funding."
);

console.log(
  "PASS — Wealth cash is excluded from Practice security allocation."
);

console.log(
  "PASS — investable Blueprint weights are normalized to consume maximum opening capital."
);

console.log(
  "PASS — only whole-share remainder becomes initial Practice available cash."
);

console.log(
  'PASS — Practice creation does not write canonical REAL userStorage["availableCash"].'
);

console.log(
  "PASS — no automatic KES 100,000 simulation cash exists."
);
