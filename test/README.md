# Validation tests

The repository has four complementary Node.js suites. Run all four after any
change to application logic, data, reports, PWA behavior or documentation that
describes numerical results.

```bash
node test/validate-math.js
node test/validate-data.js
node test/validate-constants.js
node test/validate-app.js
```

Every suite exits with code 0 on success and non-zero on a failure.

## `validate-math.js`

Exercises the production `PHYSICS` and `CALC` modules: dose constants, decay,
HVL/TVL, attenuation, spectrum-weighted transmission, separate H*(10) and
H'(0.07) spectra, build-up factors, the lead K edge and numerical solvers.

Reference anchors come from the sources identified alongside each test. A green
suite demonstrates that the implemented calculations reproduce those anchors;
it is not a substitute for independent clinical or regulatory validation.

## `validate-data.js`

Checks curated half-lives, published Cornejo constants, the actual
`PHYSICS.ICRU57` table, material densities, RD 1217/2024 clearance levels,
filtered photon counts, adult ingestion coefficients and liquid-effluent
formula consistency.

The ICRU57 checks load `js/data.js` through `vm`; they do not validate a copied
table. Selected published anchors remain independent assertions.

## `validate-constants.js`

Cross-checks the 1,252-entry ICRP 107 database and selected curated nuclides. Its
summary distinguishes `passed`, `failed` and `warned`: known ICRP-107 versus
Cornejo differences are warnings and are deliberately not counted as passes.
Gamma-constant comparisons use the explicit absolute tolerance in the test,
currently 0.1 in the stored units.

## `validate-app.js`

Covers integration and structure outside the mathematical modules:

- H'(0.07) table/chart wiring and threshold-safe report formatting;
- canonical URL aliases and curated-database precedence;
- input-state validation and visible data-load failures;
- deep equality of `nuclides.json` and `nuclides-data.js`;
- empty, partial and offline database fallback behavior;
- service-worker cache-first and explicit offline responses;
- keyboard-accessible tooltips and dynamic light/dark chart themes;
- JavaScript syntax of the inline application scripts.

These are focused regressions, not a general HTML conformance or browser
end-to-end suite. The manual and independent checks remain in
`docs/ACCEPTANCE_TEST.md`.

## Expected baseline

The exact totals can increase when regressions are added. Treat exit status and
`0 failed` as the contract; when a documented total changes, update this file and
the audit report in the same change.
