# Third-party notices

This is the authoritative notice file for all third-party material bundled or
redistributed in this application — both **software** (MIT, texts reproduced in
full below) and **data** (see the Data sources section).

The original application **code** is licensed under EUPL-1.2 only (see
[LICENSE](LICENSE) and [LICENSING.md](LICENSING.md)). The EUPL does not relicense
the bundled third-party software or data. Those items retain the terms below and
in [LICENSE.TXT](LICENSE.TXT); some commercial uses of the data require separate
permission from the respective rights holders.

### ⚠️ `LICENSE` and `LICENSE.TXT` are two different licences

They are **not** variants of the same file, and neither supersedes the other:

| File | Covers | Terms |
|------|--------|-------|
| [`LICENSE`](LICENSE) | the original application **code** | EUPL-1.2 only — © 2026 Ramon Sendon |
| [`LICENSE.TXT`](LICENSE.TXT) | the **ICRP-07 decay data** and its derivatives (`data/icrp107-index.json`, `data/icrp107-data.js`, the photon-derived values in `data/nuclides.json` and `data/nuclides-data.js`) | ICRP-07 — educational / research / not-for-profit only |

**The `LICENSE.TXT` filename is mandated, not a stylistic choice.** The ICRP-07
grant is conditional on "the file LICENSE.TXT containing the above copyright
notices […] appear[ing] in all copies, modifications, and distributions", so it
cannot be renamed, moved into a `LICENSES/` directory, or folded into this file
without breaking the licence under which the data is redistributed.

The two names differing only by extension is a known hazard: on case-insensitive
filesystems and in some licence detectors and packagers one may shadow or be
mistaken for the other, which would make the distribution look single-licensed.
If you redistribute this project, ship **both** files, `LICENSING.md` and this
notice. Neither the code licence nor the data licence covers what the other one
does.

---

## Software

## Chart.js v4.4.0

Bundled as `js/chart.umd.min.js`. https://www.chartjs.org

Verbatim license text supplied for the v4.4.0 release:

```
The MIT License (MIT)

Copyright (c) 2014-2022 Chart.js Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## @kurkle/color v0.3.2

Bundled inside `js/chart.umd.min.js` (Chart.js dependency); version and copyright
match the distributed bundle banner.

MIT notice for the bundled dependency:

```
The MIT License (MIT)

Copyright (c) 2023 Jukka Kurkela

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

---

## Data sources

Physical and regulatory data used by the app. Numeric physical constants are
facts, but their compiled tables and the publications they come from may carry
copyright and/or database rights; each source is listed with what is used, its
origin and its terms. These terms apply independently of the EUPL licence for
the original code. ICRP-107 is covered by its own notice (`LICENSE.TXT`), and
commercial use requires clearing the items marked below first.

