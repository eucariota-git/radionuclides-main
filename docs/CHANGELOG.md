# Changelog — NM Radionuclide Planner

History of changes, newest first. **This file is a record, not a description of the current behaviour**: older entries describe methods that were later replaced — in particular the reconstructed h'(0.07) column (replaced by ICRP 74 Table A.21 in v1.7.0) and the automatic selection of H'(0.07) below 25 cm (removed in 2026-07; both quantities are always shown). For what the application does now, read `README.md` and `docs/USER_GUIDE.md`.

## 2026-10

### v1.9.0 — caregiver dose page
- New **Caregiver** page (`caregiver.html`, `js/caregiver.js`, `data/caregiver.json`): port of the workbook *Dosis_acompanantes_simple_v2.1.xlsx* — external dose to one caregiver or family member after discharge, two consecutive effective half-lives, day-time and sleeping cohabitation during and after a restriction, equal cycles, criteria per category, inverse calculations (maximum discharge rate, minimum and adopted restriction, floor), dose-vs-restriction curve, self-check, report and CSV. Reproduces the workbook to within 1e-9 (relative) on its preloaded case and its curve.
- Reports: the *Database* row and the ICRP 107 common source are printed only when the report uses them.

### v1.8.1 — audit 2026-10-04 (A01–A07)
- Decay: the target activity is validated before any result is shown; negative or non-numeric entries are rejected, and a target of zero is reported as never reached in finite time, on screen and in the report.
- Decay, Dose and Effluent: values that overflow after unit conversion or in the products are rejected instead of producing results.
- Documentation: the Archer fit is described consistently as transmission of dose at 1 cm depth in tissue; this history moved out of the README; acceptance sheet counts 15 cases and labels Y-90 as an experimental scenario.
- Notices: the Oumano article and the BOE texts are stated to be in the source repository, not in the package; the status of the ICRP 74 / ICRP 119 reuse permission is stated (not requested as of 2026-10-04).
- Data: `generated_at` and `last_modified_at` of `data/nuclides.json` are stamped consistently by the generators.

### v1.8.0 — copy audit 2026-10-03 (texts and labels, T01–T38)
- Dose: photon-less nuclides no longer imply that bremsstrahlung is the only external hazard; the Archer fit is described by its real quantity (dose at 1 cm depth in tissue); Y-90 and Archer results export a specific validity state instead of "within range".
- Decay: the concentration denominator is "Mass of material being assessed" (CSV columns `Material_mass_input` / `Material_mass_unit`, formerly `Vial_weight_*`).
- Guide: the shielded Tc-99m example and its "Safe" verdict were wrong and are replaced by a reproducible unshielded case; steps rewritten to the real controls. The in-app copy is generated from `docs/USER_GUIDE.md` (`tools/build-about-guide.js`).
- Decay and Dose: target-activity states, "inputs changed" notice, exports from the calculated snapshot, dose-equivalent wording, first HVL/TVL.
- Properties: provenance of the constants per quantity (`gamma_Kair_source`), reasons instead of dashes, corrected application texts.
- Effluent: receptor, geometries and retained fraction described as modelled; short input hints with the provenance in collapsible blocks.

