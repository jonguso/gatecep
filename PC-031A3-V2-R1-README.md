# PC-031A3-V2-R1 — Robust verifier maintenance

The first V2 patch matched the stale verifier block too literally.
This repair uses stable markers instead of exact full-block text.

Only the verifier script is changed. Runtime application code is untouched.
