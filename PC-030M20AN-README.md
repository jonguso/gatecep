# PC-030M20AN — Runtime Market Symbol Canonicalization

Purpose: stop external/provider aliases such as EQTY from leaking back into investor-facing runtime state after PC-030M20AL/M20AM established EQT as GateCEP's canonical Equity symbol.

Changes are applied in place by the controlled apply script. The script is idempotent and preserves external/raw aliases.

Runtime rules:
- Market/security master resolves aliases generically and returns canonical symbols.
- Provider quote input EQTY becomes canonical EQT before it reaches investor-facing consumers.
- Trade route selection, security selection, Practice/REAL holding lookup and basket lookup compare canonical identities on both sides.
- Raw/provider aliases remain accepted and are not rewritten in source evidence.
- No REAL or Practice portfolio mutation is introduced.

Install from ~/gatecep, then run apply and verify scripts.
