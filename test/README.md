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
Test 13 checks the effluent Scenario 1 and 2 models against the cached cells of
the reference workbooks, NUREG/CR-5814 Tables A.16, A.21 and B.7, input
validation and the full `EFFLUENT.evaluate` chain with the shipped data. Test 14 checks the
`REGULATORY` lookups (statuses, composite entries, IS-28 individual levels).

Reference anchors come from the sources identified alongside each test. A green
suite demonstrates that the implemented calculations reproduce those anchors;
it is not a substitute for independent clinical or regulatory validation.

## `validate-data.js`

Checks curated half-lives, published Cornejo constants, the actual
`PHYSICS.ICRU57` table, material densities, RD 1217/2024 clearance levels,
filtered photon counts, adult ingestion coefficients and liquid-effluent
formula consistency, and the effluent Scenario 1 and 2 coefficients (ICRP 119
G.1, PHITS reports, NUREG Table A.21) and workbook defaults, and the RD 1217/2024
Annex IV tables and adult e(g) of `regulatory.json` against hand-entered BOE values.

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
- deep equality of `nuclides.json` and `nuclides-data.js`, and of the effluent
  data file and its JS twin;
- effluent page navigation, precache, packaging and report wiring;
- empty, partial and offline database fallback behavior;
- service-worker cache-first and explicit offline responses;
- keyboard-accessible tooltips and dynamic light/dark chart themes;
- JavaScript syntax of the inline application scripts;
- Test 13, the caregiver page: reproduction of the source workbook
  *Dosis_acompanantes_simple_v2.1.xlsx* (preloaded case, inverse calculations,
  29-point curve, self-check and the nine workbook v6 reference cases),
  validation messages and inverse branches, the review fixes of v1.9.1, the
  kinetics presets and the reproduction of the Foro CSN-SEPR-SEFM (2011) Tables
  3.B 3 and 3.B 4 with the I-131 presets (Tef = 1/λ);
- Test 14, the regressions of the 2026-10-14 audit: linear chart axes in Decay
  and Dose (N-01, N-08), beta endpoint and beta yield from the ICRP 107 BET
  file (N-02), the 0-day caregiver solution (N-07) and service-worker
  registration on every page (N-09).

These are focused regressions, not a general HTML conformance or browser
end-to-end suite: they run the production modules and inspect the page
sources, but they do not render the pages — a chart drawn on the wrong axis
(N-01) passes them. `node tools/browser-smoke.js` covers that layer: it renders
the six pages in headless Chrome/Edge and checks console errors, overflow at
1280/390 px, that every Chart.js point lies inside its axes (no category axes),
key values of the acceptance cases and the dark-mode toggle. Run against
v1.10.0 it reports the N-01, N-02, N-06 and N-08 defects; it needs a local
Chrome or Edge, so it is a tool, not a fifth suite. Printing, PWA installation,
offline reload and `content://` remain manual (ACCEPTANCE_TEST). The manual and independent checks remain in
`docs/ACCEPTANCE_TEST.md`.

## Expected baseline

The exact totals can increase when regressions are added. Treat exit status and
`0 failed` as the contract; when a documented total changes, update this file and
the audit report in the same change.
