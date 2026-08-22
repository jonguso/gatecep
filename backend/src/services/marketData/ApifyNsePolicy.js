const clean = (value) => String(value ?? "").trim();

export function normalizeApifyActorId(value) {
  return clean(value)
    .replace(/^https?:\/\/console\.apify\.com\/actors\//i, "")
    .replace(/^https?:\/\/api\.apify\.com\/v2\/acts\//i, "")
    .replace(/\?.*$/, "")
    .replace(/\//g, "~");
}

function nairobiClock(now = new Date()) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Nairobi",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );
  return {
    weekday: values.weekday,
    minutes: Number(values.hour) * 60 + Number(values.minute)
  };
}

export function isNseTradingSession(now = new Date()) {
  const { weekday, minutes } = nairobiClock(now);
  return !["Sat", "Sun"].includes(weekday) && minutes >= 9 * 60 && minutes <= 15 * 60;
}

export function assertFreshApifyNseQuote(asOf, now = new Date()) {
  const timestamp = Date.parse(asOf || "");
  const intradayMaxAgeMinutes = Number(process.env.MARKET_DATA_MAX_AGE_MINUTES || 30);
  const closedMarketMaxAgeMinutes = Number(process.env.MARKET_DATA_CLOSED_MAX_AGE_MINUTES || 5760);
  const activeSession = isNseTradingSession(now);
  const maxAgeMinutes = activeSession ? intradayMaxAgeMinutes : closedMarketMaxAgeMinutes;
  if (!Number.isFinite(timestamp)) throw new Error("Apify NSE output is missing a valid upstream quote timestamp.");
  const ageMs = now.getTime() - timestamp;
  if (ageMs < -5 * 60 * 1000) throw new Error("Apify NSE output has an invalid future upstream quote timestamp.");
  if (ageMs > maxAgeMinutes * 60 * 1000) {
    throw new Error(
      activeSession
        ? "Apify NSE output is stale during the active NSE trading session."
        : "Apify NSE output is older than the allowed closed-market snapshot window."
    );
  }
}
