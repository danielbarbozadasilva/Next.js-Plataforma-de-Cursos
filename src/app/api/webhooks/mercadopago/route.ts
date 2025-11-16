/**
 * Webhook do Mercado Pago
 *
 * Recebe notificações do Mercado Pago sobre eventos de pagamento
 */

import { NextRequest, NextResponse } from "next/server";
import { handleMercadoPagoNotification } from "@/lib/core/payments/mercadopago";
import crypto from "crypto";

/**
 * POST /api/webhooks/mercadopago
 * Endpoint para receber webhooks do Mercado Pago
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("Received Mercado Pago webhook:", body);

    // Verifica a assinatura do webhook (opcional mas recomendado)
    const xSignature = req.headers.get("x-signature");
    const xRequestId = req.headers.get("x-request-id");

    if (xSignature && xRequestId && process.env.MERCADOPAGO_WEBHOOK_SECRET) {
      // Verifica a assinatura
      const isValid = verifyMercadoPagoSignature(
        xSignature,
        xRequestId,
        body,
        process.env.MERCADOPAGO_WEBHOOK_SECRET
      );

      if (!isValid) {
        console.error("Invalid Mercado Pago webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    // Processa diferentes tipos de notificação
    const { type, action, data } = body;

    // Tipo de notificação: payment
    if (type === "payment" || action === "payment.created" || action === "payment.updated") {
      const paymentId = data?.id || body.id;

      if (!paymentId) {
        console.error("Payment ID not found in webhook");
        return NextResponse.json(
          { error: "Payment ID not found" },
          { status: 400 }
        );
      }

      // Processa a notificação de pagamento
      await handleMercadoPagoNotification(paymentId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing Mercado Pago webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Verifica a assinatura do webhook do Mercado Pago
 * Baseado na documentação: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
function verifyMercadoPagoSignature(
  xSignature: string,
  xRequestId: string,
  body: any,
  secret: string
): boolean {
  try {
    // Extrai os parâmetros da assinatura
    const parts = xSignature.split(",");
    let ts = "";
    let hash = "";

    for (const part of parts) {
      const [key, value] = part.split("=");
      if (key === "ts") ts = value;
      if (key === "v1") hash = value;
    }

    if (!ts || !hash) {
      return false;
    }

    // Cria a string para hash
    const manifest = `id:${body.data?.id};request-id:${xRequestId};ts:${ts};`;

    // Calcula o HMAC
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(manifest);
    const calculatedHash = hmac.digest("hex");

    // Compara os hashes
    return calculatedHash === hash;
  } catch (error) {
    console.error("Error verifying Mercado Pago signature:", error);
    return false;
  }
}
