/**
 * Serviço de E-mail Unificado
 *
 * Suporta SendGrid e Resend
 * Use este arquivo para enviar e-mails na aplicação
 */

import * as sendgridService from "./sendgrid";
import * as resendService from "./resend";

// Define qual provider usar baseado nas variáveis de ambiente
const EMAIL_PROVIDER = process.env.SENDGRID_API_KEY ? "sendgrid" : "resend";

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

/**
 * Envia um e-mail usando o provider configurado
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  if (EMAIL_PROVIDER === "sendgrid") {
    return await sendgridService.sendEmail(params);
  } else {
    return await resendService.sendEmail(params);
  }
}

/**
 * Envia múltiplos e-mails
 */
export async function sendBulkEmail(emails: SendEmailParams[]): Promise<void> {
  if (EMAIL_PROVIDER === "sendgrid") {
    return await sendgridService.sendBulkEmail(emails);
  } else {
    return await resendService.sendBulkEmail(emails);
  }
}

/**
 * Templates de e-mail HTML
 */

/**
 * Template base para e-mails
 */
function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plataforma EAD</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background-color: #4F46E5;
      color: #ffffff;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 30px 20px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #4F46E5;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
    }
    .footer {
      background-color: #f9f9f9;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Plataforma EAD</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Plataforma EAD. Todos os direitos reservados.</p>
      <p>Este é um e-mail automático, por favor não responda.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * E-mail de boas-vindas
 */
export async function sendWelcomeEmail(
  to: string,
  userName: string
): Promise<void> {
  const content = `
    <h2>Bem-vindo(a), ${userName}! 🎉</h2>
    <p>Estamos muito felizes em ter você na nossa plataforma de cursos online!</p>
    <p>Aqui você encontrará cursos de alta qualidade para aprimorar suas habilidades.</p>
    <a href="${process.env.APP_URL}/courses" class="button">Explorar Cursos</a>
    <p>Se tiver alguma dúvida, nossa equipe de suporte está sempre disponível para ajudar.</p>
  `;

  return await sendEmail({
    to,
    subject: "Bem-vindo(a) à Plataforma EAD!",
    html: baseTemplate(content),
  });
}

/**
 * E-mail de confirmação de compra
 */
export async function sendPurchaseConfirmation(
  to: string,
  userName: string,
  courseTitles: string[],
  totalAmount: number
): Promise<void> {
  const coursesList = courseTitles.map((title) => `<li>${title}</li>`).join("");

  const content = `
    <h2>Compra Confirmada! 🎓</h2>
    <p>Olá ${userName},</p>
    <p>Sua compra foi confirmada com sucesso!</p>
    <h3>Cursos Adquiridos:</h3>
    <ul>
      ${coursesList}
    </ul>
    <p><strong>Total:</strong> R$ ${totalAmount.toFixed(2)}</p>
    <a href="${process.env.APP_URL}/student/dashboard" class="button">Acessar Meus Cursos</a>
    <p>Bons estudos!</p>
  `;

  return await sendEmail({
    to,
    subject: "Confirmação de Compra - Plataforma EAD",
    html: baseTemplate(content),
  });
}

/**
 * E-mail de certificado emitido
 */
export async function sendCertificateEmail(
  to: string,
  userName: string,
  courseTitle: string,
  certificateId: string
): Promise<void> {
  const content = `
    <h2>Parabéns! 🏆</h2>
    <p>Olá ${userName},</p>
    <p>Você completou com sucesso o curso <strong>${courseTitle}</strong>!</p>
    <p>Seu certificado está pronto e pode ser acessado a qualquer momento.</p>
    <a href="${process.env.APP_URL}/certificates/${certificateId}" class="button">Ver Certificado</a>
    <p>Continue aprendendo e conquistando novos objetivos!</p>
  `;

  return await sendEmail({
    to,
    subject: `Certificado de Conclusão - ${courseTitle}`,
    html: baseTemplate(content),
  });
}

/**
 * E-mail de novo anúncio do instrutor
 */
export async function sendAnnouncementEmail(
  to: string,
  userName: string,
  courseTitle: string,
  announcementTitle: string,
  announcementContent: string
): Promise<void> {
  const content = `
    <h2>Novo Anúncio: ${announcementTitle}</h2>
    <p>Olá ${userName},</p>
    <p>O instrutor do curso <strong>${courseTitle}</strong> publicou um novo anúncio:</p>
    <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #4F46E5; margin: 20px 0;">
      ${announcementContent}
    </div>
    <a href="${process.env.APP_URL}/courses" class="button">Acessar Curso</a>
  `;

  return await sendEmail({
    to,
    subject: `Novo Anúncio: ${announcementTitle}`,
    html: baseTemplate(content),
  });
}

/**
 * E-mail de recuperação de senha
 */
export async function sendPasswordResetEmail(
  to: string,
  resetToken: string
): Promise<void> {
  const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;

  const content = `
    <h2>Recuperação de Senha</h2>
    <p>Recebemos uma solicitação para redefinir sua senha.</p>
    <p>Clique no botão abaixo para criar uma nova senha:</p>
    <a href="${resetUrl}" class="button">Redefinir Senha</a>
    <p>Este link é válido por 1 hora.</p>
    <p>Se você não solicitou esta alteração, ignore este e-mail.</p>
  `;

  return await sendEmail({
    to,
    subject: "Recuperação de Senha - Plataforma EAD",
    html: baseTemplate(content),
  });
}

/**
 * E-mail de notificação ao instrutor sobre nova venda
 */
export async function sendInstructorSaleNotification(
  to: string,
  instructorName: string,
  courseTitle: string,
  amount: number
): Promise<void> {
  const content = `
    <h2>Nova Venda! 💰</h2>
    <p>Olá ${instructorName},</p>
    <p>Parabéns! Você acabou de fazer uma nova venda:</p>
    <p><strong>Curso:</strong> ${courseTitle}</p>
    <p><strong>Valor:</strong> R$ ${amount.toFixed(2)}</p>
    <a href="${process.env.APP_URL}/instructor/analytics/finances" class="button">Ver Relatório Financeiro</a>
    <p>Continue criando conteúdo de qualidade!</p>
  `;

  return await sendEmail({
    to,
    subject: "Nova Venda Realizada!",
    html: baseTemplate(content),
  });
}
