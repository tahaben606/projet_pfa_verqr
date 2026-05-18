import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendApprovalEmail(to, beneficiaryName, typeName) {
  if (!process.env.SMTP_HOST && !process.env.SMTP_USER) {
    console.warn('SMTP configuration is missing. Skipping email notification.');
    return;
  }

  const appUrl = process.env.PUBLIC_APP_URL || 'http://localhost:5173';
  const dashboardLink = `${appUrl}/requests`;

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'VerQR Team'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: to,
      subject: `Your ${typeName} has been approved!`,
      text: `Hello ${beneficiaryName},\n\nYour request for the ${typeName} has been approved and your PDF has been generated successfully.\n\nYou can view and download it from your dashboard:\n${dashboardLink}\n\nBest regards,\nThe VerQR Team`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4f46e5;">Attestation Approved</h2>
          <p>Hello <strong>${beneficiaryName}</strong>,</p>
          <p>We are pleased to inform you that your request for the <strong>${typeName}</strong> has been approved and the document is ready.</p>
          <p>You can view and download your document directly from your dashboard:</p>
          <p>
            <a href="${dashboardLink}" style="display: inline-block; padding: 10px 20px; color: #fff; background-color: #4f46e5; text-decoration: none; border-radius: 5px;">
              Access Dashboard
            </a>
          </p>
          <br />
          <p>Best regards,<br/>The VerQR Team</p>
        </div>
      `
    });

    console.log('Approval email sent: %s', info.messageId);
    if (info.messageId && process.env.SMTP_HOST?.includes('ethereal')) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error('Error sending approval email:', error);
  }
}
