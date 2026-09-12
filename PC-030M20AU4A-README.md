# PC-030M20AU4A — Runtime-State-Aware Floating Coach Activation

M20AU4 failed because its installer assumed the canonical Floating Coach still used the exact declaration `const [open, setOpen] = useState(false)`.

AU4A removes that assumption. It discovers the current boolean state that actually controls the Floating Coach modal or conditional render and uses its real setter. If a question/input state is discoverable, the selected recovery question is prefilled.

The existing M20AT decision-conversation session remains authoritative. No portfolio, goal, Investor DNA, Practice, FIFO, or broker execution logic changes.
