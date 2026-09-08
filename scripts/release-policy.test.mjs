import test from 'node:test';
import assert from 'node:assert/strict';
import { publicationDecision, validateConfig } from './release-metadata.mjs';
const config = { version: '1.2.3', buildNumber: 10 };
test('stable versions and explicit build numbers are required', () => {
  for (const version of ['../bad', '1.2.3-beta', '01.2.3', '1.2']) assert.throws(() => validateConfig({ ...config, version }));
  assert.throws(() => validateConfig({ ...config, buildNumber: 0 }));
  assert.throws(() => publicationDecision({ config: { ...config, version: '0.0.0' } }));
});
test('retries and full runs never replace published downloads', () => {
  assert.equal(publicationDecision({ config, fingerprint: 'same', existing: { fingerprint: 'same', buildNumber: 10, draft: false } }), 'skip');
  for (const existing of [{ fingerprint: 'other', buildNumber: 10 }, { fingerprint: 'same', buildNumber: 9 }, { fingerprint: 'same', buildNumber: 10, draft: true }]) assert.throws(() => publicationDecision({ config, fingerprint: 'same', existing }));
});
test('a new release must increase both version and bundle build number', () => {
  assert.equal(publicationDecision({ config, latest: { version: '1.2.2', buildNumber: 9 } }), 'publish');
  for (const latest of [{ version: '1.2.4', buildNumber: 9 }, { version: '1.2.3', buildNumber: 9 }, { version: '1.2.2', buildNumber: 10 }]) assert.throws(() => publicationDecision({ config, latest }));
});
