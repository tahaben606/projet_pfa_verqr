import PDFDocument from 'pdfkit';
import { env } from '../config/env.js';

/**
 * @param {object} opts
 * @param {Buffer} opts.qrPng
 * @param {string} opts.uniqueIdentifier
 * @param {string} opts.typeName
 * @param {string} opts.issueDateIso
 * @param {Record<string, string>} opts.safeFields - non-sensitive display lines
 */
export function buildAttestationPdfBuffer(opts) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.on('data', (c) => chunks.push(c));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.fontSize(20).text(env.orgName, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).text('Official Attestation', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(11).text(`Document ID: ${opts.uniqueIdentifier}`);
    doc.text(`Type: ${opts.typeName}`);
    doc.text(`Issue date: ${opts.issueDateIso}`);
    doc.moveDown();

    doc.fontSize(10).text('This attestation was issued through the Smart Attestation Management System.', {
      width: 500,
    });
    doc.moveDown();

    if (opts.safeFields && Object.keys(opts.safeFields).length) {
      doc.fontSize(11).text('Details (non-sensitive):', { underline: true });
      doc.moveDown(0.3);
      for (const [k, v] of Object.entries(opts.safeFields)) {
        if (v) doc.fontSize(10).text(`${k}: ${v}`);
      }
      doc.moveDown();
    }

    const qrTop = Math.min(doc.y + 20, doc.page.height - 320);
    doc.image(opts.qrPng, doc.page.width / 2 - 80, qrTop, { width: 160, height: 160 });
    doc.y = qrTop + 180;
    doc.fontSize(9).text('Scan the QR code to verify authenticity online.', { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(10).text('Authorized signature: ___________________________', { align: 'left' });

    doc.end();
  });
}
