#!/usr/bin/env node
'use strict';

/**
 * snip-cli — zero-dependency Node CLI for the Snip URL shortener.
 *
 * Commands
 *   snip add <url>    POST /api/links  → prints shortUrl
 *   snip ls           GET  /api/links  → aligned code/hits/url table
 *   snip open <code>  GET  /:code (no follow) → opens Location in browser
 *   snip help         prints this usage
 *
 * Config
 *   SNIP_API   base URL of the Snip backend  (default: http://localhost:3000)
 */

const { execFile } = require('child_process');
const http  = require('http');
const https = require('https');

const BASE = (process.env.SNIP_API || 'http://localhost:3000').replace(/\/$/, '');
const [, , cmd, arg] = process.argv;

// ─── helpers ────────────────────────────────────────────────────────────────

function die(msg) {
  process.stderr.write(msg + '\n');
  process.exit(1);
}

function usage() {
  console.log([
    'Usage:',
    '  snip add <url>    Shorten a URL and print the short link',
    '  snip ls           List all links (code / hits / original URL)',
    '  snip open <code>  Open a short link in the default browser',
    '  snip help         Show this help text',
    '',
    'Environment:',
    '  SNIP_API   Base URL of the Snip backend (default: http://localhost:3000)',
  ].join('\n'));
}

/** Calls global fetch; exits cleanly on network error. */
async function apiFetch(path, opts = {}) {
  try {
    return await fetch(BASE + path, opts);
  } catch (e) {
    die(`Backend unreachable (${BASE}): ${e.message}`);
  }
}

/**
 * Raw HTTP GET via Node's built-in http/https module.
 * Does NOT follow redirects, so we can read the Location header directly.
 */
function httpGetOnce(urlStr) {
  return new Promise((resolve, reject) => {
    const mod = urlStr.startsWith('https') ? https : http;
    const req = mod.get(urlStr, { headers: { 'User-Agent': 'snip-cli/1.0' } }, (res) => {
      res.resume(); // drain — we only need the headers
      resolve({
        status:   res.statusCode,
        location: res.headers['location'] || null,
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => req.destroy(new Error('Request timed out')));
  });
}

// ─── commands ────────────────────────────────────────────────────────────────

async function cmdAdd(url) {
  if (!url) die('Usage: snip add <url>');

  const res = await apiFetch('/api/links', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ url }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    die(`Error ${res.status}: ${body || res.statusText}`);
  }

  const data = await res.json();
  console.log(data.shortUrl);
}

async function cmdLs() {
  const res = await apiFetch('/api/links');

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    die(`Error ${res.status}: ${body || res.statusText}`);
  }

  const links = await res.json();
  if (!Array.isArray(links) || links.length === 0) {
    console.log('No links yet.');
    return;
  }

  // Column widths — at least as wide as the header label
  const codeW = Math.max('CODE'.length, ...links.map(l => String(l.code).length));
  const hitsW = Math.max('HITS'.length, ...links.map(l => String(l.hits).length));

  const row = (code, hits, url) =>
    String(code).padEnd(codeW) + '  ' + String(hits).padStart(hitsW) + '  ' + url;

  console.log(row('CODE', 'HITS', 'URL'));
  console.log('-'.repeat(codeW) + '  ' + '-'.repeat(hitsW) + '  ' + '-'.repeat(40));
  for (const l of links) {
    console.log(row(l.code, l.hits, l.url));
  }
}

async function cmdOpen(code) {
  if (!code) die('Usage: snip open <code>');

  let result;
  try {
    result = await httpGetOnce(`${BASE}/${code}`);
  } catch (e) {
    die(`Backend unreachable (${BASE}): ${e.message}`);
  }

  const { status, location } = result;
  if (!location || status < 300 || status >= 400) {
    die(`Unknown code "${code}" (HTTP ${status})`);
  }

  // Use execFile (not execSync/shell) to avoid shell injection via Location header
  const [prog, args] =
    process.platform === 'win32'  ? ['cmd',     ['/c', 'start', '', location]] :
    process.platform === 'darwin' ? ['open',     [location]] :
                                    ['xdg-open', [location]];

  execFile(prog, args, { stdio: 'ignore', shell: false }, (err) => {
    if (err) die(`Could not open browser: ${err.message}`);
  });
  console.log(`Opening: ${location}`);
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  switch (cmd) {
    case 'add':   return cmdAdd(arg);
    case 'ls':    return cmdLs();
    case 'open':  return cmdOpen(arg);
    case 'help':
    case undefined:
      return usage();
    default:
      process.stderr.write(`Unknown command: "${cmd}"\n\n`);
      usage();
      process.exit(1);
  }
}

main().catch(e => {
  process.stderr.write(`Unexpected error: ${e.message}\n`);
  process.exit(1);
});
