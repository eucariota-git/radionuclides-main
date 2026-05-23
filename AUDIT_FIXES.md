# Audit Fixes Summary

This document tracks all fixes implemented for the audit findings.

## ✅ Fixed Findings

### AUD-001 (Alta): Custom nuclides overwriting curated ones
**File**: `js/db.js`
**Changes**:
- Modified `load()` function to check if custom nuclide ID conflicts with curated IDs
- Modified `addCustomNuclide()` to throw error if ID exists in curated database
- Added warning messages suggesting use of `custom:*` namespace

**Verification**: Custom nuclides can no longer silently replace curated entries

---

### AUD-002 (Alta): Lens dose 5-year limit comparison bug
**File**: `dose.html`
**Changes**:
- Fixed line 930: changed `pct(annualDoseWB, 100)` to `pct(annualDoseWB * 5, 100)`
- Now correctly shows percentage of 5-year accumulated dose against 100 mSv limit

**Verification**: Lens dose 5-year percentage is now accurate (increased from 1/5 of correct value)

---

### AUD-003 (Alta): XSS vulnerabilities via innerHTML
**Files**: `custom.html`, `index.html`, `dose.html`, `decay.html`
**Changes**:
- Created `js/utils.js` with `escapeHtml()` function
- Added script includes to all four HTML files
- Applied `UTILS.escapeHtml()` to all unsafe string insertions:
  - `custom.html`: 5 locations (emission types, decay modes, nuclide symbols/names)
  - `index.html`: 6 locations (nuclide symbols, half-lives, decay strings)
  - `dose.html`: 1 location (nuclide symbol, name, half-life)
  - `decay.html`: 1 location (nuclide symbol, name, half-life)

**Verification**: XSS attacks via custom nuclides or CSV data are now prevented

---

### AUD-004 (Alta): Numeric validation insufficient
**Files**: `dose.html`, `decay.html`
**Changes**:
- Added `Number.isFinite()` checks for primary inputs:
  - `dose.html`: Activity, distance, exposure time (3 checks)
  - `decay.html`: Activity, elapsed time (2 checks)
- Each check has explicit error alert before calculation proceeds
- Prevents NaN/Infinity propagation to physics calculations

**Verification**: Invalid inputs are caught with clear error messages

---

### AUD-006 (Media): Unvalidated ICRP 107 entries
**Files**: `dose.html`, `decay.html`
**Changes**:
- Added confirmation dialog when calculating with ICRP 107 nuclides
- Dialog warns that constants have NOT been manually validated
- User must explicitly confirm to proceed

**Verification**: Users are warned before using unvalidated constants

---

### AUD-008 (Media): Hash traceability incomplete
**File**: `tools/parse-icrp107.js`
**Changes**:
- Added SHA-256 hashing for RAD and BET source files (in addition to NDX)
- Updated output JSON structure: hashes now under `notes.source_files_hashes`
  - `icrp107_ndx_sha256`: NDX file hash
  - `icrp107_rad_sha256`: RAD file hash
  - `icrp107_bet_sha256`: BET file hash

**Verification**: Regenerated `data/icrp107-index.json` includes all three hashes

---

### AUD-009 (Media): No CSV size limits
**File**: `custom.html`
**Changes**:
- Added 10 MB file size limit check
- Added 10,000 row limit check for emission data
- Clear error messages if either limit exceeded

**Verification**: Large files are rejected with user-friendly error messages

---

### AUD-010 (Media): Decay calculator requires gamma constants unnecessarily
**File**: `decay.html`
**Changes**:
- Modified `resolveNuclide()` to allow ICRP 107 nuclides without gamma constants
- Gamma constants now optional (set to null if unavailable)
- Pure beta/alpha emitters from ICRP 107 now usable in decay calculator

**Verification**: Nuclides without photon data can now be loaded for decay calculations

---

### AUD-012 (Baja): Only manual validation
**Files**: `test/validate-constants.js`, `test/README.md`
**Changes**:
- Created automated validation script that checks 14 reference nuclides
- Script verifies γ_H10 constants and photon counts
- Returns exit code 0 (pass) or 1 (fail)
- Added test documentation

**Verification**: 14/14 validation checks pass

---

## ⏭️ Not Fixed (As Requested)

### AUD-005: Emission deduplication
**Reason**: Modifies algorithm for gamma constant calculation

### AUD-007: Single representative energy for shielding
**Reason**: Changes shielding model from single-energy to multi-energy

### AUD-011: RFC 4180 CSV compliance
**Reason**: Changes parser behavior for escaped quotes

---

## Testing

All changes have been verified:
- ✓ JavaScript syntax validation (all files pass `node --check`)
- ✓ Automated validation suite (14/14 checks pass)
- ✓ HTTP server test (app loads and serves correctly)
- ✓ Code review of each fix

## Deployment

To regenerate ICRP 107 data with new hash traceability:

```bash
node tools/parse-icrp107.js
```

To run automated validation:

```bash
node test/validate-constants.js
```
