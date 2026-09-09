# Local desktop development

Work directly on `main` in the existing checkout. Run:

```sh
npm run dev:desktop
```

This is the supported build/install/reopen command for local testing. Do not run the app from `dist`, replace its files while it is running, or use raw release packaging for everyday iterations.

## Automatic workflow

1. Create or reuse `Glint Local Development`, a free self-signed code-signing identity in the user's default Keychain. No paid Apple account is needed. First setup may display macOS Keychain approval prompts.
2. Reuse its fingerprint from `~/Library/Application Support/Glint/Signing/identity.sha1`. If an existing identity is missing or invalid, stop with recovery instructions instead of changing identity.
3. Build and sign in a temporary staging directory. Validate the signature before touching the installed app.
4. Ask running Glint copies to quit. Abort after 15 seconds if they remain running; do not force-kill or replace the running app.
5. Install at `~/Applications/Glint.app` and reopen that exact copy. Read version/build metadata from `applications/glint-desktop/release.json`.

`npm run dev:desktop:setup` performs only the idempotent signing setup. It is normally unnecessary because the development command calls it automatically. Prerequisites are the repository's Node/npm toolchain, Swift/Xcode command-line tools and OpenSSL on PATH.

The private key is imported as non-exportable, accessible to `/usr/bin/codesign`, and retained in Keychain. Temporary plaintext key files are removed. The certificate is trusted only for code signing in the user domain. No private keys or fingerprints are checked into the repository. Do not delete/recreate the certificate between builds; moving to another Mac requires its own initial setup and grant.

## Accessibility approval and recovery

After the first signed install, grant Accessibility to `~/Applications/Glint.app` in System Settings. macOS owns that approval; the build tooling cannot grant it. Routine rebuilds never reset permissions.

If switching from an older ad-hoc build leaves a stale entry:

1. Quit Glint completely.
2. Run `tccutil reset Accessibility dev.8eecf0d2.glint` to reset only Glint.
3. Open `~/Applications/Glint.app` and grant it Accessibility access. Use the installed app, not a staging or old `dist` copy.
4. Reopen Glint if needed, then confirm the green dot and a window shortcut.
5. Run `npm run dev:desktop` again and verify access remains granted.

Do not reset all applications' permissions, edit the TCC database, disable system protections, or regenerate the certificate as a routine fix. If signing fails, unlock the Keychain or restore the configured identity/trust.

## Why this works and what is verified

The failing ad-hoc builds identified themselves using a changing code hash. TCC logs explicitly reported a mismatch between the saved requirement and the new build. Certificate-based builds instead identify themselves with the stable bundle identifier and certificate fingerprint.

Verified locally on 9 September 2026: two staged install cycles, strict signature checks, package resources, and changed build contents producing a different code hash while retaining the same designated requirement. Actual Accessibility persistence after the user's new grant remains an acceptance check; signing identity stability alone does not prove it.

This local identity is separate from public distribution. CI/release packaging remains ad-hoc by default; there is no Developer ID signing or notarization, and no public release is overwritten by this command.
