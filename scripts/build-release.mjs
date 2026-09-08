import { execFileSync } from 'node:child_process';
import { releaseEnvironment } from './release-metadata.mjs';
execFileSync('bash', ['scripts/package-release.sh'], { stdio: 'inherit', env: { ...process.env, ...releaseEnvironment() } });
