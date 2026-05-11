import { randomBytes } from 'crypto';

export function uniqueAttestationId() {
  const y = new Date().getFullYear();
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `ATT-${y}-${suffix}`;
}
