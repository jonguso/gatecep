# PC-030M20AR2 — Broker Action Plan Regression Contract Correction

Verification-only correction. No application code is changed.

M20AR compacted the Broker Action Plan route object from an older whitespace form such as `mode: "BROKER_PLAN"` to `mode:"BROKER_PLAN"`. The prior M20AR1 AQ3 verifier incorrectly treated formatting whitespace as part of the runtime contract.

M20AR2 verifies the semantic contract with whitespace-tolerant matching and also confirms the `basket-execution` destination and investor-facing `Review Broker Action Plan` control remain present.
