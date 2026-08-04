PC-024D — Fundamental Data Import Dashboard

File:

  app/fundamental-import.js

Route:

  http://localhost:8081/fundamental-import

The screen supports:

- CSV input
- normalized JSON input
- provider JSON input
- GENERIC_PROVIDER adapter
- PREVIEW, MERGE, and REPLACE modes
- validation errors and warnings
- unknown-field reporting
- repository records
- data-quality scores
- research-readiness status
- EPS, book value, FCF, dividend, valuation, and growth details

Required earlier modules:

- PC-024A fundamentalDataEngine.js
- PC-024B repository and seed loader
- PC-024C import service and provider adapters
- @react-native-async-storage/async-storage

No financial value is invented. Blank input values remain null.
