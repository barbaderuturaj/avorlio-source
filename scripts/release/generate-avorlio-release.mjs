#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SHA = /^[0-9a-f]{40}$/i;
const IMAGE = /^sha256:[0-9a-f]{64}$/i;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const allowed = new Set([
  'output', 'project', 'environment', 'release-kind', 'source-repository',
  'source-commit', 'corresponding-source-commit', 'release-tag',
  'docker-image-id', 'deployed-at', 'migration-identity', 'generated-at',
  'production-original-git-sha-known', 'corresponding-source-anchor',
  'reconstruction-tag', 'project-brain-commit', 'original-deployed-at',
  'migration-parity', 'dodo-parity', 'stamped-at', 'provenance-note',
]);

function fail(message) { throw new Error(message); }
function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) fail(`Unexpected argument: ${token}`);
    const [rawName, inlineValue] = token.slice(2).split('=', 2);
    if (!allowed.has(rawName)) fail(`Unknown flag: --${rawName}`);
    const value = inlineValue ?? argv[++index];
    if (value === undefined || value.startsWith('--')) fail(`Missing value for --${rawName}`);
    values[rawName] = value;
  }
  return values;
}
function required(values, key) {
  if (!values[key]) fail(`--${key} is required`);
  return values[key];
}
function sha(value, label) {
  if (!SHA.test(value)) fail(`${label} must be a 40-character Git SHA`);
  return value.toLowerCase();
}
function image(value) {
  if (!IMAGE.test(value)) fail('--docker-image-id must be a full sha256 image digest');
  return value.toLowerCase();
}
function timestamp(value, label) {
  if (!ISO.test(value) || Number.isNaN(Date.parse(value))) fail(`${label} must be an ISO-8601 UTC timestamp`);
  return value;
}
function gitSha() {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); }
  catch { fail('Could not obtain Git SHA; pass --source-commit explicitly'); }
}

try {
  const values = parseArgs(process.argv.slice(2));
  const releaseKind = required(values, 'release-kind');
  if (!['normal_deploy', 'reconstructed_baseline'].includes(releaseKind)) fail('--release-kind must be normal_deploy or reconstructed_baseline');
  const manifest = {
    schema_version: 1,
    project: values.project ?? 'Avorlio',
    environment: required(values, 'environment'),
    release_kind: releaseKind,
    source_repository: required(values, 'source-repository'),
    docker_image_id: image(required(values, 'docker-image-id')),
  };
  if (releaseKind === 'normal_deploy') {
    const sourceCommit = sha(values['source-commit'] ?? gitSha(), '--source-commit');
    manifest.source_commit = sourceCommit;
    manifest.corresponding_source_commit = sha(values['corresponding-source-commit'] ?? sourceCommit, '--corresponding-source-commit');
    manifest.release_tag = values['release-tag'] ?? null;
    manifest.deployed_at = timestamp(required(values, 'deployed-at'), '--deployed-at');
    manifest.migration_identity = required(values, 'migration-identity');
    manifest.generated_at = timestamp(values['generated-at'] ?? new Date().toISOString(), '--generated-at');
  } else {
    if (values['source-commit']) fail('reconstructed_baseline must not supply --source-commit');
    if (values['original-deployed-at']) fail('reconstructed_baseline must not invent --original-deployed-at');
    if ((values['production-original-git-sha-known'] ?? 'false') !== 'false') fail('reconstructed_baseline requires --production-original-git-sha-known false');
    manifest.source_commit = null;
    manifest.production_original_git_sha_known = false;
    manifest.corresponding_source_anchor = sha(required(values, 'corresponding-source-anchor'), '--corresponding-source-anchor');
    manifest.reconstruction_tag = required(values, 'reconstruction-tag');
    manifest.project_brain_commit = sha(required(values, 'project-brain-commit'), '--project-brain-commit');
    manifest.original_deployed_at = null;
    manifest.migration_parity = required(values, 'migration-parity');
    manifest.dodo_parity = required(values, 'dodo-parity');
    manifest.stamped_at = timestamp(required(values, 'stamped-at'), '--stamped-at');
    manifest.provenance_note = required(values, 'provenance-note');
  }
  const output = resolve(required(values, 'output'));
  writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', mode: 0o644 });
  process.stdout.write(`Wrote ${output}\n`);
} catch (error) {
  process.stderr.write(`Release manifest generation failed: ${error.message}\n`);
  process.exitCode = 1;
}
