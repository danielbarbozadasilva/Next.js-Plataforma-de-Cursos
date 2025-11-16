/**
 * Serviço de Pagamento - PayPal
 *
 * Gerencia pagamentos via PayPal com split de comissão
 */

import checkoutNodeJssdk from "@paypal/checkout-server-sdk";
import { db } from "@/lib/db";
import { OrderStatus } from "@prisma/client";

// Configuração do ambiente PayPal
const environment = () => {
  const clientId = process.env.PAYPAL_CLIENT_ID || "";
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || "";

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured");
  }

  // Sandbox ou Live
  if (process.env.PAYPAL_MODE === "live") {
    return new checkoutNodeJssdk.core.LiveEnvironment(clientId, clientSecret);
  }
  return new checkoutNodeJssdk.core.SandboxEnvironment(clientId, clientSecret);
};

// Cliente PayPal
const client = () => {
  return new checkoutNodeJssdk.core.PayPalHttpClient(environment());
};

// Taxa de comissão da plataforma (%)
const PLATFORM_COMMISSION_RATE = parseFloat(
  process.env.PLATFORM_COMMISSION_RATE || "20"
);

/**
 * Interface para item do carrinho
 */
export interface CartItem {
  courseId: string;
  title: string;
  price: number;
  instructorId: string;
}

/**
 * Interface para resposta de checkout
 */
export interface PayPalCheckoutResponse {
  orderId: string;
  approvalUrl: string;
}

/**
 * Cria um pedido PayPal
 */
export async function createPayPalOrder(
  userId: string,
  items: CartItem[]
): Promise<PayPalCheckoutResponse> {
  try {
    // Calcula o total
    const totalAmount = items.reduce((sum, item) => sum + item.price, 0);

    // Cria o pedido no banco de dados
    const dbOrder = await db.order.create({
      data: {
        userId,
        totalAmount,
        status: OrderStatus.PENDING,
        gateway: "paypal",
        items: {
          create: items.map((item) => ({
            courseId: item.courseId,
            priceAtPurchase: item.price,
          })),
        },
      },
    });

    // Prepara os itens para o PayPal
    const paypalItems = items.map((item) => ({
      name: item.title,
      description: `Curso: ${item.title}`,
      unit_amount: {
        currency_code: "BRL",
        value: item.price.toFixed(2),
      },
      quantity: "1",
    }));

    // Cria a requisição de pedido PayPal
    const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      application_context: {
        brand_name: "Plataforma EAD",
        landing_page: "BILLING",
        user_action: "PAY_NOW",
        return_url: `${process.env.APP_URL}/api/webhooks/paypal/success`,
        cancel_url: `${process.env.APP_URL}/checkout/cancel`,
      },
      purchase_units: [
        {
          reference_id: dbOrder.id,
          description: "Compra de cursos",
          amount: {
            currency_code: "BRL",
            value: totalAmount.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: "BRL",
                value: totalAmount.toFixed(2),
              },
            },
          },
          items: paypalItems,
        },
      ],
    });

    // Executa a criação do pedido
    const response = await client().execute(request);
    const paypalOrder = response.result;

    // Salva o ID do PayPal no banco
    await db.order.update({
      where: { id: dbOrder.id },
      data: {
        gatewayTransactionId: paypalOrder.id,
      },
    });

    // Encontra a URL de aprovação
    const approvalUrl =
      paypalOrder.links?.find((link: any) => link.rel === "approve")?.href || "";

    return {
      orderId: paypalOrder.id,
      approvalUrl,
    };
  } catch (error) {
    console.error("Error creating PayPal order:", error);
    throw new Error("Failed to create PayPal order");
  }
}

/**
 * Captura o pagamento após aprovação do usuário
 */
export async function capturePayPalOrder(
  paypalOrderId: string
): Promise<void> {
  try {
    // Captura o pagamento
    const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(
      paypalOrderId
    );
    request.requestBody({});

    const response = await client().execute(request);
    const captureData = response.result;

    // Busca o pedido no banco pelo gatewayTransactionId
    const order = await db.order.findFirst({
      where: { gatewayTransactionId: paypalOrderId },
      include: {
        items: {
          include: {
            course: {
              include: {
                instructor: {
                  include: {
                    instructorProfile: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Verifica se já foi processado
    if (order.status === OrderStatus.COMPLETED) {
      console.log(`Order ${order.id} already processed`);
      return;
    }

    // Atualiza o pedido para COMPLETED
    await db.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.COMPLETED,
      },
    });

    // Processa o split de comissão
    for (const item of order.items) {
      await processPlatformCommission(
        item.course.instructorId,
        item.priceAtPurchase.toNumber()
      );
    }

    // Cria as matrículas
    for (const item of order.items) {
      await db.enrollment.create({
        data: {
          userId: order.userId,
          courseId: item.courseId,
        },
      });
    }

    console.log(`PayPal order ${paypalOrderId} captured successfully`);
  } catch (error) {
    console.error("Error capturing PayPal order:", error);
    throw new Error("Failed to capture PayPal order");
  }
}

/**
 * Processa a comissão da plataforma
 */
async function processPlatformCommission(
  instructorId: string,
  totalAmount: number
): Promise<void> {
  try {
    const platformCommission = totalAmount * (PLATFORM_COMMISSION_RATE / 100);
    const instructorAmount = totalAmount - platformCommission;

    const instructorProfile = await db.instructorProfile.findUnique({
      where: { userId: instructorId },
    });

    if (!instructorProfile) {
      await db.instructorProfile.create({
        data: {
          userId: instructorId,
          balance: instructorAmount,
        },
      });
    } else {
      await db.instructorProfile.update({
        where: { userId: instructorId },
        data: {
          balance: {
            increment: instructorAmount,
          },
        },
      });
    }

    console.log(
      `PayPal Commission: Platform R$${platformCommission.toFixed(
        2
      )}, Instructor R$${instructorAmount.toFixed(2)}`
    );
  } catch (error) {
    console.error("Error processing PayPal commission:", error);
    throw error;
  }
}

/**
 * Obtém detalhes de um pedido PayPal
 */
export async function getPayPalOrderDetails(paypalOrderId: string) {
  try {
    const request = new checkoutNodeJssdk.orders.OrdersGetRequest(paypalOrderId);
    const response = await client().execute(request);
    return response.result;
  } catch (error) {
    console.error("Error getting PayPal order details:", error);
    throw new Error("Failed to get PayPal order details");
  }
}

/**
 * Cria um reembolso PayPal
 */
export async function createPayPalRefund(
  captureId: string,
  amount?: number
): Promise<any> {
  try {
    const request = new checkoutNodeJssdk.payments.CapturesRefundRequest(
      captureId
    );

    if (amount) {
      request.requestBody({
        amount: {
          currency_code: "BRL",
          value: amount.toFixed(2),
        },
      });
    } else {
      request.requestBody({});
    }

    const response = await client().execute(request);
    return response.result;
  } catch (error) {
    console.error("Error creating PayPal refund:", error);
    throw new Error("Failed to create PayPal refund");
  }
}
