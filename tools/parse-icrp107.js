#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// NOTE: the raw ICRP 107 files (NDX/RAD/BET) are © ICRP and NOT versioned in
// this repository (data/sources/ is gitignored). Download them free from
// icrp.org and verify their SHA256 against data/icrp107-index.json
// (notes.source_files_hashes) — see references/icrp107/README.md.
const ICRP107_DIR = path.join(__dirname, '../data/sources/icrp107');
const OUTPUT_FILE = path.join(__dirname, '../data/icrp107-index.json');
const OUTPUT_JS_FILE = path.join(__dirname, '../data/icrp107-data.js');

/**
 * Convert half-life string (e.g., "10.0d", "2.1m", "1.405E10y", "stable") to seconds
 */
function parseHalfLife(halfLifeStr) {
  if (halfLifeStr.toLowerCase() === 'stable') return null;

  // Extract unit: try "us", "ns", "ps" first, then single letters
  let value, unit;

  const match2Char = halfLifeStr.match(/^([\d.eE+-]+)\s*([a-z]{2})(.*)$/i);
  if (match2Char) {
    value = parseFloat(match2Char[1]);
    unit = match2Char[2].toLowerCase();
    // If there's a decay mode suffix, ignore it
  } else {
    const match1Char = halfLifeStr.match(/^([\d.eE+-]+)\s*([a-zA-Z]?)$/);
    if (!match1Char) {
      console.warn(`Cannot parse half-life: "${halfLifeStr}"`);
      return null;
    }
    value = parseFloat(match1Char[1]);
    unit = (match1Char[2] || '').toLowerCase();
  }

  if (isNaN(value)) {
    console.warn(`Cannot parse half-life value: "${halfLifeStr}"`);
    return null;
  }

  const unitMultipliers = {
    us: 1e-6,
    ns: 1e-9,
    ps: 1e-12,
    ms: 1e-3,
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    y: 365.25 * 86400,
  };

  if (!(unit in unitMultipliers)) {
    if (unit) {
      console.warn(`Unknown unit for half-life: "${unit}" in "${halfLifeStr}"`);
    }
    return null;
  }

  return value * unitMultipliers[unit];
}

/**
 * Format seconds to human-readable half-life (e.g., "6.647 d")
 */
function formatHalfLife(seconds) {
  if (seconds === null) return 'stable';

  const units = [
    { unit: 'y', factor: 365.25 * 86400 },
    { unit: 'd', factor: 86400 },
    { unit: 'h', factor: 3600 },
    { unit: 'm', factor: 60 },
    { unit: 's', factor: 1 },
  ];

  for (const { unit, factor } of units) {
    const value = seconds / factor;
    if (value >= 1) {
      const rounded = Math.round(value * 1000) / 1000;
      return `${rounded} ${unit}`;
    }
  }

  return `${seconds} s`;
}

/**
 * Parse NDX file to extract nuclide metadata using fixed-width FORTRAN column positions
 * FORTRAN format: (A7,A8,A2,A8,3I7,I6,1X,3(A7,I6,E11.0,1X),A7,I6,E11.0,F7.0,2F8.0,3I4,I5,I4,E11.0,E10.0,E9.0)
 * Record length: 226 characters
 * Note: Z (atomic number) is NOT in the NDX file; it must be derived from the nuclide symbol
 */

