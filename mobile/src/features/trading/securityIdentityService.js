// PC-030M20AL — Canonical Security Identity & Symbol Alias Normalization
// Source symbols are never overwritten. Downstream analytical services consume canonicalSymbol.

const text = (value) => String(value ?? "").trim();

const SECURITY_IDENTITIES = Object.freeze({
  EQT: Object.freeze({
    canonicalSymbol: "EQT",
    name: "Equity Group Holdings PLC",
    aliases: Object.freeze(["EQT", "EQTY", "EQTYO0000"])
  })
});

const aliasToCanonical = new Map();
for (const identity of Object.values(SECURITY_IDENTITIES)) {
  for (const alias of identity.aliases) {
    const key = text(alias).toUpperCase().replace(/\s+/g, "");
    const existing = aliasToCanonical.get(key);
    if (existing && existing !== identity.canonicalSymbol) {
      throw new Error(`Security alias collision: ${alias} maps to both ${existing} and ${identity.canonicalSymbol}`);
    }
    aliasToCanonical.set(key, identity.canonicalSymbol);
  }
}

export function canonicalizeSecuritySymbol(value) {
  const rawSymbol = text(value).toUpperCase();
  const lookup = rawSymbol.replace(/\s+/g, "");
  const canonicalSymbol = aliasToCanonical.get(lookup) || rawSymbol;
  return {
    rawSymbol,
    canonicalSymbol,
    aliasApplied: !!rawSymbol && canonicalSymbol !== rawSymbol,
    identity: SECURITY_IDENTITIES[canonicalSymbol] || null
  };
}

export function canonicalSecuritySymbol(value) {
  return canonicalizeSecuritySymbol(value).canonicalSymbol;
}

export function securityIdentityFor(value) {
  return canonicalizeSecuritySymbol(value).identity;
}

export function listSecurityIdentities() {
  return Object.values(SECURITY_IDENTITIES).map((item) => ({
    canonicalSymbol: item.canonicalSymbol,
    name: item.name,
    aliases: [...item.aliases]
  }));
}

export function assertNoSecurityAliasCollisions() {
  // Module initialization already enforces collision safety.
  return true;
}
