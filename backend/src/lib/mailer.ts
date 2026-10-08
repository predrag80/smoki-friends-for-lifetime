import nodemailer, { type Transporter } from "nodemailer";

import { getEnv } from "../config/env.js";

export type MailMessage = { to: string; subject: string; text: string; html: string };
type Logger = { info: (obj: object, msg?: string) => void; error: (obj: object, msg?: string) => void };

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const env = getEnv();
  if (!env.SMTP_HOST) return null;

  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
  });
  return transporter;
}

/**
 * Sends an email. Failures are logged and never thrown, so a mail outage does not break
 * registration; users can request the email again.
 */
export async function sendMail(message: MailMessage, logger: Logger): Promise<boolean> {
  const transport = getTransporter();

  if (!transport) {
    logger.info({ subject: message.subject }, "SMTP_HOST not set; email not sent");
    return false;
  }

  try {
    await transport.sendMail({ from: getEnv().MAIL_FROM, ...message });
    return true;
  } catch (error) {
    logger.error({ err: error, subject: message.subject }, "Email sending failed");
    return false;
  }
}