// Element atomic numbers lookup
const ATOMIC_NUMBERS = {
  H: 1, He: 2, Li: 3, Be: 4, B: 5, C: 6, N: 7, O: 8, F: 9, Ne: 10,
  Na: 11, Mg: 12, Al: 13, Si: 14, P: 15, S: 16, Cl: 17, Ar: 18, K: 19, Ca: 20,
  Sc: 21, Ti: 22, V: 23, Cr: 24, Mn: 25, Fe: 26, Co: 27, Ni: 28, Cu: 29, Zn: 30,
  Ga: 31, Ge: 32, As: 33, Se: 34, Br: 35, Kr: 36, Rb: 37, Sr: 38, Y: 39, Zr: 40,
  Nb: 41, Mo: 42, Tc: 43, Ru: 44, Rh: 45, Pd: 46, Ag: 47, Cd: 48, In: 49, Sn: 50,
  Sb: 51, Te: 52, I: 53, Xe: 54, Cs: 55, Ba: 56, La: 57, Ce: 58, Pr: 59, Nd: 60,
  Pm: 61, Sm: 62, Eu: 63, Gd: 64, Tb: 65, Dy: 66, Ho: 67, Er: 68, Tm: 69, Yb: 70,
  Lu: 71, Hf: 72, Ta: 73, W: 74, Re: 75, Os: 76, Ir: 77, Pt: 78, Au: 79, Hg: 80,
  Tl: 81, Pb: 82, Bi: 83, Po: 84, At: 85, Rn: 86, Fr: 87, Ra: 88, Ac: 89, Th: 90,
  Pa: 91, U: 92, Np: 93, Pu: 94, Am: 95, Cm: 96, Bk: 97, Cf: 98, Es: 99, Fm: 100,
  Md: 101, No: 102, Lr: 103, Rf: 104, Db: 105, Sg: 106, Bh: 107, Hs: 108, Mt: 109, Ds: 110,
  Rg: 111, Cn: 112, Nh: 113, Fl: 114, Mc: 115, Lv: 116, Ts: 117, Og: 118,
};

function getZFromNuclideName(nuclideId) {
  // Extract element symbol from nuclide ID (e.g., "Tc-99m" → "Tc")
  const match = nuclideId.match(/^([A-Z][a-z]?)-/);
  if (match) {
    return ATOMIC_NUMBERS[match[1]] || null;
  }
  return null;
}

