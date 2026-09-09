import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { publicationDecision, releaseEnvironment, validateConfig } from './release-metadata.mjs';

const config = validateConfig(JSON.parse(fs.readFileSync('applications/glint-desktop/release.json', 'utf8')));
const dir = `applications/glint-desktop/dist/releases/${config.version}`;
const repo = process.env.GH_REPO;
if (!repo || !process.env.GITHUB_SHA) throw new Error('Publish only through the main production pipeline');
function gh(args) { return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
function api(endpoint) {
  try { return JSON.parse(gh(['api', `repos/${repo}/${endpoint}`])); }
  catch (error) { if (String(error.stderr).includes('HTTP 404')) return null; throw error; }
}
function provenance(text) { return Object.fromEntries(text.trim().split('\n').map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; })); }
function remoteProvenance(tag) { return provenance(gh(['release', 'download', tag, '--repo', repo, '--pattern', 'BUILD-PROVENANCE.txt', '--output', '-'])); }

// Verify every payload before any mutation. Deployment uses the build job's
// uploaded bytes; it must not rebuild or accept a mismatched checkout/config.
for (const line of fs.readFileSync(`${dir}/SHA256SUMS`, 'utf8').trim().split('\n')) {
  const match = /^([a-f0-9]{64})  ([A-Za-z0-9._-]+)$/.exec(line);
  if (!match) throw new Error('Invalid checksum entry');
  const actual = crypto.createHash('sha256').update(fs.readFileSync(`${dir}/${match[2]}`)).digest('hex');
  if (actual !== match[1]) throw new Error(`Checksum mismatch: ${match[2]}`);
}
const built = provenance(fs.readFileSync(`${dir}/BUILD-PROVENANCE.txt`, 'utf8'));
const metadata = releaseEnvironment();
if (built.source_commit !== process.env.GITHUB_SHA || built.version !== config.version || Number(built.build_number) !== config.buildNumber || built.release_input_sha256 !== metadata.GLINT_RELEASE_INPUT_SHA256) throw new Error('Artifact does not match this commit and release configuration');
if (JSON.parse(gh(['repo', 'view', repo, '--json', 'isPrivate'])).isPrivate) throw new Error('The owner must make the repository public before publishing downloads');
const tag = `v${config.version}`;
const release = api(`releases/tags/${tag}`);
let existing;
if (release) {
  const previous = release.draft ? {} : remoteProvenance(tag);
  existing = { draft: release.draft, fingerprint: previous.release_input_sha256, buildNumber: Number(previous.build_number) };
}
const last = existing ? null : api('releases/latest');
let latest;
if (last) {
  const previous = remoteProvenance(last.tag_name);
  latest = validateConfig({ version: last.tag_name.replace(/^v/, ''), buildNumber: Number(previous.build_number) });
}
if (publicationDecision({ config, fingerprint: built.release_input_sha256, existing, latest }) === 'skip') {
  console.log(`${tag} already contains these release inputs; keeping its immutable downloads.`);
  process.exit(0);
}
if (!fs.existsSync(`${dir}/LICENSE`) || fs.statSync(`${dir}/LICENSE`).size === 0) throw new Error('Resolve and add the product LICENSE before publication');
if (fs.readFileSync(`${dir}/RELEASE-NOTES.md`, 'utf8').includes("Glint's product license must be settled")) throw new Error('Finalize release notes before publication');
const tagRef = api(`git/ref/tags/${tag}`);
const taggedCommit = tagRef ? api(`commits/${tag}`) : null;
if (taggedCommit && taggedCommit.sha !== process.env.GITHUB_SHA) throw new Error('Existing tag points to another commit; do not move it');
const assets = fs.readdirSync(dir).map(name => `${dir}/${name}`);
// Version tag is an OUTPUT of successful main deployment, never a trigger.
gh(['release', 'create', tag, ...assets, '--repo', repo, '--target', process.env.GITHUB_SHA, '--latest', '--title', `Glint ${config.version}`, '--notes-file', `${dir}/RELEASE-NOTES.md`]);
console.log(`Published ${tag}`);
