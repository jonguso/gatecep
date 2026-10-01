import fs from "node:fs";

const menu = fs.readFileSync(
  new URL("../app/menu.js", import.meta.url),
  "utf8"
);

const funds = fs.readFileSync(
  new URL("../app/(tabs)/funds.js", import.meta.url),
  "utf8"
);

const orders = fs.readFileSync(
  new URL("../app/orders-review.js", import.meta.url),
  "utf8"
);

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`PASS: ${message}`);
}

const primaryMatch = menu.match(
  /title:\s*"Primary"[\s\S]*?items:\s*\[/
);

assert(
  Boolean(primaryMatch),
  "Primary menu section remains present"
);

assert(
  !primaryMatch?.[0]?.includes("initiallyOpen: true"),
  "Primary menu is collapsed by default"
);

assert(
  menu.includes("initiallyOpen={section.initiallyOpen}"),
  "Menu still delegates manual expand/collapse to CollapsibleSection"
);

assert(
  funds.includes('String(params?.returnTo || "").toUpperCase()') &&
    funds.includes('"ORDERS_REVIEW"'),
  "Practice Funds recognizes explicit Orders Review return context"
);

assert(
  funds.includes('? "Back to Orders Review"') ||
    funds.includes('? "Back to Orders Review"'),
  "Practice Funds exposes Back to Orders Review label"
);

assert(
  funds.includes('? "/orders-review"') ||
    funds.includes('? "/orders-review"'),
  "Practice Funds returns to canonical Orders Review route"
);

assert(
  funds.includes(': "Back to Practice Portfolio"'),
  "Direct Practice Funds access preserves Back to Practice Portfolio"
);

assert(
  funds.includes(': "/(tabs)/dashboard"'),
  "Direct Practice Funds access preserves Practice Portfolio destination"
);

const practiceFundsRoutes =
  orders.match(
    /\/\(tabs\)\/funds\?source=PRACTICE[^"'`]*/g
  ) || [];

assert(
  practiceFundsRoutes.length >= 5,
  "Orders Review retains its Practice Funds actions"
);

assert(
  practiceFundsRoutes.every((route) =>
    route.includes("returnTo=ORDERS_REVIEW")
  ),
  "Every Orders Review Practice Funds action carries explicit return context"
);

assert(
  orders.includes(
    "returnTo=ORDERS_REVIEW&amount=${encodeURIComponent("
  ),
  "Funding amount route preserves amount prefill with return context"
);

assert(
  !funds.includes("router.replace(params?.returnTo") &&
    !funds.includes("router.push(params?.returnTo"),
  "Practice Funds does not execute an arbitrary return route parameter"
);

assert(
  funds.includes("updatePracticeFunds(") &&
    funds.includes("savePracticePortfolio("),
  "Existing Practice funding mutation path remains present"
);

if (process.exitCode) {
  console.error(
    "PC-031B4M7C5D7I4 CONTRACT: FAIL"
  );
} else {
  console.log(
    "PC-031B4M7C5D7I4 CONTRACT: PASS"
  );
}
