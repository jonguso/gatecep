# PC-030M20AU4B — Floating Coach Activation Syntax Correction

M20AU4A did not modify application source because its installer contained a Python quoting/escaping syntax error.

AU4B corrects the installer and keeps the runtime-state-aware approach. It discovers the actual boolean state controlling the current canonical `FloatingCoachG` modal or conditional render rather than assuming the state variable is named `open`.

The M20AT conversation session is still created first. `Answer Coach G` then sends a UI-only activation request to the canonical Floating Coach. If the current component exposes a question/input state, the selected recovery question is prefilled.

All source edits are assembled and validated before either application file is written. No goal, Investor DNA, REAL/Practice portfolio, FIFO, or broker execution logic changes.