function parseNDX(ndxPath) {
  const content = fs.readFileSync(ndxPath, 'utf8');
  const lines = content.split(/\r?\n/);

  const nuclides = {};

  // Fixed-width column positions (1-based FORTRAN → 0-based JavaScript)
  const cols = {
    nuclide: [0, 7],       // A7
    half_life: [7, 15],    // A8
    units: [15, 17],       // A2
    decay_mode: [17, 25],  // A8
    ptr1: [25, 32],        // I7
    ptr2: [32, 39],        // I7
    ptr3: [39, 46],        // I7
    ptr4: [46, 52],        // I6
    d1_name: [53, 60],     // A7
    d1_rec: [60, 66],      // I6
    d1_branch: [66, 77],   // E11.0
    d2_name: [78, 85],     // A7
    d2_rec: [85, 91],      // I6
    d2_branch: [91, 102],  // E11.0
    d3_name: [103, 110],   // A7
    d3_rec: [110, 116],    // I6
    d3_branch: [116, 127], // E11.0
    d4_name: [128, 135],   // A7
    d4_rec: [135, 141],    // I6
    d4_branch: [141, 152], // E11.0
    e_alpha: [153, 160],   // F7.0
    e_electron: [160, 168], // F8.0
    e_photon: [168, 176],  // F8.0
    num1: [176, 180],      // I4
    num2: [180, 184],      // I4
    num3: [184, 188],      // I4
    num4: [188, 193],      // I5
    num5: [193, 197],      // I4
    amu: [197, 208],       // E11.0
    gamma10: [208, 218],   // E10.0
    kair: [218, 226],      // E9.0
  };

  function extractField(line, colName) {
    const col = cols[colName];
    return line.substring(col[0], col[1]).trim();
  }

  // First line is the format descriptor. Nuclide records begin on line 2.
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.length < 226 || !line.trim()) continue;

    const nuclideId = extractField(line, 'nuclide');
    if (!nuclideId || !nuclideId.match(/^[A-Z][a-z]?-\d+/)) continue;

    const halfLifeStr = extractField(line, 'half_life') + extractField(line, 'units');
    const halfLifeS = parseHalfLife(halfLifeStr);
    const halfLifeDisplay = formatHalfLife(halfLifeS);

    // Daughters
    const daughters = [];
    const daughterData = [
      { name: extractField(line, 'd1_name'), rec: extractField(line, 'd1_rec'), branch: extractField(line, 'd1_branch') },
      { name: extractField(line, 'd2_name'), rec: extractField(line, 'd2_rec'), branch: extractField(line, 'd2_branch') },
      { name: extractField(line, 'd3_name'), rec: extractField(line, 'd3_rec'), branch: extractField(line, 'd3_branch') },
      { name: extractField(line, 'd4_name'), rec: extractField(line, 'd4_rec'), branch: extractField(line, 'd4_branch') },
    ];

    for (const d of daughterData) {
      const dName = d.name.trim();
      const dRec = parseInt(d.rec, 10);
      const dBranch = parseFloat(d.branch);
      if (dName && dName.match(/^[A-Z][a-z]?-\d+$/) && !isNaN(dRec) && dRec > 0 && !isNaN(dBranch) && dBranch > 0 && dBranch <= 1.0) {
        daughters.push({ name: dName, branching: dBranch });
      }
    }

    // Energies
    const e_mean_alpha_MeV = (() => {
      const v = parseFloat(extractField(line, 'e_alpha'));
      return !isNaN(v) && v !== 0 ? Math.round(v * 100000) / 100000 : null;
    })();

    const e_mean_electron_MeV = (() => {
      const v = parseFloat(extractField(line, 'e_electron'));
      return !isNaN(v) && v !== 0 ? Math.round(v * 100000) / 100000 : null;
    })();

    const e_mean_photon_MeV = (() => {
      const v = parseFloat(extractField(line, 'e_photon'));
      return !isNaN(v) && v !== 0 ? Math.round(v * 100000) / 100000 : null;
    })();

    // Z: derive from nuclide symbol (not in NDX file)
    const Z = getZFromNuclideName(nuclideId);

    // Atomic mass
    const amu = parseFloat(extractField(line, 'amu'));
    const atomic_mass_u = (!isNaN(amu) && amu > 0 && amu < 300) ? Math.round(amu * 1000000) / 1000000 : null;

    // NOTE: NDX does NOT contain ICRP-119 dose coefficients (ingestion/inhalation).
    // Those values should be sourced from the curated DB or ICRP-119 tables directly.
    // The gamma10/kair fields contain air kerma data, not dose coefficients.
    const dose_inhalation_Sv_per_Bq = null;
    const dose_ingestion_Sv_per_Bq = null;

    // RAD and BET counts
    const num2 = parseInt(extractField(line, 'num2'), 10) || 0;
    const num3 = parseInt(extractField(line, 'num3'), 10) || 0;
    const rad_offset = parseInt(extractField(line, 'ptr1'), 10) || 0;
    const bet_offset = parseInt(extractField(line, 'ptr2'), 10) || 0;

    nuclides[nuclideId] = {
      id: nuclideId,
      half_life_s: halfLifeS,
      half_life_display: halfLifeDisplay,
      decay_mode_raw: extractField(line, 'decay_mode'),
      daughters,
      rad_offset,
      rad_count: num2,
      bet_offset,
      bet_count: num3,
      e_mean_alpha_MeV,
      e_mean_electron_MeV,
      e_mean_photon_MeV,
      Z,
      atomic_mass_u,
      dose_inhalation_Sv_per_Bq,
      dose_ingestion_Sv_per_Bq,
      e_max_beta_MeV: null,
      photons: [],
      photon_count_total: 0,
      photon_count_filtered: 0,
    };
  }

  return nuclides;
}

/**
 * Parse RAD file to extract photon emissions
 */
