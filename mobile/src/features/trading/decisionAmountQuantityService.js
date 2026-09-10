// PC-030M20AT2 — Decision Amount → Approximate Quantity Handoff
// Pure calculation only. Never broker execution evidence. Never overwrites a manual quantity.

const n = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
const upper = (v) => String(v || "").trim().toUpperCase();

export function deriveApproximateScenarioQuantity({
  side,
  decisionAmount,
  currentPrice,
  availableQuantity = null,
  percentChargeRate = 0,
  fixedCharges = 0,
  existingQuantityText = ""
} = {}) {
  if (String(existingQuantityText ?? "").trim() !== "") {
    return { available:false, reason:"MANUAL_QUANTITY_PRESENT" };
  }

  const amount=n(decisionAmount);
  const price=n(currentPrice);
  if (!(amount>0)) return { available:false, reason:"VALID_DECISION_AMOUNT_REQUIRED" };
  if (!(price>0)) return { available:false, reason:"VALID_PRICE_REQUIRED" };

  const action=upper(side)==="SELL" ? "SELL" : "BUY";

  if (action==="SELL") {
    let quantity=Math.floor(amount/price);
    if (!(quantity>0)) return { available:false, reason:"AMOUNT_TOO_SMALL_FOR_ONE_SHARE" };

    const holding=n(availableQuantity);
    let wasCapped=false;
    if (holding>0 && quantity>Math.floor(holding)) {
      quantity=Math.floor(holding);
      wasCapped=true;
    }

    return {
      available:quantity>0,
      action,
      quantity,
      grossValue:quantity*price,
      estimatedTotalCost:null,
      wasCapped,
      reason:quantity>0 ? "APPROXIMATE_SELL_QUANTITY" : "NO_SELLABLE_QUANTITY"
    };
  }

  const rate=Math.max(0,n(percentChargeRate));
  const fixed=Math.max(0,n(fixedCharges));
  const budget=Math.max(0,amount-fixed);

  let quantity=Math.floor(budget/(price*(1+rate)));
  if (!(quantity>0)) return { available:false, reason:"AMOUNT_TOO_SMALL_FOR_ONE_SHARE_WITH_CHARGES" };

  let estimatedTotalCost=0;
  while (quantity>0) {
    const gross=quantity*price;
    estimatedTotalCost=gross+(gross*rate)+fixed;
    if (estimatedTotalCost<=amount+0.000001) break;
    quantity-=1;
  }

  return {
    available:quantity>0,
    action,
    quantity,
    grossValue:quantity*price,
    estimatedTotalCost,
    wasCapped:false,
    reason:quantity>0 ? "APPROXIMATE_BUY_QUANTITY" : "NO_AFFORDABLE_QUANTITY"
  };
}
