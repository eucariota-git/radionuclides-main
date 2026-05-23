# Validation Tests

## Running Automated Validation

To validate the parsed ICRP 107 constants against reference values:

```bash
node test/validate-constants.js
```

This script checks:
- Gamma dose rate constants (γ_H10) against expected values
- Photon emission counts
- Half-life data consistency

Reference values are drawn from:
- **Tc-99m, I-125**: Cornejo et al. (2006) — manually validated
- **Others**: ICRP Publication 107 (2008) — reference values only, not independently validated

Exit codes:
- 0 = all checks passed
- 1 = one or more checks failed

## Manual Browser Validation

Open `validate-icrp107.html` in a browser to run interactive validation tests on the DOM (selected nuclides only).
