# PC-030M20AV3T — Practice Queue Manager Responsive Calibration

AV3T targets only:
- `app/queue-manager.js`

The AV3O audit showed Queue Manager uses:
`content: { padding: 22, paddingTop: 70, paddingBottom: 110 }`.

AV3T replaces that exact style anchor with:
- width: 100%
- maxWidth: 960
- alignSelf: center
- padding: 22
- paddingTop: 70
- paddingBottom: 128

No broad fallback patching is used.

Contract verification protects Queue Manager's existing boundary:
- it is a Practice-only lifecycle simulator;
- nothing is sent to a REAL broker;
- it does not create REAL execution evidence;
- simulated routing uses `GATECEP_PRACTICE`;
- simulated fills remain tagged `PRACTICE_SIMULATION`;
- the existing basket execution lifecycle/store remains unchanged.

`app/index.js` is intentionally not patched by AV3T. It is a bootstrap/auth/setup
entry route rather than an ordinary investor content screen and should remain
outside this residual responsive patch series unless explicitly re-scoped.
