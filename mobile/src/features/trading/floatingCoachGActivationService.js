// PC-030M20AU4B — canonical Floating Coach activation bridge
let pendingRequest = null;
const listeners = new Set();

export function requestFloatingCoachGOpen(payload = {}) {
  const request = {
    type: "OPEN_FLOATING_COACH_G",
    requestedAt: Date.now(),
    source: payload?.source || "UNKNOWN",
    question: String(payload?.question || "").trim() || null,
    context: payload?.context || null
  };

  pendingRequest = request;

  for (const listener of listeners) {
    try {
      listener(request);
    } catch (error) {
      console.warn("Floating Coach activation listener failed:", error);
    }
  }

  return request;
}

export function subscribeFloatingCoachGOpen(listener) {
  if (typeof listener !== "function") return () => {};
  listeners.add(listener);

  if (pendingRequest) {
    const request = pendingRequest;
    pendingRequest = null;
    try {
      listener(request);
    } catch (error) {
      console.warn("Floating Coach pending activation failed:", error);
    }
  }

  return () => listeners.delete(listener);
}

export function consumePendingFloatingCoachGOpen() {
  const request = pendingRequest;
  pendingRequest = null;
  return request;
}

export const FLOATING_COACH_G_ACTIVATION_INTEGRITY = Object.freeze({
  uiOnly: true,
  mutatesRealPortfolio: false,
  mutatesPracticePortfolio: false,
  mutatesInvestorDNA: false,
  mutatesGoals: false,
  brokerExecutionAllowed: false
});
