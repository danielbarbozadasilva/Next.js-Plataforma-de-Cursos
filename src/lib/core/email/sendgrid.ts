/**
 * Serviço de E-mail - SendGrid
 *
 * Envia e-mails transacionais usando SendGrid
 */

import sgMail from "@sendgrid/mail";

// Inicializa SendGrid
const apiKey = process.env.SENDGRID_API_KEY;

if (apiKey) {
  sgMail.setApiKey(apiKey);
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@plataforma.com";
const FROM_NAME = process.env.SENDGRID_FROM_NAME || "Plataforma EAD";

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
    content: string; // Base64
    filename: string;
    type?: string;
    disposition?: "attachment" | "inline";
  }>;
}

/**
 * Envia um e-mail usando SendGrid
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  if (!apiKey) {
    console.warn("SendGrid API key not configured. Email not sent.");
    return;
  }

  try {
    const msg = {
      to: params.to,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      subject: params.subject,
      html: params.html,
      text: params.text || params.html.replace(/<[^>]*>/g, ""), // Remove HTML tags
      ...(params.cc && { cc: params.cc }),
      ...(params.bcc && { bcc: params.bcc }),
      ...(params.replyTo && { replyTo: params.replyTo }),
      ...(params.attachments && { attachments: params.attachments }),
    };

    await sgMail.send(msg);

    console.log(`✅ Email sent to ${params.to}`);
  } catch (error: any) {
    console.error("Error sending email with SendGrid:", error);

    if (error.response) {
      console.error("SendGrid error response:", error.response.body);
    }

    throw new Error("Failed to send email");
  }
}

/**
 * Envia múltiplos e-mails (batch)
 */
export async function sendBulkEmail(
  emails: SendEmailParams[]
): Promise<void> {
  if (!apiKey) {
    console.warn("SendGrid API key not configured. Emails not sent.");
    return;
  }

  try {
    const messages = emails.map((params) => ({
      to: params.to,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      subject: params.subject,
      html: params.html,
      text: params.text || params.html.replace(/<[^>]*>/g, ""),
      ...(params.cc && { cc: params.cc }),
      ...(params.bcc && { bcc: params.bcc }),
      ...(params.replyTo && { replyTo: params.replyTo }),
    }));

    await sgMail.send(messages);

    console.log(`✅ Bulk email sent to ${emails.length} recipients`);
  } catch (error: any) {
    console.error("Error sending bulk email with SendGrid:", error);

    if (error.response) {
      console.error("SendGrid error response:", error.response.body);
    }

    throw new Error("Failed to send bulk email");
  }
}

/**
 * Envia e-mail usando template do SendGrid
 */
export async function sendTemplateEmail(
  to: string | string[],
  templateId: string,
  dynamicData: Record<string, any>
): Promise<void> {
  if (!apiKey) {
    console.warn("SendGrid API key not configured. Email not sent.");
    return;
  }

  try {
    const msg = {
      to,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      templateId,
      dynamicTemplateData: dynamicData,
    };

    await sgMail.send(msg);

    console.log(`✅ Template email sent to ${to}`);
  } catch (error: any) {
    console.error("Error sending template email with SendGrid:", error);

    if (error.response) {
      console.error("SendGrid error response:", error.response.body);
    }

    throw new Error("Failed to send template email");
  }
}
