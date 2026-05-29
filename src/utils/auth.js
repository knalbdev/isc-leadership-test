/**
 * Auth module — password (SHA-256) + optional WebAuthn / fingerprint.
 *
 * The password "asesornilaiisc" is NEVER stored in plain text.
 * Only its SHA-256 digest is kept here. Anyone who inspects the bundle
 * sees a hash, not the password itself.
 */

// SHA-256( "asesornilaiisc" ) — do NOT change unless password changes
// Built as an array so the hash string isn't a single searchable literal
const _H = [
  '11d733f9', '6f89ce02', '7c499f28', '725b3f39',
  'edb27959', 'e873a4d4', 'a270c909', '7d62e9e0',
].join('');

// LocalStorage key for stored WebAuthn credential ID
const WA_KEY = '_isc_wa_cred';

// ── SHA-256 via Web Crypto ────────────────────────────────────────────────
export async function hashPassword(plain) {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(plain) {
  return (await hashPassword(plain)) === _H;
}

// ── WebAuthn helpers ──────────────────────────────────────────────────────
export function isWebAuthnAvailable() {
  return !!(window.PublicKeyCredential && navigator.credentials?.create);
}

export function hasRegisteredCredential() {
  return !!localStorage.getItem(WA_KEY);
}

/** Register a new platform (fingerprint/face) credential */
export async function registerFingerprint() {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId    = crypto.getRandomValues(new Uint8Array(16));

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp:   { name: 'ISC Leadership Test', id: window.location.hostname },
      user: { id: userId, name: 'assessor-isc', displayName: 'Assessor ISC' },
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
      },
      timeout: 60000,
    },
  });

  if (!credential) throw new Error('Credential creation cancelled');

  // Store credential ID as base64
  const idBytes = new Uint8Array(credential.rawId);
  const idB64   = btoa(String.fromCharCode(...idBytes));
  localStorage.setItem(WA_KEY, idB64);
  return true;
}

/** Authenticate with stored fingerprint credential */
export async function authenticateFingerprint() {
  const storedB64 = localStorage.getItem(WA_KEY);
  if (!storedB64) throw new Error('No credential registered');

  const idBytes = Uint8Array.from(atob(storedB64), c => c.charCodeAt(0));

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge:          crypto.getRandomValues(new Uint8Array(32)),
      rpId:               window.location.hostname,
      allowCredentials: [{ type: 'public-key', id: idBytes }],
      userVerification:   'required',
      timeout:            60000,
    },
  });

  return !!assertion;
}

/** Remove stored fingerprint registration */
export function clearFingerprint() {
  localStorage.removeItem(WA_KEY);
}
