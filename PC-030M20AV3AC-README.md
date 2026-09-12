# PC-030M20AV3AC — Transaction Import Responsive Calibration

AV3W1 confirmed `/transaction-import` is canonically reachable from current broker
upload/broker surfaces.

This package targets only:
- app/transaction-import.js

Responsive changes:
- width: 100%
- maxWidth: 960
- alignSelf: center
- paddingBottom: 128

Protected evidence rules:
- safe import file/row checks remain required;
- broker executions are partitioned through `partitionBrokerExecutionEvidence`;
- only verified evidence is stored in `transactionHistory`;
- incomplete/manual records remain in `unverifiedTransactionHistory`;
- `transactionsUploaded` is true only when verified evidence exists;
- the canonical portfolio ledger rebuild remains after evidence persistence;
- completion still returns to Portfolio Sync Center.

No execution status policy, FIFO logic, lot construction, portfolio mutation, or REAL
broker execution semantics are changed.
