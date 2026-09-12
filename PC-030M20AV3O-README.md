# PC-030M20AV3O — Residual Screen Discovery & Wave Classification

AV3N1 established that 40 genuine investor-facing residual screens remain after
AV3B–AV3M.

AV3O is discovery-only. It does not patch application code.

It inspects those 40 live files and records:
- functional category;
- LOW / MEDIUM / HIGH change-risk classification;
- existing ScrollView / FlatList / MobileScreen / StickyActionBar usage;
- current `content` style shape;
- navigation calls;
- mutation-like service calls;
- financial/broker/portfolio boundary imports;
- investor action words.

The purpose is to build the remaining responsive work in controlled waves rather
than apply one generic patch across screens with very different business impact.

Proposed wave discipline:
1. READ_MOSTLY_INVESTOR screens first.
2. GENERAL_INVESTOR / EDIT_OR_PLANNING next after exact-source review.
3. CONSEQUENTIAL_WORKFLOW screens only with contract-specific verifiers.
4. DEV_ADMIN_UTILITY separately.
5. Auth/onboarding/setup remains outside this residual investor series.

Outputs:
- mobile/.pc030m20av3o-residual-discovery.txt
- mobile/.pc030m20av3o-residual-discovery.json
