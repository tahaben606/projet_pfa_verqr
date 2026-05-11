import PDFDocument from 'pdfkit';
import { env } from '../config/env.js';

/**
 * @param {object} opts
 * @param {Buffer} opts.qrPng
 * @param {string} opts.uniqueIdentifier
 * @param {string} opts.typeName
 * @param {string} opts.issueDateIso
 * @param {string} [opts.certificateBodyFr] - main French certificate text
 * @param {Record<string, string>} [opts.safeFields] - optional extra key/value lines
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
    doc.fontSize(14).text('Attestation', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(10).text(`Identifiant document : ${opts.uniqueIdentifier}`);
    doc.text(`Type : ${opts.typeName}`);
    doc.text(`Date d'émission : ${opts.issueDateIso}`);
    doc.moveDown();

    if (opts.certificateBodyFr) {
      doc.fontSize(11).text(opts.certificateBodyFr, { width: 500, align: 'left' });
      doc.moveDown();
    }

    doc.fontSize(9).text('Document émis via le système de gestion des attestations.', {
      width: 500,
    });
    doc.moveDown();

    if (opts.safeFields && Object.keys(opts.safeFields).length) {
      doc.fontSize(10).text('Références :', { underline: true });
      doc.moveDown(0.3);
      for (const [k, v] of Object.entries(opts.safeFields)) {
        if (v != null && String(v).length) doc.fontSize(9).text(`${k} : ${v}`);
      }
      doc.moveDown();
    }

    const qrTop = Math.min(doc.y + 20, doc.page.height - 320);
    doc.image(opts.qrPng, doc.page.width / 2 - 80, qrTop, { width: 160, height: 160 });
    doc.y = qrTop + 180;
    doc.fontSize(9).text("Scannez le code QR pour vérifier l'authenticité en ligne.", { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(10).text('Signature autorisée : ___________________________', { align: 'left' });

    doc.end();
  });
}
