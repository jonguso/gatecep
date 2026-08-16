# GateCEP REAL / Practice Runtime Separation

This apply set makes Practice an explicit educational demo only. A missing or
expired authentication session can no longer select Practice, create successful
empty REAL responses, or generate analytics from demo data.

## Runtime contract

- Dashboard and Portfolio Hub remain in REAL mode.
- Missing authentication requires sign-in.
- Expired authentication may show only explicitly labeled last-verified REAL
  data; it never falls back to Practice.
- Verified REAL caches are scoped by account/broker selection.
- Unified Analytics blocks when REAL data is unavailable instead of generating
  zero or Practice-derived scores.
- Practice remains reachable only through its separate educational routes.
- Unverified or sandbox broker mirrors are unavailable, not "Out of Sync."
- Dividend analytics honor the explicit portfolio passed by REAL analytics.

## Apply

Extract this archive from the `mobile` directory so its `app`, `src`, and
`scripts` paths replace the matching project files.

## Verify

```bash
chmod +x scripts/verify-real-practice-separation.sh
bash scripts/verify-real-practice-separation.sh
```

The verifier runs the runtime scenarios, visible route audit, and Expo web
export. The Node VM Modules warning is expected and does not indicate failure.
