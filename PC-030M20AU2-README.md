# PC-030M20AU2 — DecisionLabHome-Anchored Installer Correction

M20AU1 failed because it depended on discovering a specific existing conversation-open state variable. AU2 removes that dependency and anchors the new selector state directly inside `DecisionLabHome`.

The recovery selector is inserted before the existing Action form, while the form remains available behind `Create my own what-if`. No recovery logic, accounting, FIFO, goal, Investor DNA, portfolio, execution, or Broker Action Plan semantics are changed.
