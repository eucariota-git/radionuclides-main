#!/usr/bin/env node

/**
 * add-therapy-nuclides.js — Add modern therapy/imaging radionuclides to nuclides.json
 *
 * Adds 6 curated entries calculated from ICRP 107 photon data:
 *   Zr-89, Cu-67, Tb-161, Ho-166                  — single nuclides
 *   Ra-223+daughters, Ac-225+daughters            — chains in secular equilibrium
 *
 * For the chains, the combined photon spectrum is built by walking the ICRP 107
 * decay chain from the parent and weighting each member's photon yields by its
 * cumulative branching fraction (activity ratio in secular equilibrium).
 * Members with half-life ≥ 10% of the chain head's (effectively stable on the
 * source's timescale, e.g. Bi-209) are excluded. This mirrors the convention of
 * the existing Mo-99+Tc-99m and Cs-137(+Ba-137m) entries and standard practice
 * for aged Ra-223/Ac-225 sources (equilibrium within hours).
 *
 * Γ^H*(10) and Γ^H'(0.07): Cornejo methodology, ICRU 57 table identical to
 * js/data.js (log-log interpolation, K = 28.648).
 * Γ^K-air: air-kerma function E·(μtr/ρ) from Cornejo et al. 2015 Tabla I
 * (Hubbell & Seltzer); Γ_Kair = Σ nᵢ·f(Eᵢ) × 10⁹/(4π·10⁴ cm²) × 10⁻³ μGy/nGy
 *                            = Σ nᵢ·f(Eᵢ) × 7.9577.
 * Verified: reproduces Cornejo's published Γ_Kair for C-11 (139) exactly.
 *
 * Ingestion e(g) and liquid effluent limits: left null (pending verified ICRP 119
 * Annex F lookup — better absent than guessed).
 * Clearance (RD 1217/2024 Tabla A.1, verified against BOE-A-2024-25205):
 * Ho-166 = 100 kBq/kg; the others are not listed in Tabla A.1 → null.
 *
 * Usage: node tools/add-therapy-nuclides.js
 * (then run tools/generate-data.js — done automatically at the end)
 */

'use strict';

const fs = require('fs');
const path = require('path');

// --- ICRU 57 table (MUST mirror js/data.js) ------------------------------------
const ICRU57 = [
  [0.010, 0.061, 7.220], [0.015, 0.830, 3.210], [0.020, 1.050, 1.810],
  [0.030, 0.810, 0.901], [0.040, 0.640, 0.604], [0.050, 0.550, 0.502],
  [0.060, 0.510, 0.447], [0.080, 0.530, 0.475], [0.100, 0.610, 0.577],
  [0.150, 0.890, 0.852], [0.200, 1.200, 1.160], [0.300, 1.800, 1.750],
  [0.400, 2.380, 2.290], [0.500, 2.930, 2.930], [0.600, 3.440, 3.440],
  [0.800, 4.380, 4.380], [1.000, 5.200, 5.200], [1.250, 6.110, 6.110],
  [1.500, 6.910, 6.910], [2.000, 8.330, 8.330], [3.000, 10.600, 10.600],
  [4.000, 12.500, 12.500], [5.000, 14.100, 14.100], [6.000, 15.600, 15.600],
  [8.000, 18.200, 18.200], [10.000, 20.400, 20.400],
];

// Air-kerma function E·(μtr/ρ) [nGy·h⁻¹·s·cm²] — Cornejo et al. 2015, Tabla I
const KERMA_F = [
  [0.010, 27.35], [0.015, 11.54], [0.020, 6.216], [0.030, 2.659],
  [0.040, 1.576], [0.050, 1.182], [0.060, 1.052], [0.080, 1.111],
  [0.100, 1.341], [0.150, 2.159], [0.200, 3.082], [0.300, 4.969],
  [0.400, 6.803], [0.500, 8.582], [0.600, 10.25], [0.800, 13.34],
  [1.000, 16.20], [1.250, 19.36], [1.500, 22.21], [2.000, 27.28],
  [3.000, 35.94],
];

const GAMMA_FACTOR = 28.648;
const KAIR_FACTOR  = 7.9577;  // nGy·h⁻¹·s·cm² → μGy·h⁻¹·GBq⁻¹·m² (1e9/(4π·1e4)·1e-3)

function interpLogLog(table, x, colX, colY) {
  if (x <= table[0][colX]) return table[0][colY];
  if (x >= table[table.length - 1][colX]) return table[table.length - 1][colY];
  for (let i = 0; i < table.length - 1; i++) {
    const x0 = table[i][colX], x1 = table[i + 1][colX];
    if (x >= x0 && x <= x1) {
      const y0 = table[i][colY], y1 = table[i + 1][colY];
      const t = Math.log(x / x0) / Math.log(x1 / x0);
      return Math.exp(Math.log(y0) + t * (Math.log(y1) - Math.log(y0)));
    }
  }
  return table[table.length - 1][colY];
}

