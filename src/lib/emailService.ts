import nodemailer from 'nodemailer';

// Helper to clean quotes and whitespace from user-provided environment vars
function cleanEnvVar(val: string | undefined, fallback: string): string {
  if (!val) return fallback;
  let clean = val.trim();
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1).trim();
  }
  // Auto-correct common typos for smtp
  if (clean.toLowerCase().startsWith('smpt.')) {
    clean = 'smtp.' + clean.slice(5);
  } else if (clean.toLowerCase() === 'smpt.hostinger.com') {
    clean = 'smtp.hostinger.com';
  }
  return clean;
}

const SMTP_HOST = cleanEnvVar(process.env.SMTP_HOST, 'smtp.hostinger.com');
const SMTP_PORT = parseInt(cleanEnvVar(process.env.SMTP_PORT, '465'));
const SMTP_USER = cleanEnvVar(process.env.SMTP_USER, 'training@mushroomtraining.online');
const SMTP_PASS = cleanEnvVar(process.env.SMTP_PASS, 'Sonib491@');
const SMTP_FROM_NAME = cleanEnvVar(process.env.SMTP_FROM_NAME, 'Organic Mushroom Farm');
const SMTP_SUPPORT_EMAIL = cleanEnvVar(process.env.SMTP_SUPPORT_EMAIL, 'support@mushroomtraining.online');
const SMTP_SUPPORT_PHONE = cleanEnvVar(process.env.SMTP_SUPPORT_PHONE, '9203544140');

// Lazy-initialized node transporter
let transporter: any = null;

function getTransporter() {
  if (!transporter) {
    const finalHost = cleanEnvVar(process.env.SMTP_HOST, 'smtp.hostinger.com');
    const finalPort = parseInt(cleanEnvVar(process.env.SMTP_PORT, '465'));
    const finalUser = cleanEnvVar(process.env.SMTP_USER, 'training@mushroomtraining.online');
    const finalPass = cleanEnvVar(process.env.SMTP_PASS, 'Sonib491@');

    console.log(`[SMTP CONFIG DIAGNOSTICS]`);
    console.log(`- SMTP_HOST: "${finalHost}"`);
    console.log(`- SMTP_PORT: ${finalPort}`);
    console.log(`- SMTP_USER: "${finalUser}"`);
    console.log(`- SMTP_PASS length: ${finalPass ? finalPass.length : 0}`);
    console.log(`- SMTP_PASS starts with: "${finalPass ? finalPass[0] : ''}" and ends with: "${finalPass ? finalPass[finalPass.length - 1] : ''}"`);
    
    transporter = nodemailer.createTransport({
      host: finalHost,
      port: finalPort,
      secure: finalPort === 465, // True for 465, false for 587
      auth: {
        user: finalUser,
        pass: finalPass,
      },
      tls: {
        rejectUnauthorized: false // Helps prevent SSL certificate match failures on sandboxes
      }
    });
  }
  return transporter;
}

/**
 * Sends a highly styled HTML email confirmation upon successful registration.
 * Fully compliant with the no-forbidden-words directive (No 'training', 'student', or 'webinar').
 */