function parseRAD(radPath, nuclides) {
  const content = fs.readFileSync(radPath, 'utf8');
  const lines = content.split('\n');

  let currentNuclideId = null;
  let photonsForNuclide = [];
  let totalPhotonCount = 0;
  let declaredCount = null;
  let countMismatches = 0;

  function saveCurrent() {
    if (!currentNuclideId) return;
    if (declaredCount !== null && totalPhotonCount !== declaredCount) {
      countMismatches++;
      console.warn(`⚠ RAD count mismatch for ${currentNuclideId}: header declares ${declaredCount} emission rows, parsed ${totalPhotonCount}`);
    }
    if (currentNuclideId in nuclides) {
      nuclides[currentNuclideId].photons = photonsForNuclide;
      nuclides[currentNuclideId].photon_count_total = totalPhotonCount;
      nuclides[currentNuclideId].photon_count_filtered = photonsForNuclide.length;
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if this is a header line (nuclide_name half_life N).
    // Half-life may be in scientific notation with an exponent sign (e.g. "2.00E+5y",
    // "1.00E-4s") — the character class MUST include + and -, otherwise the block of
    // that nuclide is silently absorbed into the previous one (historic bug that
    // polluted 77 nuclides, e.g. Re-186 absorbing Re-186m).
    const headerMatch = trimmed.match(/^([A-Za-z]+-?\d+[a-z]*)\s+([0-9.eE+\-a-z]+)\s+(\d+)$/i);

    if (headerMatch) {
      // Save previous nuclide
      saveCurrent();

      currentNuclideId = headerMatch[1];
      declaredCount = parseInt(headerMatch[3], 10);
      photonsForNuclide = [];
      totalPhotonCount = 0;
      continue;
    }

    // Parse data line: type_code yield energy_MeV label
    const parts = trimmed.split(/\s+/);
    if (parts.length < 4) continue;

    const typeCode = parseInt(parts[0], 10);
    const yieldValue = parseFloat(parts[1]);
    const energyMeV = parseFloat(parts[2]);
    const label = parts[3];

    totalPhotonCount++;

    // Filter: G (code 1), X (code 2), and annihilation quanta (code 3/AQ),
    // energy >= 20 keV, yield >= 0.0001.
    if ((typeCode === 1 || typeCode === 2 || typeCode === 3) && energyMeV >= 0.020 && yieldValue >= 0.0001) {
      photonsForNuclide.push({
        energy_keV: Math.round(energyMeV * 1000 * 10) / 10, // 1 decimal place
        yield_percent: Math.round(yieldValue * 100 * 10000) / 10000, // 4 decimal places
        type: typeCode === 1 ? 'G' : typeCode === 2 ? 'X' : 'AQ',
      });
    }
  }

  // Don't forget the last nuclide
  saveCurrent();

  if (countMismatches > 0) {
    console.warn(`⚠ ${countMismatches} nuclides with RAD count mismatches — review header regex / file integrity`);
  } else {
    console.log('✓ All RAD blocks match their declared emission counts');
  }
}

/**
 * Parse BET file to extract E_max for each nuclide
 */
function parseBET(betPath, nuclides) {
  if (!fs.existsSync(betPath)) {
    console.log(`BET file not found: ${betPath}, skipping E_max extraction`);
    return;
  }

  const content = fs.readFileSync(betPath, 'utf8');
  const lines = content.split('\n');

  let currentNuclideId = null;
  let maxEnergyMeV = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if this is a header line (nuclide_id N)
    const headerMatch = trimmed.match(/^([A-Za-z]+-?\d+[a-z]*)\s+(\d+)$/i);

    if (headerMatch) {
      // Save previous nuclide's E_max if we found one
      if (currentNuclideId && currentNuclideId in nuclides && maxEnergyMeV > 0) {
        nuclides[currentNuclideId].e_max_beta_MeV = Math.round(maxEnergyMeV * 100000) / 100000;
      }

      currentNuclideId = headerMatch[1];
      maxEnergyMeV = 0;
      continue;
    }

    // Parse data line: energy_MeV probability
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) continue;

    const energyMeV = parseFloat(parts[0]);
    const probability = parseFloat(parts[1]);

    if (!isNaN(energyMeV) && !isNaN(probability) && probability > 0) {
      maxEnergyMeV = Math.max(maxEnergyMeV, energyMeV);
    }
  }

  // Don't forget the last nuclide
  if (currentNuclideId && currentNuclideId in nuclides && maxEnergyMeV > 0) {
    nuclides[currentNuclideId].e_max_beta_MeV = Math.round(maxEnergyMeV * 100000) / 100000;
  }
}

/**
 * Extract decay modes from daughters
 */
function buildDecayModes(nuclide) {
  const raw = nuclide.decay_mode_raw || '';

  if (!nuclide.daughters || nuclide.daughters.length === 0) {
    return raw ? [{ mode: raw, branching: 1.0 }] : [{ mode: 'unknown', branching: 1.0 }];
  }

  const modes = raw.match(/EC|IT|B\+|B-|A|SF|N|P/gi) || [];
  return nuclide.daughters.map((d, idx) => ({
    mode: modes[idx] || raw || 'decay',
    daughter: d.name,
    branching: d.branching,
  }));
}