// --- Chain walker ---------------------------------------------------------------

/**
 * Build the secular-equilibrium member list for a chain head.
 * Returns [{id, branch}] where branch = cumulative branching fraction
 * (= activity ratio to the head in equilibrium).
 */
function chainMembers(headId, icrpMap) {
  const head = icrpMap[headId];
  const members = [];
  const queue = [{ id: headId, branch: 1 }];
  const seen = new Map();
  while (queue.length) {
    const { id, branch } = queue.shift();
    const n = icrpMap[id];
    if (!n) continue;
    // exclude effectively-stable members (no equilibrium on the source timescale)
    if (id !== headId && (!n.half_life_s || n.half_life_s >= 0.1 * head.half_life_s)) continue;
    seen.set(id, (seen.get(id) || 0) + branch);
    for (const d of n.decay_modes || []) {
      if (d.daughter && d.branching > 0) {
        queue.push({ id: d.daughter, branch: branch * d.branching });
      }
    }
  }
  for (const [id, branch] of seen) members.push({ id, branch });
  return members;
}

/** Combine photon spectra of chain members weighted by their equilibrium activity. */
function combinedPhotons(members, icrpMap) {
  const photons = [];
  for (const { id, branch } of members) {
    const n = icrpMap[id];
    for (const p of (n.photons || [])) {
      photons.push({
        energy_keV: p.energy_keV,
        yield_percent: Math.round(p.yield_percent * branch * 10000) / 10000,
        type: p.type,
        from: id,
      });
    }
  }
  return photons.filter(p => p.yield_percent >= 0.01).sort((a, b) => a.energy_keV - b.energy_keV);
}

function calcConstants(photons) {
  let sH10 = 0, sH007 = 0, sKair = 0;
  let best = null, bestContrib = -1, maxE = 0;
  for (const p of photons) {
    const E = p.energy_keV / 1000;
    const n = p.yield_percent / 100;
    if (E < 0.020 || n < 0.0001) continue;
    const c10 = n * interpLogLog(ICRU57, E, 0, 1);
    sH10  += c10;
    sH007 += n * interpLogLog(ICRU57, E, 0, 2);
    sKair += n * interpLogLog(KERMA_F, E, 0, 1);
    if (c10 > bestContrib) { bestContrib = c10; best = p; }
    if (p.energy_keV > maxE) maxE = p.energy_keV;
  }
  return {
    gamma_H10:  Math.round(sH10  * GAMMA_FACTOR * 100) / 100,
    gamma_H007: Math.round(sH007 * GAMMA_FACTOR * 100) / 100,
    gamma_Kair: Math.round(sKair * KAIR_FACTOR  * 100) / 100,
    representative_energy_keV: best ? Math.round(best.energy_keV) : null,
    max_photon_energy_keV: maxE || null,
  };
}

// --- New nuclide definitions ----------------------------------------------------

const NEW_NUCLIDES = [
  {
    id: 'Zr-89', symbol: '⁸⁹Zr', Z: 40, A: 89, name: 'Zirconium-89',
    chain: false, category: 'diagnostic', modality: 'PET',
    clinical_use: 'Immuno-PET: ⁸⁹Zr-labelled monoclonal antibodies (e.g. trastuzumab, atezolizumab); long-lived PET tracer.',
    clearance: null,
  },
  {
    id: 'Cu-67', symbol: '⁶⁷Cu', Z: 29, A: 67, name: 'Copper-67',
    chain: false, category: 'therapeutic', modality: 'therapy',
    clinical_use: 'Radioimmunotherapy and theranostics (pairs with Cu-64); β⁻ emitter with imageable gammas.',
    clearance: null,
  },
  {
    id: 'Tb-161', symbol: '¹⁶¹Tb', Z: 65, A: 161, name: 'Terbium-161',
    chain: false, category: 'therapeutic', modality: 'therapy',
    clinical_use: 'Targeted radionuclide therapy (e.g. ¹⁶¹Tb-PSMA, ¹⁶¹Tb-DOTATOC); β⁻ + conversion/Auger electrons; Lu-177-like.',
    clearance: null,
  },
  {
    id: 'Ho-166', symbol: '¹⁶⁶Ho', Z: 67, A: 166, name: 'Holmium-166',
    chain: false, category: 'therapeutic', modality: 'therapy',
    clinical_use: 'Radioembolization (¹⁶⁶Ho microspheres, liver), radiosynovectomy; high-energy β⁻ with 80.6 keV gamma.',
    clearance: 100,  // RD 1217/2024 Tabla A.1 (verified against BOE-A-2024-25205)
  },
  {
    id: 'Ra-223', symbol: '²²³Ra', Z: 88, A: 223, name: 'Radium-223 (+ daughters)',
    chain: true, category: 'therapeutic', modality: 'therapy',
    clinical_use: 'Targeted alpha therapy of bone metastases (²²³RaCl₂, Xofigo). Constants include progeny in secular equilibrium (Rn-219, Po-215, Pb-211, Bi-211, Tl-207).',
    clearance: null,  // only in RD 1217/2024 Tabla B (moderate quantities), not Tabla A.1
  },
  {
    id: 'Ac-225', symbol: '²²⁵Ac', Z: 89, A: 225, name: 'Actinium-225 (+ daughters)',
    chain: true, category: 'therapeutic', modality: 'therapy',
    clinical_use: 'Targeted alpha therapy (e.g. ²²⁵Ac-PSMA-617, ²²⁵Ac-DOTATATE). Constants include progeny in secular equilibrium (Fr-221, At-217, Bi-213, Po-213/Tl-209, Pb-209).',
    clearance: null,
  },
];