### ICRP Publication 107 — nuclear decay data
Files: `data/icrp107-index.json`, `data/icrp107-data.js`, and the photon-derived
values in `data/nuclides.json` / `data/nuclides-data.js`.
© 2008 A. Endo and K.F. Eckerman (ICRP-07 / DECDATA). Redistributed for
educational, research and not-for-profit purposes under the ICRP-07 copyright
notice — see [LICENSE.TXT](LICENSE.TXT), whose terms require that file to
accompany all copies. **Commercial use requires permission from the copyright
holders** (https://www.icrp.org/).

### ICRP Publication 74 — conversion coefficients
The conversion table in `js/data.js` (constant `ICRU57`): ambient dose
equivalent h*(10) and directional dose equivalent h'(0.07,0°) per unit fluence,
the 25 energies printed in ICRP Publication 74 (1996), Table A.21, used with
attribution (since 2026-10-03; before that the h*(10) column above 1 MeV and
the h'(0.07) column did not match the table). © ICRP. ICRP publications retain
copyright; verify permission for the intended reuse. This is separate from the
terms of the ICRP-07 decay data package (`LICENSE.TXT`).

### DDEP (LNHB/CEA) — recommended half-lives
The `half_life_s` of the 16 curated entries whose `half_life_source` names DDEP:
recommended values of the Decay Data Evaluation Project, LNHB/CEA *Table de
Radionucléides* (https://www.lnhb.fr/), consulted 2026-10-14; the recent
evaluations are published in Metrologia 62 (2025) 029001 / 029002 and 63 (2026)
019001. Sixteen numeric values cited with attribution in each entry; the tables
are not redistributed. The LNHB nuclear-data page sets no reuse conditions and asks
that its evaluations be cited — the *Metrologia* articles and the BIPM-5 monograph
*Table of Radionuclides* (checked 2026-10-15); both are cited.

### Cornejo et al. (2015) — published dose-rate constants
`gamma_Kair` of 32 curated entries and their comparison values
(`cornejo_validation`: Γ^K-air, Γ^H*(10) and, where printed, Γ^H'(0.07)), plus
Γ^H*(10) of Cs-137 and Mo-99+Tc-99m: Cornejo Díaz N., Brosed Serreta A., Ruiz
Manzano P., «Constantes de tasa de kerma en aire y de tasa de equivalente de
dosis ambiental de algunos radionucleidos utilizados en aplicaciones médicas»,
*Radioprotección* (SEPR) nº 83 (2015) 39–42, Table III. Numeric values cited with
attribution; the article is not redistributed. No reuse permission has been
requested from the SEPR.

### NIST XCOM / XAAMDI — photon mass attenuation coefficients
The `ATTENUATION` table in `js/data.js` contains mass attenuation values for
lead, elemental iron and ordinary concrete. Reference values from NIST (X-Ray Attenuation and Absorption
for Materials of Dosimetric Interest, and the XCOM database, NIST Standard
Reference Database 8), used with attribution to NIST. SRD products may be subject
to the NIST SRD terms:
https://www.nist.gov/open/copyright-fair-use-and-licensing-statements-srd-data-software-and-technical-series-publications

### NUREG/CR-5740 · ANSI/ANS-6.4.3 — exposure buildup factors
The `BUILDUP_*` tables in `js/data.js` (Table 3 point-isotropic exposure buildup
factors for lead, elemental iron and concrete). Numeric values transcribed from Trubey, D.K.,
NUREG/CR-5740 / ORNL/RSIC-49/R1 (1991), an NRC/ORNL report released for unlimited
distribution. The underlying ANSI/ANS-6.4.3 standard is © American Nuclear
Society and is **not** redistributed here (only the numeric Table 3 values are
used).

### Effluent Scenarios 1 and 2 — dose coefficients and model parameters
Files: `data/effluent-scenarios.json`, `data/effluent-scenarios-data.js`.
- Inhalation dose coefficients for Lu-177, Lu-177m, I-131, Tc-99m and F-18
  (adult members of the public): ICRP Publication 119 (2012), Table G.1,
  © ICRP. Five numeric values cited with attribution; the publication is not
  redistributed.
- Model structure and default parameter values (sludge density, dust loading,
  respirable fraction, exposure times, transit time) and the GENII factors of
  Table A.21 used in the indicative cross-check: Kennedy W.E. Jr. et al.,
  NUREG/CR-5814 / PNL-7892 (1992), U.S. NRC; and IAEA Safety Reports Series
  No. 19 (2001), © IAEA. Numeric values cited with attribution; neither report
  is included in the distribution package.
- External dose-rate coefficients k for both scenarios: own PHITS
  calculations by the project author (not third-party data).

### Caregiver page — proximity factors, kinetic presets and criteria
Files: `data/caregiver.json`, `data/caregiver-data.js`. Numeric values cited
with attribution; no article text, figure or table is reproduced, and none of
the articles is included in the distribution package.
- Proximity factors 14.9 / 2.5 / 1 at 0.1 / 0.5 / 1 m (medians of measurements)
  and the DOTATATE kinetic preset: Monserrat Fuertes et al., *EJNMMI Physics*
  10:50 (2023), DOI 10.1186/s40658-023-00570-7 — © The Author(s), licensed
  **CC BY 4.0** (https://creativecommons.org/licenses/by/4.0/). Changes: numeric
  values transcribed into the application.
- Mean effective half-life 40.5 h (Lu-177-PSMA-617): Kurth et al., *EJNMMI
  Research* 8:32 (2018) — © The Author(s), licensed **CC BY 4.0**. Changes:
  numeric value transcribed.
- Mean dose rates at 1 m (15 and 7 µSv/h at 6 and 24 h) from which the fast
  half-life 16.4 h is consistent: Demir et al., *J. Radiol. Prot.* 36 (2016),
  © 2016 IOP Publishing Ltd. Two numeric values cited with attribution.
- Effective half-lives, cycles and the contact-at-0.4 m approximation: Gayol
  Vilorio et al., *Rev. Fís. Méd.* 26(2) (2025), and Foro CSN-SEPR-SEFM (2011),
  «Criterios de alta de pacientes … tratamientos metabólicos con 131I». No
  licence is stated in either document; numeric values cited with attribution.
- Default case, model and evaluation criteria per category: the author's
  workbook *Dosis_acompanantes_simple_v2.1.xlsx* (own work; the criteria are
  department criteria citing RD 601/2019, RD 1029/2022 and the documents above).

### RD 1217/2024 Annex IV and RD 783/2001 Annex III — regulatory values
Files: `data/regulatory.json`, `data/regulatory-data.js`.
- RD 1217/2024 Annex IV Tables A1 and B, their notes and progeny lists, and
  RD 783/2001 Annex III table a) adult public ingestion coefficients: legal
  provisions published in the BOE, excluded from intellectual property under
  art. 13 of the Spanish Intellectual Property Law (LPI).
- The ingestion coefficients are transcribed from ICRP Publication 119 (2012)
  Table F.1, © ICRP, which reproduces the same values; the chemical-form labels
  come from that publication. Cited with attribution; the publication is not
  redistributed.

### BOE — Spanish legal texts
`references/RD 1029 de 2022 …`, `references/RD 1217 de 2024 …`, kept in the
source repository only: the distribution package does not include `references/`.
Legal and regulatory provisions are excluded from intellectual property under
art. 13 of the Spanish Intellectual Property Law (LPI); redistributable.

### Oumano et al. (2025) — Archer broad-beam shielding parameters
`references/J Applied Clin Med Phys - 2025 - Oumano …pdf` (source repository
only); the Archer α/β/γ parameters and the light-weight concrete density in
`js/data.js` are transcribed from it.

> Oumano, M., et al. (2025). "Shielding resources for four common
> radiopharmaceuticals utilized for imaging and therapy: Tc-99m, F-18, I-131,
> and Lu-177." *Journal of Applied Clinical Medical Physics* 26(5):e70084.
> DOI: 10.1002/acm2.70084.

Licensed **CC BY 4.0** (https://creativecommons.org/licenses/by/4.0/). Changes:
numeric parameter values transcribed into the application. The article itself is
kept unmodified in `references/` of the source repository; the distribution
package contains only the transcribed parameters and this bibliographic
reference, not the article.

### Status / permissions

- **Express licence.** ICRP-107 (the ICRP-07 decay data package) may be
  redistributed for the educational, research and not-for-profit purposes stated
  in `LICENSE.TXT`. That licence covers the decay data package only.
- **No permission on file.** ICRP Publication 74 (1996) Table A.21 (25 energies,
  two columns), the five inhalation coefficients of ICRP Publication 119 (2012)
  Table G.1 and the chemical-form labels of its Table F.1 are © ICRP and are used
  with attribution. Attribution and a not-for-profit purpose are not a
  permission: as of 2026-10-04 no reuse permission has been requested from ICRP.
  It must be obtained, or the basis for the reuse documented, before the package
  is distributed outside the author's organisation.
- **Legal provisions.** The adult ingestion coefficients are the values of
  RD 783/2001 Annex III, and Tables A1 and B those of RD 1217/2024 Annex IV,
  both published in the BOE (art. 13 LPI); ICRP 119 Table F.1 is the numerical
  transcription of the former.
- The NIST and NUREG numeric tables are used with attribution under the terms
  stated in their sections; Oumano is CC BY 4.0.
- **Citation requested, no restriction.** The 16 DDEP half-lives: the LNHB asks
  only that its evaluations be cited (checked 2026-10-15).
- **Attribution only, terms not checked.** The Cornejo et al. (2015) constants
  (SEPR) are cited with attribution; no reuse permission is on file.
- For **commercial use of the affected data**, first obtain permission from ICRP (ICRP-107 data
  and any substantial ICRU/ICRP-74 material) and written confirmation of the
  applicable terms from NIST (XCOM SRD 8) and NRC/ORNL or ANS (ANS-6.4.3 buildup).
- Public hosting, copying or forking does not expand the permissions granted by
  any data source; each deployment and redistribution must assess those terms.
