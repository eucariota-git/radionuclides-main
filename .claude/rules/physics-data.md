---
paths:
  - "js/physics.js"
  - "js/data.js"
  - "js/icrp107-loader.js"
  - "js/db.js"
  - "js/report.js"
  - "dose.html"
  - "index.html"
  - "data/nuclides*"
  - "data/icrp107-*"
  - "tools/**"
---

# Physics and nuclide data — invariants

- **Archer equation** (broad-beam, Monte Carlo; Oumano et al. 2025 fit the transmission of dose at 1 cm depth in tissue — NOT H*(10); the app applies it to both operational quantities as an approximation and must say so) used for Tc-99m, F-18, I-131, Lu-177 with Pb or concrete only (Fe has no fit) — its parameters already fit the FULL photon spectrum, never combine with spectral weighting
- **Spectrum-weighted narrow beam with build-up** T(x) = Σ wᵢ·min(1, B(Eᵢ, μᵢx)·e^(−μᵢx)) for all other curated nuclides (`shielding_spectrum` field, regenerated with `tools/add-shielding-spectra.js`) and for ICRP-107 extended nuclides (spectrum built at selection time with `PHYSICS.buildShieldingSpectrum` — never shield them with the single representative line: >10× error for 153 multi-line nuclides); single-line narrow beam (also with build-up) is the internal fallback for any nuclide without a stored spectrum
- **Buildup B(E, mfp)**: ANSI/ANS-6.4.3 EXPOSURE response (absorption in air — NOT the report's "energy absorption" tables, which are dose in the shield medium). `PHYSICS.getBuildup`, Pb/Fe/concrete tables from NUREG/CR-5740 Table 3; Pb K-edge must not be interpolated across; validity 0–40 mfp. `Fe` means elemental iron (ρ = 7.874 g/cm³), not generic steel
- Conversion table (`PHYSICS.ICRU57`): ICRP 74 (1996) Table A.21, h*(10) and h'(0.07,0°) per unit fluence, the 25 printed energies only (no 1.25 MeV node; 1.5 MeV keeps the printed 6.90 despite the 7.04 column product). It is the ONLY copy: tools load it from js/data.js. Regenerate curated Γ with `tools/recalc-gamma.js` (dry run by default; chain-aware; never touches cornejo_validation), then `add-shielding-spectra.js` and `generate-data.js`
- Photon filter: G, X and annihilation (AQ) photons only, E ≥ 20 keV, yield ≥ 0.01% (boundary INCLUDED — Cornejo states > 0.01 %; documented project choice)
- Half-lives stored in seconds internally; display format handled separately. Every curated half-life carries `half_life_source` (ICRP 107 (2008) or DDEP/LNHB, set by `tools/set-half-life-sources.js`); a new or edited value must name its source and match it — never an unsourced number
- Beta endpoint `e_max_beta_MeV` = LAST energy of each ICRP 107 BET block (the row with N = 0 — never drop it; the old `N > 0` filter kept the previous grid node, Lu-177 0.45 instead of 0.4978 MeV). `beta_yield_per_decay` = integral of the block; it flags negligible branches (Tc-99m 3.7e-5). Curated values are copied from the index with `tools/sync-beta-emax.js` (Ra-223/Ac-225: chain maximum, `e_max_beta_chain`)
- **Extended ICRP 107 nuclides include their short-lived progeny in equilibrium by default** (`ICRP107.progeny`: descendants with T½ ≤ 1/10 of the chain parent's and ≤ 30 d — an app criterion, not regulatory — at the Bateman ratio). Dose has an include / parent-only selector and must state the choice in the result line, report and CSV. Curated chains (`chain_members`: Ra-223, Ac-225, Pd-103 + Rh-103m) include their progeny in Γ AND in the shielding spectra (same ratios). The ICRP 107 parser must keep metastable daughters (`[mn]?` in the daughter regex)
- `nuclides.json`: one version = one content. Any content change → bump `version`, update `notes.content_sha256` and the pinned pair in `test/validate-data.js` (`DB_CONTENT_SHA256`). Curated half-lives equal their declared source exactly (`tools/set-half-life-sources.js`)
