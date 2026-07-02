#!/usr/bin/env node
/**
 * scripts/build-bundle.mjs
 *
 * Assembles the bundle/ release branch from the three source submodules and
 * optionally publishes the result.
 *
 * Usage (from the superproject root):
 *   node scripts/build-bundle.mjs          # build + commit locally
 *   node scripts/build-bundle.mjs --push   # build + commit + push
 *
 * Safe no-op: if nothing changed since the last run the script skips every
 * commit step (git diff --cached returns empty before each git commit call).
 *
 * Works on Windows, macOS, Linux and in CI — zero external dependencies.
 */

import { execSync }    from 'node:child_process';
import {
  existsSync, mkdirSync, copyFileSync, writeFileSync,
  readdirSync, statSync, rmSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const ROOT  = join(__dirname, '..');   // superproject root
const PUSH  = process.argv.includes('--push');
const UNAME = 'Lavanya';
const EMAIL = 'lavanyakuppusamy.it@gmail.com';

// ─── helpers ─────────────────────────────────────────────────────────────────

const log = (msg) => console.log(`\n▶  ${msg}`);

function die(msg) {
  process.stderr.write(`\nERROR: ${msg}\n`);
  process.exit(1);
}

/** Run a shell command, streaming output, and exit on failure. */
function run(cmd, cwd = ROOT) {
  console.log(`  $ ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', shell: true });
}

/** Run a shell command and return trimmed stdout (never throws). */
function out(cmd, cwd = ROOT) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', shell: true }).trim();
  } catch {
    return '';
  }
}

/** git commit with explicit identity (CI-safe). */
function gitCommit(msg, cwd = ROOT) {
  run(
    `git -c user.name="${UNAME}" -c user.email="${EMAIL}" commit -m "${msg}"`,
    cwd,
  );
}

/** Recursively copy src → dst (directories are mirrored, files are overwritten). */
function cpR(src, dst) {
  if (statSync(src).isDirectory()) {
    mkdirSync(dst, { recursive: true });
    for (const entry of readdirSync(src)) cpR(join(src, entry), join(dst, entry));
  } else {
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(src, dst);
  }
}

// ─── paths ────────────────────────────────────────────────────────────────────

const BACKEND   = join(ROOT, 'backend');
const FRONTEND  = join(ROOT, 'frontend');
const CLI_DIR   = join(ROOT, 'cli');
const BUNDLE    = join(ROOT, 'bundle');
const NG_BIN    = join(FRONTEND, 'node_modules', '@angular', 'cli', 'bin', 'ng.js');
const DIST_DIR  = join(FRONTEND, 'dist', 'snip-frontend', 'browser');
const DIST_IDX  = join(DIST_DIR, 'index.html');

// ─── 1. update source submodules to their branch tips ────────────────────────

log('Updating backend / frontend / cli to their branch tips');
run('git submodule update --init --remote backend frontend cli');

// ─── 2. build the Angular frontend ───────────────────────────────────────────

log('npm install (frontend)');
run('npm install', FRONTEND);

log('ng build (frontend)');
run(`node "${NG_BIN}" build`, FRONTEND);

if (!existsSync(DIST_IDX)) {
  die(`ng build finished but ${DIST_IDX} is missing — check the build output above`);
}
log('Frontend build OK ✓');

// ─── 3. ensure bundle/ has a named branch (submodule checkouts are detached) ─

// git checkout -B bundle  →  create-or-reset local "bundle" branch at current HEAD
// This is safe to repeat: on subsequent runs HEAD is already at the last commit.
run('git checkout -B bundle', BUNDLE);

// ─── 4. write bundle/ contents ───────────────────────────────────────────────

log('Assembling bundle/');

// server.js and cli.js — copied flat
copyFileSync(join(BACKEND, 'server.js'), join(BUNDLE, 'server.js'));
copyFileSync(join(CLI_DIR, 'cli.js'),    join(BUNDLE, 'cli.js'));

// public/ — wipe and re-copy so deleted assets don't linger between builds
const PUBLIC = join(BUNDLE, 'public');
if (existsSync(PUBLIC)) rmSync(PUBLIC, { recursive: true, force: true });
cpR(DIST_DIR, PUBLIC);

// .env — Bun auto-loads this; tells the server where the static files live
writeFileSync(join(BUNDLE, '.env'), 'PUBLIC_DIR=./public\n', 'utf8');

// package.json — NO "type" field so cli.js still runs under plain node
writeFileSync(
  join(BUNDLE, 'package.json'),
  JSON.stringify({
    name:        'snip-bundle',
    version:     '1.0.0',
    description: 'Snip self-contained bundle — Bun backend + Angular SPA',
    scripts:     { start: 'bun server.js' },
  }, null, 2) + '\n',
  'utf8',
);

// Dockerfile
writeFileSync(join(BUNDLE, 'Dockerfile'), [
  'FROM oven/bun:1-alpine',
  'WORKDIR /app',
  'COPY . .',
  'ENV PORT=3000',
  'EXPOSE 3000',
  'CMD ["bun", "server.js"]',
  '',
].join('\n'), 'utf8');

// .dockerignore
writeFileSync(join(BUNDLE, '.dockerignore'), [
  '.git',
  '*.md',
  'node_modules',
  '',
].join('\n'), 'utf8');

// railway.json — use the Dockerfile builder
writeFileSync(
  join(BUNDLE, 'railway.json'),
  JSON.stringify({
    $schema: 'https://railway.app/railway.schema.json',
    build:   { builder: 'DOCKERFILE', dockerfilePath: 'Dockerfile' },
    deploy:  { startCommand: 'bun server.js', restartPolicyType: 'ON_FAILURE' },
  }, null, 2) + '\n',
  'utf8',
);

log('Bundle files written ✓');

// ─── 5. commit inside bundle/ (guarded: skip when nothing changed) ────────────

log('Checking for changes in bundle/');
run('git add -A', BUNDLE);
const bundleDiff = out('git diff --cached --stat', BUNDLE);

if (bundleDiff) {
  console.log(bundleDiff);
  gitCommit('chore: update bundle output', BUNDLE);
  log('bundle/ committed ✓');
  if (PUSH) {
    log('Pushing bundle branch');
    // push via HEAD:bundle — works whether HEAD is detached or on the branch
    run('git push origin HEAD:bundle', BUNDLE);
    log('bundle branch pushed ✓');
  }
} else {
  log('bundle/ — nothing to commit (already up to date)');
  if (PUSH) {
    log('Pushing bundle branch (ensure remote is caught up)');
    run('git push origin HEAD:bundle', BUNDLE);
  }
}

// ─── 6. bump the bundle submodule pointer in the superproject ─────────────────

log('Checking superproject bundle pointer');
run('git add bundle', ROOT);
const superDiff = out('git diff --cached --stat', ROOT);

if (superDiff) {
  console.log(superDiff);
  gitCommit('chore: bump bundle submodule', ROOT);
  log('Superproject pointer bumped ✓');
  if (PUSH) {
    log('Pushing superproject (main)');
    run('git push origin main', ROOT);
    log('main pushed ✓');
  }
} else {
  log('Superproject — nothing to commit (bundle pointer already up to date)');
  if (PUSH) {
    log('Pushing superproject main (ensure remote is caught up)');
    run('git push origin main', ROOT);
  }
}

// ─────────────────────────────────────────────────────────────────────────────

log(`Done!${PUSH ? ' (pushed)' : ' Run with --push to publish.'}`);
