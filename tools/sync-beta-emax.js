#!/usr/bin/env node

/**
 * sync-beta-emax.js — Copy the beta endpoint and beta yield of every curated
 * nuclide from the parsed ICRP 107 index (data/icrp107-index.json).
 *
 *   e_max_beta_MeV        highest endpoint over all beta branches (ICRP 107 BET)
 *   beta_yield_per_decay  beta particles per decay (integral of the BET spectrum)
 *   e_max_beta_chain      true when the value comes from chain progeny in
 *                         equilibrium (Ra-223, Ac-225: alpha emitters whose
 *                         beta comes from Pb-211/Tl-207, Bi-213/Pb-209/Tl-209)
 *
 * Composite entries (Mo-99+Tc-99m, …) and nuclides without a BET block are left
 * without these fields. Chain membership follows tools/add-therapy-nuclides.js
 * (members shorter-lived than 0.1 × the head's half-life). For a chain the
 * reported endpoint is the maximum over members and the yield is the sum of
 * member yields weighted by their equilibrium branching.
 *
 * Usage: node tools/sync-beta-emax.js        (then node tools/generate-data.js)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data');
const nuclidesPath = path.join(DATA, 'nuclides.json');
const nuclideData = JSON.parse(fs.readFileSync(nuclidesPath, 'utf8'));
const index = JSON.parse(fs.readFileSync(path.join(DATA, 'icrp107-index.json'), 'utf8'));
const icrpMap = Object.fromEntries(index.nuclides.map(n => [n.id, n]));

const CHAINS = ['Ra-223', 'Ac-225'];

// Same rule as tools/add-therapy-nuclides.js chainMembers()
function chainMembers(headId) {
  const head = icrpMap[headId];
  const seen = new Map();
  const queue = [{ id: headId, branch: 1 }];
  while (queue.length) {
    const { id, branch } = queue.shift();
    const n = icrpMap[id];
    if (!n) continue;
    if (id !== headId && (!n.half_life_s || n.half_life_s >= 0.1 * head.half_life_s)) continue;
    seen.set(id, (seen.get(id) || 0) + branch);
    for (const d of n.decay_modes || []) {
      if (d.daughter && d.branching > 0) queue.push({ id: d.daughter, branch: branch * d.branching });
    }
  }
  return [...seen].map(([id, branch]) => ({ id, branch }));
}

let changed = 0;
for (const n of nuclideData.nuclides) {
  let eMax = null, yieldPerDecay = null, chain = false;
  if (CHAINS.includes(n.id)) {
    for (const { id, branch } of chainMembers(n.id)) {
      const m = icrpMap[id];
      if (m.e_max_beta_MeV == null) continue;
      eMax = eMax === null ? m.e_max_beta_MeV : Math.max(eMax, m.e_max_beta_MeV);
      yieldPerDecay = (yieldPerDecay || 0) + branch * m.beta_yield_per_decay;
    }
    chain = eMax !== null;
    if (yieldPerDecay !== null) yieldPerDecay = Number(yieldPerDecay.toPrecision(4));
  } else if (icrpMap[n.id]) {
    eMax = icrpMap[n.id].e_max_beta_MeV;
    yieldPerDecay = icrpMap[n.id].beta_yield_per_decay;
  }
  const before = JSON.stringify([n.e_max_beta_MeV, n.beta_yield_per_decay, n.e_max_beta_chain]);
  if (eMax === null) {
    delete n.e_max_beta_MeV; delete n.beta_yield_per_decay; delete n.e_max_beta_chain;
  } else {
    n.e_max_beta_MeV = eMax;
    n.beta_yield_per_decay = yieldPerDecay;
    if (chain) n.e_max_beta_chain = true; else delete n.e_max_beta_chain;
  }
  if (JSON.stringify([n.e_max_beta_MeV, n.beta_yield_per_decay, n.e_max_beta_chain]) !== before) {
    changed++;
    console.log(`${n.id}: ${before} → ${JSON.stringify([n.e_max_beta_MeV, n.beta_yield_per_decay, n.e_max_beta_chain])}`);
  }
}

if (changed) {
  nuclideData.notes.last_modified_at = new Date().toISOString();
  fs.writeFileSync(nuclidesPath, JSON.stringify(nuclideData, null, 2) + '\n', 'utf8');
}
console.log(`✓ ${changed} curated entries updated${changed ? ' — now run node tools/generate-data.js' : ''}`);
