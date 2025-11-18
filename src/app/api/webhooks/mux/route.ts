/**
 * Webhook do Mux
 *
 * Recebe notificações do Mux sobre eventos de processamento de vídeo
 */

import { NextRequest, NextResponse } from "next/server";
import { handleMuxWebhook } from "@/lib/core/video/mux";
import Mux from "@mux/mux-node";

/**
 * POST /api/webhooks/mux
 * Endpoint para receber webhooks do Mux
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("mux-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing mux-signature header" },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.MUX_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("MUX_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    // Verifica a assinatura do webhook
    let event;

    try {
      // @ts-ignore - API Mux precisa ser atualizada
      event = Mux.Webhooks.verifyHeader(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Processa o evento
    console.log(`Received Mux event: ${event.type}`);

    await handleMuxWebhook(event.type, event.data);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing Mux webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
