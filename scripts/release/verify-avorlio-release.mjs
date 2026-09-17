#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SHA = /^[0-9a-f]{40}$/i;
const IMAGE = /^sha256:[0-9a-f]{64}$/i;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const SECRET_KEY = /(?:api[_-]?key|password|secret|token|private[_-]?key|database[_-]?url)/i;
function fail(message) { throw new Error(message); }
function requireValue(object, key) { if (object[key] === undefined || object[key] === null || object[key] === '') fail(`Missing required field: ${key}`); return object[key]; }
function sha(value, key) { if (typeof value !== 'string' || !SHA.test(value)) fail(`${key} must be a 40-character Git SHA`); }
function image(value) { if (typeof value !== 'string' || !IMAGE.test(value)) fail('docker_image_id must be a full sha256 image digest'); }
function timestamp(value, key) { if (typeof value !== 'string' || !ISO.test(value) || Number.isNaN(Date.parse(value))) fail(`${key} must be an ISO-8601 UTC timestamp`); }
function rejectSecrets(value, path = '') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    if (SECRET_KEY.test(key)) fail(`Forbidden secret-like field: ${childPath}`);
    rejectSecrets(child, childPath);
  }
}
function fileArg(argv) {
  if (argv.length !== 2 || argv[0] !== '--file') fail('Usage: node scripts/release/verify-avorlio-release.mjs --file <path>');
  return argv[1];
}
try {
  const file = resolve(fileArg(process.argv.slice(2)));
  const manifest = JSON.parse(readFileSync(file, 'utf8'));
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) fail('Manifest must be a JSON object');
  rejectSecrets(manifest);
  if (manifest.schema_version !== 1) fail('schema_version must be 1');
  if (manifest.project !== 'Avorlio') fail('project must be Avorlio');
  requireValue(manifest, 'environment');
  requireValue(manifest, 'source_repository');
  image(requireValue(manifest, 'docker_image_id'));
  if (manifest.release_kind === 'normal_deploy') {
    sha(requireValue(manifest, 'source_commit'), 'source_commit');
    sha(requireValue(manifest, 'corresponding_source_commit'), 'corresponding_source_commit');
    timestamp(requireValue(manifest, 'deployed_at'), 'deployed_at');
    requireValue(manifest, 'migration_identity');
    timestamp(requireValue(manifest, 'generated_at'), 'generated_at');
  } else if (manifest.release_kind === 'reconstructed_baseline') {
    if (manifest.source_commit !== null) fail('reconstructed_baseline requires source_commit to be null');
    if (manifest.production_original_git_sha_known !== false) fail('reconstructed_baseline requires production_original_git_sha_known to be false');
    sha(requireValue(manifest, 'corresponding_source_anchor'), 'corresponding_source_anchor');
    requireValue(manifest, 'reconstruction_tag');
    sha(requireValue(manifest, 'project_brain_commit'), 'project_brain_commit');
    if (manifest.original_deployed_at !== null) fail('reconstructed_baseline requires original_deployed_at to be null');
    requireValue(manifest, 'migration_parity');
    requireValue(manifest, 'dodo_parity');
    timestamp(requireValue(manifest, 'stamped_at'), 'stamped_at');
    requireValue(manifest, 'provenance_note');
  } else fail('release_kind must be normal_deploy or reconstructed_baseline');
  process.stdout.write(`Valid release manifest: ${file}\n`);
} catch (error) {
  process.stderr.write(`Release manifest verification failed: ${error.message}\n`);
  process.exitCode = 1;
}
