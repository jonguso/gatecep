function nairobiParts(now = new Date()) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Nairobi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    weekday: values.weekday,
    minutes: Number(values.hour) * 60 + Number(values.minute)
  };
}

export function getNairobiMarketClock(now = new Date()) {
  return nairobiParts(now);
}

export function isEodCollectionDue({ now = new Date(), latestMarketDate = null } = {}) {
  const clock = nairobiParts(now);
  const closeHour = Number(process.env.MARKET_EOD_COLLECTION_HOUR || 15);
  const closeMinute = Number(process.env.MARKET_EOD_COLLECTION_MINUTE || 20);
  if (["Sat", "Sun"].includes(clock.weekday)) return false;
  if (clock.minutes < closeHour * 60 + closeMinute) return false;
  return !latestMarketDate || String(latestMarketDate).slice(0, 10) < clock.date;
}