// --- Main -----------------------------------------------------------------------

const nuclideJsonPath = path.join(__dirname, '..', 'data', 'nuclides.json');
const icrpJsonPath    = path.join(__dirname, '..', 'data', 'icrp107-index.json');

const nuclideData = JSON.parse(fs.readFileSync(nuclideJsonPath, 'utf8'));
const icrpData    = JSON.parse(fs.readFileSync(icrpJsonPath, 'utf8'));
const icrpMap = {};
for (const n of icrpData.nuclides) icrpMap[n.id] = n;

for (const def of NEW_NUCLIDES) {
  if (nuclideData.nuclides.some(n => n.id === def.id)) {
    console.log(`↷ ${def.id}: already present, skipping`);
    continue;
  }
  const icrp = icrpMap[def.id];
  if (!icrp) { console.error(`✗ ${def.id}: not in ICRP 107 index`); continue; }

  const members = def.chain ? chainMembers(def.id, icrpMap) : [{ id: def.id, branch: 1 }];
  const photons = combinedPhotons(members, icrpMap);
  const c = calcConstants(photons);

  // e_max_beta over chain members (bremsstrahlung relevance)
  let eMaxBeta = null;
  for (const { id } of members) {
    const m = icrpMap[id];
    if (m.e_max_beta_MeV != null && (eMaxBeta === null || m.e_max_beta_MeV > eMaxBeta)) {
      eMaxBeta = m.e_max_beta_MeV;
    }
  }

  const entry = {
    id: def.id,
    symbol: def.symbol,
    Z: def.Z,
    A: def.A,
    name: def.name,
    half_life_s: icrp.half_life_s,
    half_life_display: icrp.half_life_display,
    decay_modes: icrp.decay_modes || [],
    clinical_use: def.clinical_use,
    category: def.category,
    modality: def.modality,
    gamma_Kair: c.gamma_Kair,
    gamma_H10: c.gamma_H10,
    gamma_H007: c.gamma_H007,
    H007_from_cornejo: false,
    representative_energy_keV: c.representative_energy_keV,
    source: def.chain
      ? 'ICRP 107 (photon data, incl. progeny in secular equilibrium) / ICRU 57 (conversion coefficients)'
      : 'ICRP 107 (photon data) / ICRU 57 (conversion coefficients)',
    clearance_a1_kBq_per_kg: def.clearance,
    ingestion_dose_coeff_adult_Sv_per_Bq: null,
    effluent_liquid_limit_Bq_per_L: null,
    effluent_liquid_limit_source: null,
    e_max_beta_MeV: eMaxBeta,
    max_photon_energy_keV: c.max_photon_energy_keV,
  };
  if (def.chain) {
    entry.chain_members = members.map(m => ({ id: m.id, equilibrium_activity_fraction: Math.round(m.branch * 10000) / 10000 }));
  }

  nuclideData.nuclides.push(entry);
  console.log(`✓ ${def.id}: Γ_Kair=${c.gamma_Kair}  Γ_H10=${c.gamma_H10}  Γ_H007=${c.gamma_H007}  rep=${c.representative_energy_keV} keV  max=${c.max_photon_energy_keV} keV  members=[${members.map(m => m.id + (m.branch < 1 ? `(${(m.branch * 100).toFixed(1)}%)` : '')).join(', ')}]`);
}

fs.writeFileSync(nuclideJsonPath, JSON.stringify(nuclideData, null, 2) + '\n', 'utf8');
console.log(`\n✓ ${nuclideJsonPath} now has ${nuclideData.nuclides.length} nuclides`);
console.log('Run: node tools/generate-data.js');
