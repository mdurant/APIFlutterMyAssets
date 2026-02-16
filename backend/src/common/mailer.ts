import nodemailer from 'nodemailer';
import { config } from '../config';

const hasSmtpAuth = !!(config.smtp.user && config.smtp.pass);
if (!hasSmtpAuth) {
  console.warn('[Mailer] SMTP_USER o SMTP_PASS no configurados en .env. Los correos (OTP, verificación, etc.) fallarán.');
}

const transport = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  auth: hasSmtpAuth ? { user: config.smtp.user!, pass: config.smtp.pass! } : undefined,
});

export async function sendMail(options: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}) {
  return transport.sendMail({
    from: config.smtp.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}
