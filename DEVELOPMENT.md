# Development Guide

This guide explains the architecture, tooling, and how to contribute to the NM Radionuclide Planner.

---

## Architecture

### Tech Stack

- **No build tools**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **No frameworks**: No React, Vue, or Angular — pure DOM manipulation
- **No dependencies**: Chart.js v4.4.0 via CDN (only external dependency)
- **No backend**: Static site with embedded data
- **Storage**: Browser sessionStorage for custom nuclides; localStorage for dark mode preference

### Module Pattern

All JavaScript modules use the **IIFE (Immediately Invoked Function Expression)** pattern for encapsulation:

```javascript
const PHYSICS = (function() {
  // Private variables and functions
  const PRIVATE_VAR = 123;
  function privateFunc() { /* ... */ }

  // Public API
  return {
    publicMethod: function() { /* ... */ },
    publicVar: 456,
  };
})();
```

This prevents global namespace pollution and allows clear separation of public/private scope.

### Module Responsibilities

| Module | File | Responsibility |
|--------|------|-----------------|
| **PHYSICS** | `js/data.js` | ICRU 57 / ICRP 74 conversion coefficients, mass attenuation coefficients, gamma dose constant calculation, narrow-beam transmission |
| **CALC** | `js/physics.js` | Decay law, dose rate equations, Archer broad-beam shielding, cumulative dose with decay |
| **DB** | `js/db.js` | Nuclide database (load from JSON), sessionStorage for custom nuclides |
| **ICRP107** | `js/icrp107-loader.js` | Extended database search, normalization, lazy-load of ICRP 107 index |
| **CSV_PARSER** | `js/csv-parser.js` | IAEA LiveChart CSV parsing, photon filtering |
| **UI** | `js/ui.js` | Dark mode, print styles, keyboard shortcuts |

### Data Flow

```
User interaction
    ↓
HTML event listener
    ↓
Call CALC.* or DB.* or PHYSICS.*
    ↓
Update DOM with results
```

**Example** (Decay calculator):
1. User enters activity and time
2. Click "Calculate"
3. `CALC.decayLaw(A0, lambdaPerSecond, timeSeconds)` → returns A(t)
4. Update HTML with result and redraw Chart.js curve

---

## Project Structure

```
radionuclides-main/
├── index.html                    Properties database
├── decay.html                    Decay calculator
├── dose.html                     Dose estimator
├── custom.html                   Custom nuclide upload
├── validate-icrp107.html         ICRP 107 validation tool
│
├── css/
│   └── style.css                 Global styles (CSS variables, dark mode, grid)
│
├── js/
│   ├── data.js                   PHYSICS module (conversion coefficients, attenuation)
│   ├── physics.js                CALC module (decay, dose, shielding)
│   ├── db.js                     DB module (database management)
│   ├── csv-parser.js             CSV_PARSER module (IAEA LiveChart format)
│   ├── icrp107-loader.js         ICRP107 module (extended database)
│   └── ui.js                     UI module (dark mode, keyboard shortcuts, print)
│
├── data/
│   ├── nuclides.json             Radionuclide database (directly editable)
│   ├── nuclides-data.js          Auto-generated from nuclides.json
│   ├── icrp107-index.json        Extended ICRP 107 database (1251 nuclides)
│   └── sources/
│       └── icrp107/              ICRP Publication 107 source files
│           ├── ICRP-07.NDX       Nuclide index
│           ├── ICRP-07.RAD       Discrete radiation emissions
│           └── ICRP-07.BET       Beta spectra
│
├── tools/
│   └── parse-icrp107.js          Node.js parser for ICRP 107 files
│
├── references/
│   ├── icrp107/
│   │   └── README.md             ICRP 107 integration documentation
│   └── [other source articles]
│
├── README.md                     Project overview
├── USER_GUIDE.md                 User documentation
├── DEVELOPMENT.md                This file
└── CLAUDE.md                     Claude Code instructions
```

---

## Running Locally

### Without build tools (development)

```bash
# Start HTTP server (Python 3)
python -m http.server 8000

# Or Node.js
npx http-server

# Open browser
http://localhost:8000
```

### Browser console access

- Open DevTools: `F12` or `Ctrl+Shift+I`
- Console tab: access any module (e.g., `PHYSICS.getH10(0.100)`, `DB.getAll()`)
- Network tab: monitor CORS, check that `icrp107-index.json` loads

---

## Editing Data

### Adding or modifying nuclides in main database

