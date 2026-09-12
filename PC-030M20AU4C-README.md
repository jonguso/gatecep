# PC-030M20AU4C — Decision Lab Modal → Floating Coach Handoff

M20AU4B verified that the Floating Coach listener, `open/setOpen`, and `setQuestion`
are wired. Live UAT still showed nothing because the recovery selector runs inside
the Decision Lab modal. Opening the global Floating Coach while that modal remains
visible can leave Coach G behind it.

AU4C closes the existing Decision Lab modal first using the already-present
`setConversationOpen(false)`, then opens the canonical Floating Coach on the next
event-loop turn. The existing M20AT conversation session remains authoritative.

No goal, Investor DNA, REAL/Practice portfolio, FIFO, or broker execution logic changes.
