import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function validateConfig(config) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(config.version)) throw new Error('Release version must be stable X.Y.Z');
  if (!Number.isSafeInteger(config.buildNumber) || config.buildNumber < 1) throw new Error('buildNumber must be a positive integer');
  return config;
}
export function compareVersions(a, b) {
  const left = a.split('.').map(Number), right = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return Math.sign(left[i] - right[i]);
  return 0;
}
export function publicationDecision({ config, fingerprint, existing, latest }) {
  validateConfig(config);
  if (config.version === '0.0.0') throw new Error('Choose the first release version explicitly; 0.0.0 is rehearsal-only');
  if (existing) {
    if (!existing.draft && existing.fingerprint === fingerprint && existing.buildNumber === config.buildNumber) return 'skip';
    throw new Error('Version already exists with different inputs or an incomplete draft. Bump the version; never overwrite downloads.');
  }
  if (latest && (compareVersions(config.version, latest.version) <= 0 || config.buildNumber <= latest.buildNumber)) {
    throw new Error('Both version and buildNumber must increase beyond the latest published release');
  }
  return 'publish';
}
export function releaseFingerprint() {
  const files = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean))];
  const exact = new Set(['package.json', 'package-lock.json', 'nx.json', '.nvmrc', 'tsconfig.base.json', 'THIRD_PARTY_NOTICES.md', 'LICENSE', 'docs/install.md', 'docs/release-notes.md']);
  const prefixes = ['applications/glint-desktop/', 'libraries/glint-core/', 'brand/', 'scripts/', 'distribution/', '.github/'];
  const hash = crypto.createHash('sha256');
  for (const file of files.filter(f => exact.has(f) || prefixes.some(p => f.startsWith(p))).sort()) {
    if (!fs.existsSync(file)) continue;
    hash.update(file + '\0').update(fs.readFileSync(file)).update('\0');
  }
  return hash.digest('hex');
}
export function releaseEnvironment() {
  const config = validateConfig(JSON.parse(fs.readFileSync('applications/glint-desktop/release.json', 'utf8')));
  const repository = process.env.GITHUB_REPOSITORY || '8eecf0d2/glint';
  return {
    GLINT_VERSION: config.version,
    GLINT_BUILD_NUMBER: String(config.buildNumber),
    GLINT_ARCHS: 'arm64',
    GLINT_DOWNLOAD_BASE_URL: `https://github.com/${repository}/releases/download/v${config.version}`,
    GLINT_UPDATE_FEED_URL: `https://github.com/${repository}/releases/latest/download/latest.json`,
    GLINT_RELEASE_INPUT_SHA256: releaseFingerprint(),
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const env = releaseEnvironment();
  if (process.argv.includes('--fingerprint')) console.log(env.GLINT_RELEASE_INPUT_SHA256);
  else for (const [key, value] of Object.entries(env)) console.log(`${key}=${value}`);
}