1. Edit `data/nuclides.json` (JSON format, directly editable)
   - Required fields: `id`, `symbol`, `half_life_s`, `decay_modes`, `gamma_H10`, `gamma_H007`
   - Optional fields: `modality`, `clinical_use`, `ingestion_dose_coeff_adult_Sv_per_Bq`, `effluent_liquid_limit_Bq_per_L`, etc.

2. Regenerate `data/nuclides-data.js` for offline support:
   ```bash
   # JavaScript (in browser console)
   const json = JSON.stringify(NUCLIDE_DATA); // Copy from console
   // Then replace contents of nuclides-data.js with:
   // const NUCLIDE_DATA = { /* ... */ };
   ```

3. Test both online and offline (`file://` protocol)

### Adding dose rate constants

Use the **Custom Nuclide** page to calculate Γ from photon spectrum, or refer to published literature (Cornejo et al., others).

**Cornejo et al. formula**:
```
Γ^H*(10) [μSv·h⁻¹·GBq⁻¹·m²] = K × Σᵢ (nᵢ × h(Eᵢ))
where:
  K = 28.648 (conversion factor)
  nᵢ = photon yield per decay (fraction)
  h(Eᵢ) = fluence-to-dose conversion coefficient (ICRP 74)
```

---

## Modifying Dose Constants or Physics

### Changing Archer parameters

Edit `js/physics.js`:
- Search for `ARCHER_PARAMETERS`
- Update α, β, γ for specific nuclide and material
- Reference: Oumano et al. 2025, Table 3

### Changing ICRU 57 / ICRP 74 coefficients

Edit `js/data.js`:
- `ICRU57` object contains h*(10) and h'(0.07) lookup tables
- Each energy threshold maps to conversion coefficient
- Source: ICRP Publication 74 (downloadable from ICRP website)

### Changing attenuation (narrow-beam)

Edit `js/data.js`:
- `ATTENUATION` object contains NIST XCOM mass attenuation coefficients (μ/ρ)
- `getMu()` function interpolates between energy points
- Update from: https://www.nist.gov/pml/x-ray-mass-attenuation-coefficients

---

## Regenerating ICRP 107 Index

If you need to update the extended database:

```bash
# Ensure ICRP-07.NDX and ICRP-07.RAD are in data/sources/icrp107/
node tools/parse-icrp107.js
# Generates: data/icrp107-index.json (~2.5 MB)
```

The parser:
- Reads NDX (nuclide index) and RAD (discrete emissions)
- Converts half-lives to seconds
- Filters photons: type ∈ {G, X}, E ≥ 20 keV, yield ≥ 0.01%
- Outputs JSON with 1251 entries

**Customization** (in `parse-icrp107.js`):
- Change `ENERGY_THRESHOLD_MEV` to filter different energies
- Change `YIELD_THRESHOLD` to filter different yields
- Add code 3 (annihilation) to `typeCode === 1 || typeCode === 2` to include β+ annihilation

---

## Adding a New Calculator Page

1. Create `new-calculator.html` with:
   - Same header/footer structure
   - Same CSS classes for consistency
   - Script tags for `data.js`, `db.js`, `physics.js`, etc.

2. Add navigation link in header:
   ```html
   <a href="new-calculator.html">New Calc</a>
   ```

3. Implement calculation using modules:
   ```javascript
   const result = CALC.myFunction(params);
   ```

4. Update `README.md` to document the new page

---

## Common Tasks

### Fix a bug

1. Identify which page/module is affected
2. Check browser console for errors
3. Add debug logging: `console.log('Debug:', variable)`
4. Fix the issue in the appropriate `.js` file
5. Test on both light and dark modes
6. Test on mobile (DevTools device emulation)
7. Commit with a descriptive message

### Add a new dose constant

1. Decide: main database or ICRP 107 fallback?
   - **Main**: Edit `data/nuclides.json` directly (requires publication reference)
   - **ICRP 107**: Upload photon spectrum via `custom.html` or ensure it's in ICRP-07.RAD

2. For main database:
   ```json
   {
     "id": "New-123",
     "gamma_H10": 12.5,
     "gamma_H007": 12.5,
     "source": "Author et al. (2024)"
   }
   ```

3. Verify against published literature before adding

### Modify styling

1. Edit `css/style.css`
2. Use CSS variables (defined at root):
   - `--bg-main`, `--bg-elevated`, `--text-primary`, `--text-muted`
   - `--accent`, `--danger`, `--warning`, `--border`
3. Test dark mode by toggling the moon icon
4. Test responsiveness: DevTools → Toggle Device Toolbar

