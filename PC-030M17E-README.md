# PC-030M17E — Canonical Performance route

- Removes the duplicate Performance tab from the Portfolio Home screen.
- Keeps `/performance` as the single investor-facing Performance implementation.
- Portfolio Analysis and the main Menu both open `/performance`.
- `returnTo=analysis` only controls where the Back action returns; it does not create another screen.
- The legacy `/portfolio-performance` route redirects to `/performance` for bookmark compatibility.

Run `bash scripts/verify-pc030m17e-canonical-performance-route.sh` from `mobile`.
