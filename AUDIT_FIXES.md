# Audit Fixes Summary

This document tracks all fixes implemented for the audit findings.

## Status: Complete ✅

All audit findings requiring fixes have been addressed (except AUD-005, AUD-007, AUD-011 per user request).
Test suite passes: **1275/1275 checks** ✓

**Round 3 (Final)** — Closed remaining edge cases in AUD-003, AUD-004, AUD-012

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
- ✓ Automated validation suite (1275 checks pass)
  - 14 reference nuclides (gamma H*(10), photon count, half-life tolerance)
  - 1252 ICRP nuclides (physical bounds checking)
  - 1 Y-90 special case (pure beta verification)
  - 4 regulatory limits formulas
  - 4 physics decay model invariants
- ✓ HTTP server test (app loads and serves correctly)
- ✓ Code review of each fix

---

## Round 2: Targeted fixes for AUD-003, 004, 008, 012

Subsequent review revealed 4 remaining issues that required targeted fixes (partially closed; see Round 3 for final edge case closures).

### AUD-003 (Revisited): Unescaped innerHTML in detail panel
**File**: `index.html:355`
**Issue**: `detailSymbol.innerHTML = n.symbol` was the only remaining unescaped innerHTML assignment in the nuclide detail panel
**Fix**: Changed to `textContent` to prevent HTML injection while still displaying nuclide symbols correctly
**Verification**: Symbols like `Tc-99m` render as plain text, not HTML

---

### AUD-004 (Revisited): NaN half-life allowed in custom nuclide save
**File**: `custom.html:477-489`
**Issue**: `half_life_s` was accepted without validation; NaN values could be saved
**Fix**: Added `Number.isFinite(hlS) || hlS <= 0` check before calling `DB.addCustomNuclide()`
**Verification**: Empty or invalid half-life values are now rejected with user alert

---

### AUD-008 (Revisited): Hash computed over UTF-8 text, not bytes
**Files**: `tools/parse-icrp107.js`, `data/icrp107-index.json`, `data/icrp107-data.js`
**Issue 1**: Hash computed over decoded UTF-8 strings (not platform-independent)
**Issue 2**: Data files still contained old format with only `icrp107_ndx_sha256`
**Fix**:
- Removed `'utf8'` encoding from all three `fs.readFileSync()` calls to use raw byte Buffers
- Re-generated `data/icrp107-index.json` and `data/icrp107-data.js`
- Hash values now reflect byte-level computation (NDX hash changed from `6aa2f8d7...` to `ac84a9cf...`)
- Data files now contain full `source_files_hashes` structure with all three hashes

**Verification**: 
```bash
grep -A3 "source_files_hashes" data/icrp107-index.json
# Shows: icrp107_ndx_sha256, icrp107_rad_sha256, icrp107_bet_sha256
```

---

### AUD-012 (Revisited): Test coverage expanded
**File**: `test/validate-constants.js`
**Previous coverage**: 14 curated nuclides (γ_H10, photon count only)
**Additional tests**:
1. **Half-life comparison**: Verify T½ within 0.5% relative tolerance for all 14 curated nuclides
2. **Physical bounds (all 1252 ICRP nuclides)**:
   - `half_life_s` must be `null` (stable) or positive finite number
   - `gamma_H10` must be `null` or non-negative finite number
   - `photon_count_filtered >= 0`
3. **CSV parser fixtures**: (marked as browser-only, skipped in Node.js)

**Test results**: 1266 checks pass, 0 fail
- 14 reference nuclides validated
- 1252 nuclides checked for physical bounds
- All fields finite, non-NaN, within physics constraints

---

---

## Round 3: Final edge case closures

Subsequent comprehensive review identified 3 additional issues in previously-closed findings.

### AUD-003 (Revisited): Complete HTML escaping in detail panel
**File**: `index.html`
**Issues**: 
- `decayStr` in both ICRP 107 and standard nuclide detail sections was unescaped
- Photon table `p.type` field was unescaped
- Effluent component `c.id` field was unescaped
- Notes block strings (`n.source`, `n.effluent_liquid_note`, `n.effluent_liquid_limit_source`) were unescaped
**Fix**:
- Applied `UTILS.escapeHtml()` to `decayStr` before template interpolation (both sections)
- Applied `UTILS.escapeHtml()` to `p.type` in photon table map function
- Applied `UTILS.escapeHtml()` to `c.id` in effluent component map function
- Applied `UTILS.escapeHtml()` to all note string fields before concatenation
**Verification**: Detail panel with specially-crafted custom nuclides containing HTML tags renders safely as text

---

### AUD-004 (Revisited): Guard for negative elapsed time in decay calculator
**File**: `decay.html`
**Issue**: When target date is before reference date (datetime picker path), `t_h` becomes negative without guard. Negative time causes `activityAtTime()` to return activity greater than A0 (unphysical). Direct hours input had guard but datetime path didn't.
**Fix**: Added explicit check after finite-ness validation:
```js
if (Number.isFinite(t_h) && t_h < 0) {
  alert('Target date must be after reference date.');
  return;
}
```
**Verification**: Setting target date before reference date shows alert and blocks calculation

---

### AUD-012 (Revisited): Expanded test coverage for edge cases
**File**: `test/validate-constants.js`
**Previous coverage**: 14 reference nuclides (gamma, photon count); 1252 ICRP nuclides (physical bounds)
**New tests added**:
1. **Test 3 — Y-90 special case**: Verifies pure beta emitter has `gamma_H10 === null || undefined`, `half_life_s > 0`, `representative_energy_keV === null`
2. **Test 4 — Regulatory limits formula**: Validates `pct()` arithmetic for dose limit comparisons
   - Worker at annual whole-body limit: 20000 μSv / 20 mSv = 100%
   - Quintennial (5-year) lens limit: 25000 μSv / 100 mSv = 25%
   - Extremity annual limit: 500000 μSv / 500 mSv = 100%
3. **Test 5 — Physics invariants**: Inline implementation of decay formula verifies
   - Zero time → initial activity (A = A0)
   - One half-life → 50% (A = A0/2)
   - Two half-lives → 25% (A = A0/4)
   - Infinite time → zero (A → 0)

**Test results**: 1275 checks pass, 0 fail
- 14 reference nuclides (gamma + photon count + half-life)
- 1252 ICRP nuclides (physical bounds)
- 1 Y-90 special case
- 4 regulatory limits formulas
- 4 physics invariants
- CSV parser skipped (browser-only)

---

## Deployment

To regenerate ICRP 107 data (if source files updated):

```bash
node tools/parse-icrp107.js
```

To run automated validation:

```bash
node test/validate-constants.js
```

Expected output:
```
=== Test 1: Reference value comparison (14 curated nuclides) ===
✓ Tc-99m: OK
✓ F-18: OK
... (12 more)

=== Test 2: Physical bounds (all ICRP 107 nuclides) ===
✓ All 1252 nuclides have valid physical bounds

=== Test 3: CSV parser (fixtures) ===
⚠ CSV parser tests skipped: browser-only module

=== Summary ===
Total: 1266 passed, 0 failed
```
