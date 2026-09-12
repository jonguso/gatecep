# PC-030M20AU4 — Selected Recovery → Floating Coach Activation

UAT confirmed M20AU3 selection and option-specific reasoning, but `Answer Coach G` did not visibly open the conversational reply surface.

M20AU4 adds a UI-only activation bridge. The existing M20AT decision-conversation session is created first, then the canonical global `FloatingCoachG` receives an explicit open request and prefills the selected recovery question.

No second Coach G UI is introduced. This patch does not change goals, Investor DNA, REAL/Practice portfolios, FIFO evidence, or broker execution state.
