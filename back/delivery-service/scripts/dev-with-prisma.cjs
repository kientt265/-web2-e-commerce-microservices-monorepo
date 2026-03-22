#!/usr/bin/env node
/**
 * Runs prisma generate only when prisma/schema.prisma is newer than the generated
 * client (or client missing). Then starts the app. Used by nodemon so hot reload
 * stays fast on .ts-only edits while schema changes always refresh the client.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const schemaPath = path.join(root, 'prisma', 'schema.prisma');
const clientPath = path.join(root, 'node_modules', '.prisma', 'client', 'index.js');

let needGen = true;
try {
  if (fs.existsSync(clientPath)) {
    const s = fs.statSync(schemaPath);
    const c = fs.statSync(clientPath);
    needGen = s.mtimeMs > c.mtimeMs;
  }
} catch {
  needGen = true;
}

if (needGen) {
  const r = spawnSync('npm', ['run', 'prisma:generate'], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const r = spawnSync(
  'npx',
  ['ts-node', '--transpile-only', path.join(root, 'src', 'index.ts')],
  { cwd: root, stdio: 'inherit', shell: true }
);
process.exit(r.status ?? 0);
