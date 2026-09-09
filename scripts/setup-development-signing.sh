#!/usr/bin/env bash
set -euo pipefail
umask 077
signing_dir="$HOME/Library/Application Support/Glint/Signing"
identity_file="$signing_dir/identity.sha1"
mkdir -p "$signing_dir"
identities="$(security find-identity -v -p codesigning)"
if [ -f "$identity_file" ]; then
  identity="$(cat "$identity_file")"
  if [[ "$identity" =~ ^[[:xdigit:]]{40}$ ]] && [[ "$identities" == *"$identity"* ]]; then
    echo "Using existing Glint development signing identity."
    exit 0
  fi
  echo "Configured Glint identity is unavailable. Unlock/restore its login Keychain; do not regenerate it for a routine rebuild." >&2
  exit 1
fi
# Recover a previously configured identity without rotating its key.
identity="$(printf '%s\n' "$identities" | sed -nE 's/.* ([[:xdigit:]]{40}) "Glint Local Development"$/\1/p')"
if [ -n "$identity" ]; then
  if [ "$(printf '%s\n' "$identity" | wc -l | tr -d ' ')" != 1 ]; then
    echo "Multiple Glint identities found; select the existing fingerprint in $identity_file." >&2
    exit 1
  fi
  printf '%s\n' "$identity" > "$identity_file"
  echo "Recovered existing Glint development signing identity."
  exit 0
fi
if [ -f "$signing_dir/certificate.pem" ]; then
  echo "An existing Glint certificate has no valid signing identity. Restore its private key/trust in Keychain instead of replacing it." >&2
  exit 1
fi
keychain="$(security default-keychain -d user | sed 's/^[[:space:]]*"//;s/"$//')"
temporary="$(mktemp -d "$signing_dir/setup.XXXXXX")"
trap 'rm -rf "$temporary"' EXIT
cat > "$temporary/openssl.cnf" <<'CONFIG'
[req]
distinguished_name=dn
x509_extensions=extensions
prompt=no
[dn]
CN=Glint Local Development
[extensions]
basicConstraints=critical,CA:false
keyUsage=critical,digitalSignature
extendedKeyUsage=critical,codeSigning
subjectKeyIdentifier=hash
CONFIG
openssl req -x509 -newkey rsa:3072 -nodes -days 3650 -config "$temporary/openssl.cnf" -keyout "$temporary/key.pem" -out "$temporary/certificate.pem" 2>/dev/null
# Keychain's PEM importer needs traditional RSA format, not PKCS#8.
if ! openssl rsa -in "$temporary/key.pem" -traditional -out "$temporary/import.pem" 2>/dev/null; then
  openssl rsa -in "$temporary/key.pem" -out "$temporary/import.pem" 2>/dev/null
fi
security import "$temporary/import.pem" -k "$keychain" -t priv -f openssl -x -T /usr/bin/codesign
security import "$temporary/certificate.pem" -k "$keychain" -t cert -f openssl
cp "$temporary/certificate.pem" "$signing_dir/certificate.pem"
echo "Setting user-only code-signing trust. macOS may ask for Keychain approval."
security add-trusted-cert -r trustRoot -p codeSign -k "$keychain" "$signing_dir/certificate.pem"
identity="$(openssl x509 -in "$signing_dir/certificate.pem" -noout -fingerprint -sha1 | cut -d= -f2 | tr -d ':')"
identities="$(security find-identity -v -p codesigning)"
[[ "$identities" == *"$identity"* ]] || { echo "Identity is not yet valid; check Keychain code-signing trust." >&2; exit 1; }
printf '%s\n' "$identity" > "$identity_file"
echo "Created persistent local signing identity; no Apple membership required."
