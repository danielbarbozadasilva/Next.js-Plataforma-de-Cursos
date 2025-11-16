/**
 * Webhook do PayPal
 *
 * Recebe notificações do PayPal sobre eventos de pagamento
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { OrderStatus } from "@prisma/client";

/**
 * POST /api/webhooks/paypal
 * Endpoint para receber webhooks do PayPal
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("Received PayPal webhook:", body.event_type);

    // Verifica a assinatura do webhook (recomendado em produção)
    // TODO: Implementar verificação de assinatura usando PayPal SDK

    const eventType = body.event_type;

    switch (eventType) {
      case "CHECKOUT.ORDER.APPROVED": {
        // Pedido aprovado - usuário completou o checkout
        const orderId = body.resource.id;
        console.log(`PayPal order approved: ${orderId}`);
        // A captura será feita quando o usuário retornar ao site
        break;
      }

      case "PAYMENT.CAPTURE.COMPLETED": {
        // Pagamento capturado com sucesso
        const captureId = body.resource.id;
        const orderId = body.resource.supplementary_data?.related_ids?.order_id;

        console.log(`PayPal payment captured: ${captureId} for order ${orderId}`);

        // Busca e atualiza o pedido
        if (orderId) {
          const order = await db.order.findFirst({
            where: { gatewayTransactionId: orderId },
          });

          if (order && order.status !== OrderStatus.COMPLETED) {
            await db.order.update({
              where: { id: order.id },
              data: { status: OrderStatus.COMPLETED },
            });
          }
        }
        break;
      }

      case "PAYMENT.CAPTURE.DENIED":
      case "PAYMENT.CAPTURE.DECLINED": {
        // Pagamento negado/recusado
        const orderId = body.resource.supplementary_data?.related_ids?.order_id;

        if (orderId) {
          const order = await db.order.findFirst({
            where: { gatewayTransactionId: orderId },
          });

          if (order) {
            await db.order.update({
              where: { id: order.id },
              data: { status: OrderStatus.FAILED },
            });
          }
        }
        break;
      }

      case "PAYMENT.CAPTURE.REFUNDED": {
        // Reembolso processado
        const refundId = body.resource.id;
        console.log(`PayPal refund processed: ${refundId}`);
        // TODO: Processar reembolso (remover matrícula, atualizar saldo)
        break;
      }

      default:
        console.log(`Unhandled PayPal event type: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing PayPal webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/paypal/success
 * Callback de sucesso do PayPal
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const token = searchParams.get("token"); // PayPal Order ID

  if (!token) {
    return NextResponse.redirect(`${process.env.APP_URL}/checkout/error`);
  }

  // Redireciona para a página de sucesso
  return NextResponse.redirect(
    `${process.env.APP_URL}/checkout/success?paypal_token=${token}`
  );
}
