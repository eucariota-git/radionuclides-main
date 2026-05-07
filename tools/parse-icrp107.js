#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ICRP107_DIR = path.join(__dirname, '../data/sources/icrp107');
const OUTPUT_FILE = path.join(__dirname, '../data/icrp107-index.json');

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
    console.warn(`Cannot parse half-life value: "${match[1]}"`);
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

  // Skip first two lines (format descriptor and header)
  for (let i = 2; i < lines.length; i++) {
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

    // Daughters are in groups of (name, radIdx, branching)
    // Skip past decay_modes (parts[2]) and first 4 offset fields
    // Daughters should start around parts[6]
    const daughters = [];
    let daughterCount = 0;
    for (let j = 6; j + 2 < parts.length && daughterCount < 3; j += 3) {
      const potentialName = parts[j];
      const potentialIdx = parseInt(parts[j + 1], 10);
      const potentialBranch = parseFloat(parts[j + 2]);

      // Valid daughter: is a name (element symbol like "Fr-219", "Ra-224"),
      // has valid index, has valid branching < 1.0
      if (potentialName && potentialName.match(/^[A-Z][a-z]?-\d+$/) &&
          !isNaN(potentialIdx) && potentialIdx > 0 &&
          !isNaN(potentialBranch) && potentialBranch > 0 && potentialBranch <= 1.0) {
        daughters.push({ name: potentialName, branching: potentialBranch });
        daughterCount++;
      } else {
        // Stop if we encounter invalid data (end of daughters section)
        break;
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
      daughters,
      rad_offset: radOffset,
      rad_count: radCount,
      bet_offset: betOffset,
      bet_count: betCount,
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

    // Filter: only G (code 1) and X (code 2), energy >= 20 keV, yield >= 0.0001
    if ((typeCode === 1 || typeCode === 2) && energyMeV >= 0.020 && yieldValue >= 0.0001) {
      photonsForNuclide.push({
        energy_keV: Math.round(energyMeV * 1000 * 10) / 10, // 1 decimal place
        yield_percent: Math.round(yieldValue * 100 * 10000) / 10000, // 4 decimal places
        type: typeCode === 1 ? 'G' : 'X',
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
 * Extract decay modes from daughters
 */
function buildDecayModes(nuclide) {
  if (!nuclide.daughters || nuclide.daughters.length === 0) {
    return [{ mode: 'unknown', branching: 1.0 }];
  }

  // Map common daughter patterns to decay modes
  const modeMap = {
    'n': 'n',
    'p': 'p',
    'α': 'α',
    'β-': 'β-',
    'β+': 'β+',
    'EC': 'EC',
    'IT': 'IT',
  };

  // For now, infer from daughter name decrease (A and Z)
  // This is a simplification; a full implementation would parse the NDX decay_modes field
  return nuclide.daughters.map(d => ({
    mode: 'decay',
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

  // Statistics
  const withPhotons = nucledesArray.filter(n => n.photon_count_filtered > 0).length;
  const totalFilteredPhotons = nucledesArray.reduce((sum, n) => sum + n.photon_count_filtered, 0);

  console.log(`\n✓ Generated ${OUTPUT_FILE}`);
  console.log(`  ${nucledesArray.length} nuclides total`);
  console.log(`  ${withPhotons} nuclides with G/X rays (E≥20keV, yield≥0.01%)`);
  console.log(`  ${totalFilteredPhotons} total photon lines matching Cornejo criteria`);
}

main();