/**
 * Main
 */
function main() {
  console.log('Parsing ICRP 107 files...');

  const ndxPath = path.join(ICRP107_DIR, 'ICRP-07.NDX');
  const radPath = path.join(ICRP107_DIR, 'ICRP-07.RAD');
  const betPath = path.join(ICRP107_DIR, 'ICRP-07.BET');

  if (!fs.existsSync(ndxPath)) {
    console.error(`NDX file not found: ${ndxPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(radPath)) {
    console.error(`RAD file not found: ${radPath}`);
    process.exit(1);
  }

  // Parse NDX
  console.log(`Parsing ${ndxPath}...`);
  const nuclides = parseNDX(ndxPath);
  console.log(`Found ${Object.keys(nuclides).length} nuclides in NDX`);

  // Parse RAD
  console.log(`Parsing ${radPath}...`);
  parseRAD(radPath, nuclides);

  // Parse BET
  console.log(`Parsing ${betPath}...`);
  parseBET(betPath, nuclides);

  // Build decay_modes from daughters
  for (const nuclideId in nuclides) {
    const nuclide = nuclides[nuclideId];
    nuclide.decay_modes = buildDecayModes(nuclide);
    // Remove internal fields not needed in JSON output
    delete nuclide.rad_offset;
    delete nuclide.rad_count;
    delete nuclide.bet_offset;
    delete nuclide.bet_count;
    delete nuclide.daughters;
    delete nuclide.decay_mode_raw;
  }

  // Convert to array sorted by nuclide ID
  const nucledesArray = Object.values(nuclides).sort((a, b) => a.id.localeCompare(b.id));

  // Calculate hashes of source files for traceability (using raw bytes for platform-independent hashing)
  const ndxContent = fs.readFileSync(ndxPath);
  const ndxSha256 = crypto.createHash('sha256').update(ndxContent).digest('hex');

  let radSha256 = null;
  if (fs.existsSync(radPath)) {
    const radContent = fs.readFileSync(radPath);
    radSha256 = crypto.createHash('sha256').update(radContent).digest('hex');
  }

  let betSha256 = null;
  if (fs.existsSync(betPath)) {
    const betContent = fs.readFileSync(betPath);
    betSha256 = crypto.createHash('sha256').update(betContent).digest('hex');
  }

  // Write output
  const output = {
    version: 'ICRP 107',
    source: 'ICRP Publication 107: Nuclear Decay Data for Dosimetric Calculations',
    publication_date: '2008-06-16',
    notes: {
      generated_at: new Date().toISOString(),
      generated_by_script: 'tools/parse-icrp107.js',
      source_files_hashes: {
        icrp107_ndx_sha256: ndxSha256,
        icrp107_rad_sha256: radSha256,
        icrp107_bet_sha256: betSha256,
      },
      parser_version: '2.0 (fixed-width columns)',
    },
    nuclides: nucledesArray,
  };

  console.log(`Writing ${OUTPUT_FILE}...`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Writing ${OUTPUT_JS_FILE}...`);
  fs.writeFileSync(
    OUTPUT_JS_FILE,
    `// Generated by tools/parse-icrp107.js. Do not edit manually.\nconst ICRP107_DATA = ${JSON.stringify(output, null, 2)};\n`,
    'utf8'
  );

  // Statistics
  const withPhotons = nucledesArray.filter(n => n.photon_count_filtered > 0).length;
  const withBetEmax = nucledesArray.filter(n => n.e_max_beta_MeV !== null).length;
  const totalFilteredPhotons = nucledesArray.reduce((sum, n) => sum + n.photon_count_filtered, 0);

  console.log(`\n✓ Generated ${OUTPUT_FILE}`);
  console.log(`  ${nucledesArray.length} nuclides total`);
  console.log(`  ${withPhotons} nuclides with G/X/AQ photons (E≥20keV, yield≥0.01%)`);
  console.log(`  ${totalFilteredPhotons} total photon lines matching Cornejo criteria`);
  console.log(`  ${withBetEmax} nuclides with beta E_max data`);
}

main();
