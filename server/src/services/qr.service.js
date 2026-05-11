import QRCode from 'qrcode';
import { randomBytes } from 'crypto';
import { env } from '../config/env.js';

export function generateQrToken() {
  return randomBytes(24).toString('hex');
}

export function verificationUrl(qrToken) {
  return `${env.publicAppUrl}/verify/${qrToken}`;
}

export async function qrPngBuffer(verifyUrl) {
  return QRCode.toBuffer(verifyUrl, { type: 'png', width: 200, margin: 1 });
}
