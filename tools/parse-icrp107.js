#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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
 * Parse NDX file to extract nuclide metadata
 */
function parseNDX(ndxPath) {
  const content = fs.readFileSync(ndxPath, 'utf8');
  const lines = content.split(/\r?\n/);

  const nuclides = {};

  // First line is the format descriptor. Nuclide records begin on line 2.
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Split by spaces and filter empty strings
    const parts = line.split(/\s+/).filter(p => p);
    if (parts.length < 4) continue;

    const nuclideId = parts[0];
    const halfLifeStr = parts[1];

    // Decay modes (parts[2])
    // RAD offset (parts[3])
    // BET offset (parts[4])

    const radOffset = parseInt(parts[3], 10) || 0;
    const betOffset = parseInt(parts[4], 10) || 0;

    // Daughters are in groups of (name, ndxIdx, branching), starting at parts[7].
    const daughters = [];
    let daughterEndIdx = 7;
    for (let j = 7; j + 2 < parts.length && daughters.length < 4; j += 3) {
      const potentialName = parts[j];
      const potentialIdx = parseInt(parts[j + 1], 10);
      const potentialBranch = parseFloat(parts[j + 2]);

      // Valid daughter: is a name (element symbol like "Fr-219", "Ra-224"),
      // has valid index, has valid branching < 1.0
      if (potentialName && potentialName.match(/^[A-Z][a-z]?-\d+$/) &&
          !isNaN(potentialIdx) && potentialIdx >= 0 &&
          !isNaN(potentialBranch) && potentialBranch > 0 && potentialBranch <= 1.0) {
        daughters.push({ name: potentialName, branching: potentialBranch });
        daughterEndIdx = j + 3;
      } else {
        // Stop if we encounter invalid data (end of daughters section)
        break;
      }
    }

    // After daughters, extract mean energies and dose coefficients
    // NDX format always has 4 daughter triplets (12 values starting at position 7), then:
    //   e_mean_alpha_MeV e_mean_electron_MeV e_mean_photon_MeV Z radCount betCount betEmissions alphaCount atomic_mass dose_inhalation dose_ingestion
    // The daughters section is always 4 triplets = 12 values, regardless of whether all 4 are filled

    let e_mean_alpha_MeV = null;
    let e_mean_electron_MeV = null;
    let e_mean_photon_MeV = null;
    let Z = null;
    let atomic_mass_u = null;
    let dose_inhalation_Sv_per_Bq = null;
    let dose_ingestion_Sv_per_Bq = null;

    // Daughters always occupy 4 triplets = positions 7-18 (12 values)
    // Position 7 + 12 values = positions 7-18, so meanEnergyStart is 19? NO!
    // Positions: 7,8,9 = triplet 1
    //           10,11,12 = triplet 2
    //           13,14,15 = triplet 3
    //           16,17,18 = triplet 4 (positions 7 through 18 inclusive = 12 values)
    // So position 18 is the last daughter value, and position 19 is... wait, let me recount.
    // parts[7] to parts[18] = 12 values. parts[19] would be the 13th value.
    // But the first mean energy is at parts[18]. So the formula is: start = 7 + 11 = 18
    const meanEnergyStart = 18;

    if (parts.length >= meanEnergyStart + 3) {
      const val1 = parseFloat(parts[meanEnergyStart]);
      const val2 = parseFloat(parts[meanEnergyStart + 1]);
      const val3 = parseFloat(parts[meanEnergyStart + 2]);

      if (!isNaN(val1)) e_mean_alpha_MeV = Math.round(val1 * 100000) / 100000;
      if (!isNaN(val2)) e_mean_electron_MeV = Math.round(val2 * 100000) / 100000;
      if (!isNaN(val3)) e_mean_photon_MeV = Math.round(val3 * 100000) / 100000;
    }

    // Z is at mean_energy_start + 3
    if (parts.length >= meanEnergyStart + 4) {
      const zVal = parseInt(parts[meanEnergyStart + 3], 10);
      if (!isNaN(zVal) && zVal > 0 && zVal <= 120) Z = zVal;
    }

    // Extract from the end: atomic_mass, then the two dose coefficients
    // The second-to-last value is atomic_mass, the last value is concatenated dose coefficients
    // Example: parts[26]="226.026097", parts[27]="1.048E-171.048E-17"
    if (parts.length >= 2) {
      const aMass = parseFloat(parts[parts.length - 2]);
      if (!isNaN(aMass) && aMass > 0 && aMass < 300) {
        atomic_mass_u = Math.round(aMass * 1000000) / 1000000;
      }

      // The last value is concatenated dose_inhalation + dose_ingestion in scientific notation
      // Example: "1.048E-171.048E-17" = two consecutive numbers without separator
      // Both numbers have the format: d.dddEsx where s is sign, x are exponent digits
      // Strategy: find all positions where "E" appears, then split after first exponent
      // Exponent is sign (optional) + digits, stops at decimal point or next E
      const lastVal = parts[parts.length - 1];
      const ePositions = [];
      for (let i = 0; i < lastVal.length; i++) {
        if (lastVal[i].toUpperCase() === 'E') {
          ePositions.push(i);
        }
      }

      if (ePositions.length === 2) {
        // Find the end of first exponent (continue past sign and digits, stop at decimal)
        let splitPos = ePositions[0] + 1;
        if (lastVal[splitPos] === '+' || lastVal[splitPos] === '-') splitPos++;
        // Continue consuming digits until we hit a decimal point or run out of digits
        while (splitPos < lastVal.length && /\d/.test(lastVal[splitPos]) && lastVal[splitPos + 1] !== '.') {
          splitPos++;
        }
        // If the next character after digits is a decimal, stop before it
        if (/\d/.test(lastVal[splitPos])) splitPos++;

        const doseInh = parseFloat(lastVal.substring(0, splitPos));
        const doseIng = parseFloat(lastVal.substring(splitPos));
        if (!isNaN(doseInh)) dose_inhalation_Sv_per_Bq = doseInh;
        if (!isNaN(doseIng)) dose_ingestion_Sv_per_Bq = doseIng;
      }
    }

    // Find RAD count and BET count - they should be near the end
    // Look for two consecutive integers that seem reasonable (between 0-2000)
    let radCount = 0;
    let betCount = 0;
    for (let j = parts.length - 15; j < parts.length - 2; j++) {
      const val = parseInt(parts[j], 10);
      if (!isNaN(val) && val > 0 && val < 2000) {
        if (radCount === 0) {
          radCount = val;
        } else if (betCount === 0) {
          betCount = val;
          break;
        }
      }
    }

    const halfLifeS = parseHalfLife(halfLifeStr);
    const halfLifeDisplay = formatHalfLife(halfLifeS);

    nuclides[nuclideId] = {
      id: nuclideId,
      half_life_s: halfLifeS,
      half_life_display: halfLifeDisplay,
      decay_mode_raw: parts[2],
      daughters,
      rad_offset: radOffset,
      rad_count: radCount,
      bet_offset: betOffset,
      bet_count: betCount,
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

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if this is a header line (nuclide_name half_life N)
    const headerMatch = trimmed.match(/^([A-Za-z]+-?\d+[a-z]*)\s+([0-9.a-z]+)\s+(\d+)$/i);

    if (headerMatch) {
      // Save previous nuclide
      if (currentNuclideId && currentNuclideId in nuclides) {
        nuclides[currentNuclideId].photons = photonsForNuclide;
        nuclides[currentNuclideId].photon_count_total = totalPhotonCount;
        nuclides[currentNuclideId].photon_count_filtered = photonsForNuclide.length;
      }

      currentNuclideId = headerMatch[1];
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
  if (currentNuclideId && currentNuclideId in nuclides) {
    nuclides[currentNuclideId].photons = photonsForNuclide;
    nuclides[currentNuclideId].photon_count_total = totalPhotonCount;
    nuclides[currentNuclideId].photon_count_filtered = photonsForNuclide.length;
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

  // Write output
  const output = {
    version: 'ICRP 107',
    source: 'ICRP Publication 107: Nuclear Decay Data for Dosimetric Calculations',
    publication_date: '2008-06-16',
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
