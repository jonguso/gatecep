# PC-030M20AT2 — Decision Amount → Approximate Quantity Handoff

When Decision Lab hands an intended KES amount into Trade Lab, quantity is now estimated automatically from the current scenario price.

Rules:
- SELL uses floor(decisionAmount/currentPrice), capped to actual held quantity.
- BUY reduces quantity so known percentage charges remain inside the intended amount.
- Existing/manual quantity always wins.
- Missing or invalid price never fabricates quantity.
- Helper text labels the result as approximate and editable.
- This is scenario convenience only, never broker execution evidence.