### v1.7.0 — conversion table and audit 2026-10-03
- **Conversion coefficients now ICRP 74 (1996) Table A.21** for both h\*(10) and h'(0.07,0°): the former h\*(10) values above 1 MeV (untraced since the first commit) were 3–20 % low, and h'(0.07) was a reconstruction. Curated Γ and shielding spectra regenerated; 30 of 37 recalculated entries change (Na-24 +2.5 %, I-131 Γ^H'(0.07) +2.9 %).
- `tools/recalc-gamma.js` rewritten: uses the app's own table, keeps chain progeny (Ra-223, Ac-225), never overwrites `cornejo_validation`, dry run by default.
- Integrated dose uses −expm1(−λt)/λ (no cancellation for very long-lived nuclides).

## 2026-06

### Round 3 (v1.2) — buildup factors
- **Exposure build-up added to all narrow-beam shielding** (spectral and single-line): T = Σ wᵢ·min(1, B·e^(−μx)) with ANSI/ANS-6.4.3 point-isotropic exposure buildup factors (NUREG/CR-5740 Table 3; NRC/ORNL report released for unlimited distribution — the underlying ANSI/ANS-6.4.3 standard is © ANS — values transcribed programmatically and verified visually against the scan). Closes the last documented non-conservative gap — without B, transmitted dose behind thick shields was underestimated (concrete: factor 2–10+). HVL/TVL and required-thickness now solved numerically. Cross-validated against the Archer fits (ratios 0.5–2.1 at 2–10 HVL). Archer nuclides unchanged. This round added 18 tests; subsequent work has expanded the math suite further.

### Round 2 (data v1.1)
- **Spectrum-weighted narrow-beam shielding:** single-energy attenuation underestimated transmitted dose for multi-line emitters (Ga-67 behind 5 mm Pb: ×10¹² error; I-123: ×430). All non-Archer nuclides now use T(x) = Σ wᵢ·e^(−μ(Eᵢ)x) over their dose-weighted ICRP 107 lines (`shielding_spectrum`, 39 nuclides incl. the Mo-99+Tc-99m and Cs-137+Ba-137m equilibria and the Ra-223/Ac-225 chains). Archer nuclides are unaffected (their parameters already fit the full spectrum). HVL/TVL and required-thickness solve the spectral equation numerically.
- **Chain max photon energy fixed:** Ra-223 632 → 1196.3 keV, Ac-225 526.1 → 1567.1 keV (progeny lines — Pb-211 832 keV, Tl-209 1567 keV — were missed by the original generation).
- **Printable calculation reports** (`js/report.js`): Dose and Decay calculators generate a formal report (timestamp, database version, nuclide validation status, inputs, results, method, sources, disclaimer, sign-off line) via the 📄 Report / PDF button.
- **PWA:** `manifest.json`, the icons in `assets/icons/` and a cache-first service worker (`sw.js`) — installable on Android/desktop, fully offline once visited.
- **Clearance verification completed:** Lu-177 = 100 kBq/kg (plus Sm-153, Ho-166, Tm-170, Yb-175) visually confirmed against the official RD 1217/2024 PDF (p. 96).
- Decay calculator shows a secular-equilibrium note for chain entries (Ra-223, Ac-225).

### Critical
- **ICRP 107 RAD parser fix:** the block-header regex did not accept half-lives in scientific notation ("2.00E+5y"), so the photon blocks of **77 nuclides** were silently absorbed into the previous nuclide (e.g. Re-186 absorbed Re-186m, inflating its Γ by +101%; Ho-166 absorbed Ho-166m; the Ra-223/Ac-225 chain daughters had no photons at all). All 1252 RAD blocks now match their declared emission counts; Re-186 Γ^H*(10) = 3.86 matches the published Cornejo value exactly.
- **h'(0.07) column rebuilt:** the previous fluence-to-H'(0.07) column failed a kerma-ratio consistency test (implied H'(0.07)/Ka up to 3.7 — physically impossible). Rebuilt as (Ka/Φ)·hK'(0.07,0°) from ICRP 74 / PTB-Dos-34 (≤100 keV exact) plus anchors derived from Cornejo's published per-line contributions; ≥500 keV uses the kerma approximation h'(0.07)≈h*(10). Reproduces the four published Cornejo Γ^H'(0.07) values within −9.4% … +4.0% (Pd-103 −9.42%, In-111 +0.37%, I-125 +3.96%, Xe-133 +3.27%; the Pd-103 gap reflects updated ICRP-107 data). The **Dose** calculator always shows the real Γ^H'(0.07) constant in the H'(0.07) row (it exists for every photon emitter).
- **Clearance levels verified** against RD 1217/2024 Anexo IV Tabla A.1 (BOE-A-2024-25205 consolidated HTML): 28 non-null values confirmed; Ga-67 and Yb-169 are NOT listed in Tabla A.1 and now carry null.

### New
- **6 therapy/imaging nuclides added** (34 → 40): Zr-89, Cu-67, Tb-161, Ho-166, Ra-223+daughters, Ac-225+daughters. Chain constants include progeny in secular equilibrium; Ra-223+progeny agrees within 6% with the published conservative constant (~50 μSv·h⁻¹·GBq⁻¹·m²). Generated by `tools/add-therapy-nuclides.js`.
- **Ingestion e(g) and liquid effluent limits** for the 6 new nuclides taken from ICRP Publication 119 Annex F, Table F.1 (adult), via `tools/add-ingestion-coeffs.js`. The same run cross-checked the 30 pre-existing adult e(g) values against Table F.1 — all match exactly; a new test guards them.

## 2026-05

### Critical Fixes
- **Y-90 time unit conversion:** Fixed calculation of exposure time — now correctly applies unit conversion (min/h/d) in dose estimation
- **Y-90 H'(0.07) selection:** Y-90 bremsstrahlung now correctly applies H'(0.07) for extremities (d < 25 cm) in PMMA, Pb, and W containers
- **Lens of eye limits (RD 1029/2022):** Updated regulatory compliance to reflect current limits (50 mSv/y max annual, 100 mSv/5-year cycle since 2024-06-22)

### Medium Priority
- **Y-90 data consolidation:** Zanzonico bremsstrahlung table now sourced from `PHYSICS.Y90_CONTAINERS` (single source of truth in `js/data.js`)
- **Chart.js offline support:** v4.4.0 bundled locally (`js/chart.umd.min.js`); no CDN dependency for offline compatibility
- **CSS variables:** Defined missing variables (`--border`, `--bg-elevated`, `--text-muted`, `--warning-100`, `--success`) for consistent styling

### Low Priority
- **Validation expansion:** Extended ICRP 107 compliance testing from 7 to 20 reference nuclides (Phases 1–3)
