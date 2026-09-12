PC-030M20AV2F4A — Canonical Broker Convergence Verifier Hotfix

F4 runtime changes already applied successfully.

The original F4 Node test imported brokerAccountStore.js directly. That store depends
on React Native/userStorage imports that Node's standalone ESM runner does not resolve
the same way Expo does. This hotfix changes only the verification harness: it inspects
the runtime source contract without importing the React Native storage dependency.

No GateCEP runtime code, migration behavior, navigation, fee logic, or package.json
is changed.