export async function sendRegistrationEmail(
  toEmail: string,
  attendeeName: string,
  accessId: string,
  accessPass: string,
  joinToken: string,
  appUrlFromRequest?: string
): Promise<boolean> {
  const appBaseUrl = appUrlFromRequest || process.env.APP_URL || 'https://mushroomtraining.online';
  // Standardize trailing slash removal
  const normalizedBaseUrl = appBaseUrl.endsWith('/') ? appBaseUrl.slice(0, -1) : appBaseUrl;
  const joinUrl = `${normalizedBaseUrl}/live/${joinToken}`;

  const subject = `Your Live Broadcast Access Code & Credentials - Organic Mushroom Farm`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Access Credentials</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #0d0b18;
          color: #f1f3f9;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #121020;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }
        .header {
          padding: 32px;
          background: linear-gradient(135deg, #1f1b3e 0%, #110e24 100%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          text-align: center;
        }
        .logo-img {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          object-cover: cover;
          margin-bottom: 12px;
        }
        .header h1 {
          font-size: 20px;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .content {
          padding: 32px;
        }
        .content p {
          font-size: 14px;
          line-height: 1.6;
          color: #b8bac7;
          margin: 0 0 20px 0;
        }
        .credentials-card {
          background-color: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(99, 102, 241, 0.15);
          border-radius: 16px;
          padding: 24px;
          margin: 24px 0;
        }
        .credential-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .credential-row:last-child {
          border-bottom: none;
        }
        .credential-label {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .credential-value {
          font-size: 14px;
          font-weight: 700;
          color: #ffffff;
        }
        .credential-code {
          font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
          color: #c084fc;
          font-size: 14px;
          letter-spacing: 0.5px;
        }
        .credential-link-block {
          background-color: rgba(0, 0, 0, 0.4);
          border-radius: 10px;
          padding: 10px;
          font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
          font-size: 11px;
          color: #a8b8d0;
          word-break: break-all;
          margin-top: 8px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .btn {
          display: block;
          text-align: center;
          background: linear-gradient(90deg, #6366f1 0%, #a855f7 100%);
          color: #ffffff;
          text-decoration: none;
          font-weight: 700;
          font-size: 14px;
          padding: 16px 24px;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
          margin: 24px 0;
        }
        .btn:hover {
          background: linear-gradient(90deg, #4f46e5 0%, #9333ea 100%);
        }
        .steps {
          margin: 24px 0;
          padding: 0 0 0 20px;
        }
        .steps li {
          font-size: 13.5px;
          line-height: 1.6;
          color: #b8bac7;
          margin-bottom: 12px;
        }
        .helpdesk {
          margin-top: 32px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 24px;
        }
        .helpdesk h3 {
          font-size: 12px;
          font-weight: 800;
          color: #a8b8d0;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 0 0 12px 0;
        }
        .helpdesk-info {
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.5;
        }
        .helpdesk-info a {
          color: #818cf8;
          text-decoration: none;
          font-weight: 600;
        }
        .footer {
          padding: 24px 32px;
          text-align: center;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.25);
          background-color: #0b0914;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <img src="https://res.cloudinary.com/dtpktdkqw/image/upload/v1779785300/d91bc495-04ad-4214-ad23-5abdd9bf370d_gzmzqt.jpg" alt="Mushroom Logo" class="logo-img" />
          <h1>Organic Mushroom Farm</h1>
        </div>

        <!-- Content -->
        <div class="content">
          <p>Hello <strong>${attendeeName}</strong>,</p>
          <p>Thank you for securing your entry. Your registration has been processed successfully!</p>
          <p>Below are your credentials and direct access details to join our upcoming live broadcast session. Please keep this information safe and do not share it with anyone else.</p>

          <!-- Credentials Card -->
          <div class="credentials-card">
            <div class="credential-row">
              <span class="credential-label">Name</span>
              <span class="credential-value">${attendeeName}</span>
            </div>
            <div class="credential-row">
              <span class="credential-label">Access ID</span>
              <span class="credential-code">${accessId}</span>
            </div>
            <div class="credential-row">
              <span class="credential-label">Verification Password</span>
              <span class="credential-code">${accessPass}</span>
            </div>
            <div class="credential-row" style="display: block; border-bottom: none; padding-top: 12px;">
              <span class="credential-label" style="display: block; margin-bottom: 6px;">Your Access Link</span>
              <div class="credential-link-block">${joinUrl}</div>
            </div>
          </div>

          <!-- Join Button -->
          <a href="${joinUrl}" class="btn">Click Here to Enter the Session</a>

          <!-- Steps to Join -->
          <h3 style="font-size: 14px; color: #ffffff; margin-top: 28px; font-weight: 700;">Steps to Join:</h3>
          <ul class="steps">
            <li>Click the access button above or open your unique Access Link in your browser.</li>
            <li>On the "Secure Attendee Login" screen, enter your Access ID and Verification Password.</li>
            <li>Tap "Verify & Join Session" to immediately access the live broadcast room and chat feed.</li>
          </ul>

          <h3 style="font-size: 14px; color: #ffffff; margin-top: 24px; font-weight: 700;">Session Guidelines:</h3>
          <ul class="steps">
            <li><strong>Single Device Security:</strong> For your account security, single-device binding is enabled. The very first device you use to login will be bound to your Access ID. Secondary devices will be blocked.</li>
            <li><strong>Interactive Q&amp;A:</strong> You can submit clear, relevant questions in the live chat during active presentation timings, and our host team will respond live.</li>
          </ul>

          <!-- Help Desk Support -->
          <div class="helpdesk">
            <h3>Support &amp; Help Desk</h3>
            <div class="helpdesk-info">
              If you face any issues entering the session room, contact our helper desk team immediately:<br>
              📧 Email Support: <a href="mailto:${SMTP_SUPPORT_EMAIL}">${SMTP_SUPPORT_EMAIL}</a><br>
              💬 WhatsApp Line: <a href="https://wa.me/91${SMTP_SUPPORT_PHONE}">+91 ${SMTP_SUPPORT_PHONE}</a>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          &copy; ${new Date().getFullYear()} Organic Mushroom Farm. All rights reserved.<br>
          For security reasons, do not forward this message.
        </div>
      </div>
    </body>
    </html>
  `.trim();

  try {
    const mailOptions = {
      from: `"${SMTP_FROM_NAME}" <${SMTP_USER}>`,
      to: toEmail,
      subject: subject,
      html: htmlContent
    };

    console.log(`Sending automated confirmation email to: "${toEmail}" via Hostinger SMTP...`);
    const info = await getTransporter().sendMail(mailOptions);
    console.log(`Email successfully dispatched directly to ${toEmail}. MessageID: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error(`CRITICAL: Node automated email dispatch failed for ${toEmail}:`, err);
    return false;
  }
}
