# Licensing map

NM Radionuclide Planner is a mixed-licence distribution. No single licence covers
every file or every item of data. This document defines the boundary between the
original project material and third-party material.

## Original project material

Copyright © 2026 Ramon Sendon.

The original application code, maintenance tools, tests and original project
documentation are licensed under the **European Union Public Licence, version
1.2 only** (`EUPL-1.2`). The complete licence is in [`LICENSE`](LICENSE).

The EUPL applies only to copyright held by the project licensor. In files that
also contain third-party data or material, it covers the original selection,
structure and code but does not relicense the underlying third-party content.

This change does not purport to withdraw permissions already granted for copies
that a recipient obtained under the project's former MIT licence. The current
distribution is offered under `EUPL-1.2` as delimited here.

## Source-code availability

The application is distributed directly in machine-readable source-code form.
Its original HTML, CSS and JavaScript, maintenance files, documentation and
licence notices accompany the local copy. No external source-code service is
required to study, modify or redistribute the application.

Version-control metadata, including the hidden `.git` directory, is development
infrastructure rather than part of the application and must be excluded from
copies supplied to end users.

## Third-party software

- `js/chart.umd.min.js` bundles Chart.js v4.4.0 and @kurkle/color. Both retain
  their upstream MIT licences.
- Complete attribution and licence texts are in
  [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

## Third-party data and publications

- The ICRP Publication 107 / ICRP-07 decay data and their parsed or generated
  derivatives retain the terms in [`LICENSE.TXT`](LICENSE.TXT). This includes
  `data/icrp107-index.json`, `data/icrp107-data.js`, and ICRP-107-derived values
  in `data/nuclides.json` and `data/nuclides-data.js`.
- Numerical tables, coefficients, legal texts and publication-derived material
  from ICRU/ICRP, NIST, NUREG/ANS, BOE and Oumano et al. retain the terms and
  attribution stated in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
- Generated copies and transformed data do not acquire the EUPL merely because
  project code produced or packaged them.

## Practical consequence

The EUPL permits the original application code to be used in educational,
research, regulatory, commercial and healthcare settings, subject to its terms.
It does **not** expand any permission for third-party data. A deployment or
redistribution must comply with every applicable data licence and may need
separate permission for commercial use of particular datasets.

When redistributing the application, keep `LICENSE`, `LICENSING.md`,
`LICENSE.TXT` and `THIRD_PARTY_NOTICES.md` together.
