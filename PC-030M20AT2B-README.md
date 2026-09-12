# PC-030M20AT2B — existingHolding Initialization-Order Hotfix

Live UAT from News → Dividends → Simulation exposed:

`Cannot access 'existingHolding' before initialization`

M20AT2A inserted the auto-quantity `useEffect` before the later `const existingHolding = ...` declaration. Because `existingHolding` also appeared in the effect dependency array, JavaScript evaluated that binding during render and hit the temporal dead zone.

This hotfix only relocates that effect to after `existingHolding` is initialized and before FIFO analysis.

No calculation formulas, FIFO accounting, route semantics, or Broker Action Plan boundaries are changed. Non-Decision-Lab routes such as News/Dividends can render Trade Lab safely again.
