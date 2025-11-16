/**
 * Serviço de E-mail - Resend
 *
 * Alternativa ao SendGrid usando Resend (mais moderno e fácil de usar)
 */

import { Resend } from "resend";

// Inicializa Resend
const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@plataforma.com";

/**
 * Interface para envio de e-mail
 */
export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{
    content: Buffer | string;
    filename: string;
  }>;
}

/**
 * Envia um e-mail usando Resend
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  if (!resend) {
    console.warn("Resend API key not configured. Email not sent.");
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
      ...(params.cc && { cc: Array.isArray(params.cc) ? params.cc : [params.cc] }),
      ...(params.bcc && { bcc: Array.isArray(params.bcc) ? params.bcc : [params.bcc] }),
      ...(params.replyTo && { reply_to: params.replyTo }),
      ...(params.attachments && { attachments: params.attachments }),
    });

    console.log(`✅ Email sent to ${params.to}`);
  } catch (error) {
    console.error("Error sending email with Resend:", error);
    throw new Error("Failed to send email");
  }
}

/**
 * Envia múltiplos e-mails (batch)
 */
export async function sendBulkEmail(
  emails: SendEmailParams[]
): Promise<void> {
  if (!resend) {
    console.warn("Resend API key not configured. Emails not sent.");
    return;
  }

  try {
    // Resend não tem batch nativo, então enviamos um por um
    // Em produção, pode-se implementar rate limiting aqui
    await Promise.all(emails.map((email) => sendEmail(email)));

    console.log(`✅ Bulk email sent to ${emails.length} recipients`);
  } catch (error) {
    console.error("Error sending bulk email with Resend:", error);
    throw new Error("Failed to send bulk email");
  }
}
