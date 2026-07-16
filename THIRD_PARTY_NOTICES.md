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

### ICRU Report 57 / ICRP Publication 74 — conversion coefficients
The `ICRU57` table in `js/data.js` (ambient dose equivalent h*(10) and
directional dose equivalent h'(0.07) per unit fluence). The h*(10) column uses
tabulated ICRU 57 / ICRP 74 values with attribution. The h'(0.07) column is a
**reconstruction**, not a verbatim ICRP/ICRU table: PTB-Dos-34 / ICRP 74 kerma
coefficients ≤100 keV, anchors derived from Cornejo et al. (2015) per-line
contributions at 150–400 keV, and the kerma approximation h'(0.07)≈h*(10)
≥500 keV (full provenance in the header of `js/data.js`). Reproduction of
substantial ICRU/ICRP tabular material requires permission; relevant only if use
becomes commercial.

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

### BOE — Spanish legal texts
`references/RD 1029 de 2022 …`, `references/RD 1217 de 2024 …`. Legal and
regulatory provisions are excluded from intellectual property under art. 13 of
the Spanish Intellectual Property Law (LPI); redistributable.

### Oumano et al. (2025) — Archer broad-beam shielding parameters
`references/J Applied Clin Med Phys - 2025 - Oumano …pdf`; the Archer α/β/γ
parameters and the light-weight concrete density in `js/data.js` are transcribed
from it.

> Oumano, M., et al. (2025). "Shielding resources for four common
> radiopharmaceuticals utilized for imaging and therapy: Tc-99m, F-18, I-131,
> and Lu-177." *Journal of Applied Clinical Medical Physics* 26(5):e70084.
> DOI: 10.1002/acm2.70084.

Licensed **CC BY 4.0** (https://creativecommons.org/licenses/by/4.0/). Changes:
numeric parameter values transcribed into the application; the article itself is
redistributed unmodified in `references/`.

### Status / permissions

- ICRP-107 may be redistributed for the educational, research and not-for-profit
  purposes stated in `LICENSE.TXT`; the ICRU/NIST/NUREG numeric tables are used
  with attribution; Oumano is CC BY 4.0; the BOE texts carry no IP.
- For **commercial use of the affected data**, first obtain permission from ICRP (ICRP-107 data
  and any substantial ICRU/ICRP-74 material) and written confirmation of the
  applicable terms from NIST (XCOM SRD 8) and NRC/ORNL or ANS (ANS-6.4.3 buildup).
- Public hosting, copying or forking does not expand the permissions granted by
  any data source; each deployment and redistribution must assess those terms.
