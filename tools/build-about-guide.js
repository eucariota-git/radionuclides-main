#!/usr/bin/env node
/**
 * build-about-guide.js — regenerate the in-app copy of the user guide
 *
 * docs/USER_GUIDE.md is the canonical source of the guide. about.html embeds a
 * copy inside <article id="user-guide">, which used to be maintained by hand
 * and drifted from the Markdown (copy audit 2026-10-03, T31/T32: examples and
 * steps that no longer matched either the guide or the app). This tool
 * converts the Markdown and replaces the article body, so both copies always
 * say the same thing.
 *
 * Usage:
 *   node tools/build-about-guide.js          write about.html
 *   node tools/build-about-guide.js --check  exit 1 if about.html is out of date
 *
 * Supported Markdown (the subset the guide uses): #–#### headings, paragraphs,
 * nested ordered/unordered lists, pipe tables, ---, **bold**, *italic*,
 * `code`, [text](url), \* escapes and the inline tags <em> and <br>.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MD = path.join(ROOT, 'docs', 'USER_GUIDE.md');
const HTML = path.join(ROOT, 'about.html');
const OPEN = '<article class="card about-content" id="user-guide">';
const CLOSE = '</article>';

function inline(text) {
  const keep = [];
  const stash = html => { keep.push(html); return `\u0000${keep.length - 1}\u0000`; };
  let t = text;
  t = t.replace(/`([^`]+)`/g, (_, c) => stash(`<code>${esc(c)}</code>`));
  t = t.replace(/<(\/?)(em|br)>/g, (_, slash, tag) => stash(`<${slash}${tag}>`));
  t = t.replace(/\\\*/g, () => stash('*'));
  t = esc(t);
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) =>
    `<a href="${url}"${/^https?:/.test(url) ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`);
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?=[^*\w]|$)/g, '$1<em>$2</em>');
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => keep[Number(i)])
    // the guide writes superscripted constants as Γ^H*(10), Γ^H'(0.07), Γ^K-air
    .replace(/Γ\^(K-air|H\*\(10\)|H'\(0\.07\))/g, 'Γ<sup>$1</sup>');
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function slug(text) {
  return text.toLowerCase().replace(/`/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function convert(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  const pad = n => '    ' + '  '.repeat(n);
  let i = 0;

  const LIST = /^(\s*)([-*]|\d+\.)\s+(.*)$/;

  function list(baseIndent, depth) {
    const first = lines[i].match(LIST);
    const tag = /\d/.test(first[2]) ? 'ol' : 'ul';
    out.push(`${pad(depth)}<${tag}>`);
    while (i < lines.length) {
      const m = lines[i].match(LIST);
      if (!m || m[1].length !== baseIndent) break;
      let text = m[3];
      i++;
      // continuation lines and nested lists
      let nested = false;
      const start = out.length;
      out.push('');
      while (i < lines.length) {
        if (lines[i].trim() === '') {
          // a blank line ends the item unless a deeper list item follows
          const next = lines[i + 1] !== undefined ? lines[i + 1].match(LIST) : null;
          if (next && next[1].length > baseIndent) { i++; continue; }
          if (next && next[1].length === baseIndent && /\d/.test(next[2]) === (tag === 'ol')) { i++; break; }
          break;
        }
        const n = lines[i].match(LIST);
        if (n && n[1].length > baseIndent) { nested = true; list(n[1].length, depth + 2); continue; }
        if (n) break;
        if (/^\s+\S/.test(lines[i])) { text += ' ' + lines[i].trim(); i++; continue; }
        break;
      }
      if (nested) {
        out[start] = `${pad(depth + 1)}<li>${inline(text)}`;
        out.push(`${pad(depth + 1)}</li>`);
      } else {
        out[start] = `${pad(depth + 1)}<li>${inline(text)}</li>`;
      }
    }
    out.push(`${pad(depth)}</${tag}>`);
  }

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { i++; continue; }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length + 1;            // # → h2 … #### → h5
      const id = level === 3 ? ` id="guide-${slug(h[2])}"` : '';
      out.push(`${pad(0)}<h${level}${id}>${inline(h[2])}</h${level}>`);
      i++; continue;
    }
    if (/^---+\s*$/.test(line)) { out.push('', `${pad(0)}<hr>`); i++; continue; }
    if (LIST.test(line)) { list(line.match(LIST)[1].length, 0); continue; }
    if (/^\|/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
        i++;
      }
      const body = rows.filter((r, k) => k !== 1);   // row 1 is the |---| separator
      out.push(`${pad(0)}<div class="overflow-x-auto">`, `${pad(1)}<table class="about-table">`,
        `${pad(2)}<thead><tr>${body[0].map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead>`, `${pad(2)}<tbody>`);
      for (const r of body.slice(1)) out.push(`${pad(3)}<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`);
      out.push(`${pad(2)}</tbody>`, `${pad(1)}</table>`, `${pad(0)}</div>`);
      continue;
    }
    // paragraph
    const para = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,4}\s|---+\s*$|\|)/.test(lines[i]) && !LIST.test(lines[i])) {
      para.push(lines[i].trim());
      i++;
    }
    out.push(`${pad(0)}<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('\n');
}

function build() {
  const html = fs.readFileSync(HTML, 'utf8');
  const nl = html.includes('\r\n') ? '\r\n' : '\n';
  const a = html.indexOf(OPEN);
  const b = html.indexOf(CLOSE, a);
  if (a < 0 || b < 0) throw new Error('about.html: <article id="user-guide"> not found');
  const body = convert(fs.readFileSync(MD, 'utf8')).replace(/\n/g, nl);
  return html.slice(0, a + OPEN.length) + nl + body + nl + '  ' + html.slice(b);
}

if (require.main === module) {
  const next = build();
  const current = fs.readFileSync(HTML, 'utf8');
  if (process.argv.includes('--check')) {
    if (next !== current) { console.error('about.html guide is out of date: run node tools/build-about-guide.js'); process.exit(1); }
    console.log('✓ about.html guide matches docs/USER_GUIDE.md');
  } else {
    fs.writeFileSync(HTML, next);
    console.log(next === current ? '✓ about.html guide already up to date' : '✓ about.html guide regenerated from docs/USER_GUIDE.md');
  }
}

module.exports = { convert, build };
