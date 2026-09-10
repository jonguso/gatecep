# PC-030M20AR5 — M20AR4 Decision Lab Render Regression Correction

Verification-only correction. M20AR4 intentionally changed the Trading render from
`<DecisionLabHome data={data} />` to `<DecisionLabHome data={data} entryParams={entryParams} />`
so recovery recommendation context can continue in the common Coach G conversation.

The older AQ3 verifier still required the exact pre-M20AR4 JSX string and therefore
reported `Active Account / Decision Lab render missing` even though the component is present.

M20AR5 changes no application code. It makes the AQ3 regression locate DecisionLabHome
semantically while preserving all existing ordering, subtitle, broker UI, Broker Action Plan,
and dedicated broker-route checks.