### Add a keyboard shortcut

1. Edit `js/ui.js`, function `initKeyboard()`
2. Add case to switch statement:
   ```javascript
   case 'KeyX': // Ctrl+X
     myFunction();
     break;
   ```
3. Document in USER_GUIDE.md

---

## Testing

### Manual testing checklist

- [ ] Search works (main DB and ICRP 107)
- [ ] Dark mode toggle works
- [ ] Calculations produce expected values
- [ ] CSV export has correct data
- [ ] Keyboard shortcuts work
- [ ] Mobile layout is readable
- [ ] No JavaScript errors in console
- [ ] Works offline (`file://` protocol) if applicable

### Test nuclides (use for validation)

- **F-18**: PET tracer, high yield X-rays
- **Tc-99m**: SPECT workhorse, low energy (140 keV)
- **I-131**: Therapy, multiple photons
- **Lu-177**: Therapy, mixed gamma spectrum
- **Ga-68**: β+ emitter, includes annihilation

---

## Code Style

### JavaScript

- Use `const` by default, `let` if necessary, avoid `var`
- Use meaningful variable names: `gammaH10` not `g10`
- Arrow functions for callbacks: `array.map(x => x * 2)`
- Template literals for strings: `` `Value: ${x}` ``
- Comments only for **why**, not what:
  ```javascript
  // Correct
  // Apply Cornejo filter (E≥20keV) to exclude low-energy X-rays
  if (energy_keV >= 20) { /* ... */ }

  // Avoid
  // Check if energy is greater than 20
  if (energy_keV >= 20) { /* ... */ }
  ```

### HTML

- Use semantic tags: `<button>`, `<input type="search">`, `<table>` (not divs)
- ARIA labels for accessibility: `aria-label`, `aria-pressed`
- Avoid inline styles; use CSS classes

### CSS

- Use CSS variables for consistency
- Mobile-first approach (styles work on narrow then expand)
- Dark mode: use `:root[data-theme="dark"]` or media query
- No magic numbers; define spacing/size as variables

---

## Performance Considerations

### ICRP 107 Index

- ~2.5 MB JSON file, loads lazily on first search
- Subset operations (search, filter) are O(n) with 1251 items — acceptable
- If search becomes slow, consider:
  - Building an indexed Map on load (already done in `icrp107-loader.js`)
  - Pagination for results
  - Web Workers for parsing

### Chart.js

- Redraws on every input change
- For large datasets, consider debouncing:
  ```javascript
  const debounce = (fn, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  };
  ```

### DOM Rendering

- Avoid `innerHTML += ...` in loops (causes reflow)
- Use `innerHTML =` once with concatenated string, or use `DocumentFragment`

---

## Deployment

### GitHub Pages

1. Push to `main` branch
2. GitHub Actions auto-deploys to https://eucariota-git.github.io/radionuclides-main/
3. Check `/.github/workflows/` for CI/CD config

### Self-hosted

1. Clone repository
2. Serve with any HTTP server:
   ```bash
   python -m http.server 8000
   ```
3. Or deploy to:
   - Vercel, Netlify (just select repo, done)
   - AWS S3 + CloudFront
   - Apache, nginx (copy files to `www` directory)

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/add-nuclide-X`
3. Make changes and test thoroughly
4. Write clear commit messages
5. Submit a pull request

### Commit Message Format

```
Brief summary (under 70 chars)

Detailed explanation of what changed and why.
Reference issue if applicable: #123

Changed files:
- js/data.js: Updated ICRU 57 coefficients
- data/nuclides.json: Added Nuclide-X
```

---

## Future Enhancements

- [ ] Positron annihilation for β+ emitters (Ga-68, F-18 published constant)
- [ ] Beta spectrum analysis (parse ICRP-07.BET)
- [ ] Export/import nuclide profiles as JSON
- [ ] Decay chain calculations (parent → daughter → granddaughter)
- [ ] Graphical shielding calculator (visualize attenuation curves)
- [ ] Integration with IAEA LiveChart API (live data)
- [ ] Dosimetric model for patient organ dose

---

## Resources

- **ICRP Website**: https://www.icrp.org/
- **NIST XCOM**: https://www.nist.gov/pml/x-ray-mass-attenuation-coefficients
- **IAEA LiveChart**: https://www-nds.iaea.org/livechart/
- **Chart.js Docs**: https://www.chartjs.org/
- **MDN Web Docs**: https://developer.mozilla.org/

---

## Contact

For questions or technical discussions, open an issue on GitHub or contact the repository maintainer.
