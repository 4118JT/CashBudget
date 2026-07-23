import crypto from 'crypto';

type KeyRecord = {
  version: string;
  key: Buffer;
};

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;

function parseKeys(): { current: KeyRecord; all: Map<string, Buffer> } {
  const raw = process.env.PLAID_TOKEN_ENCRYPTION_KEYS;
  if (!raw) throw new Error('Missing PLAID_TOKEN_ENCRYPTION_KEYS');

  const map = new Map<string, Buffer>();
  for (const segment of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
    const [version, keyB64] = segment.split(':');
    if (!version || !keyB64) continue;
    const key = Buffer.from(keyB64, 'base64');
    if (key.length !== 32) throw new Error(`Encryption key ${version} must decode to 32 bytes`);
    map.set(version, key);
  }

  const currentVersion = process.env.PLAID_TOKEN_ENCRYPTION_CURRENT_VERSION;
  if (!currentVersion) throw new Error('Missing PLAID_TOKEN_ENCRYPTION_CURRENT_VERSION');
  const current = map.get(currentVersion);
  if (!current) throw new Error('Current encryption version is not present in PLAID_TOKEN_ENCRYPTION_KEYS');
  return { current: { version: currentVersion, key: current }, all: map };
}

export function encryptToken(plaintext: string) {
  const { current } = parseKeys();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, current.key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    keyVersion: current.version,
  };
}

export function decryptToken(input: {
  ciphertext: string;
  iv: string;
  tag: string;
  keyVersion: string;
}) {
  const { all, current } = parseKeys();
  const key = all.get(input.keyVersion);
  if (!key) throw new Error(`Unknown encryption key version ${input.keyVersion}`);
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(input.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(input.tag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(input.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
  return { plaintext, requiresRotation: input.keyVersion !== current.version, currentVersion: current.version };
}
