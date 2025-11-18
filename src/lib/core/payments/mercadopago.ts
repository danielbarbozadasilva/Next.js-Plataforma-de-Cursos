/**
 * Serviço de Pagamento - Mercado Pago
 *
 * Gerencia pagamentos via Mercado Pago com split de comissão
 */

import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { db } from "@/lib/db";
import { OrderStatus } from "@/lib/prisma-types";

// Configuração do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "",
});

const preferenceClient = new Preference(client);
const paymentClient = new Payment(client);

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
export interface MercadoPagoCheckoutResponse {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string;
}

/**
 * Cria uma preferência de pagamento no Mercado Pago
 */
export async function createMercadoPagoPreference(
  userId: string,
  items: CartItem[]
): Promise<MercadoPagoCheckoutResponse> {
  try {
    // Calcula o total
    const totalAmount = items.reduce((sum, item) => sum + item.price, 0);

    // Cria o pedido no banco de dados
    const dbOrder = await db.order.create({
      data: {
        userId,
        totalAmount,
        status: OrderStatus.PENDING,
        gateway: "mercadopago",
        items: {
          create: items.map((item) => ({
            courseId: item.courseId,
            priceAtPurchase: item.price,
          })),
        },
      },
    });

    // Prepara os itens para o Mercado Pago
    const mpItems = items.map((item) => ({
      id: item.courseId,
      title: item.title,
      description: `Curso: ${item.title}`,
      quantity: 1,
      unit_price: item.price,
      currency_id: "BRL",
    }));

    // Cria a preferência de pagamento
    const preference = await preferenceClient.create({
      body: {
        items: mpItems,
        back_urls: {
          success: `${process.env.APP_URL}/checkout/success`,
          failure: `${process.env.APP_URL}/checkout/failure`,
          pending: `${process.env.APP_URL}/checkout/pending`,
        },
        auto_return: "approved",
        external_reference: dbOrder.id,
        notification_url: `${process.env.APP_URL}/api/webhooks/mercadopago`,
        statement_descriptor: "Plataforma EAD",
        payment_methods: {
          installments: 12, // Até 12 parcelas
        },
      },
    });

    // Salva o ID da preferência no banco
    await db.order.update({
      where: { id: dbOrder.id },
      data: {
        gatewayTransactionId: preference.id,
      },
    });

    return {
      preferenceId: preference.id!,
      initPoint: preference.init_point!,
      sandboxInitPoint: preference.sandbox_init_point!,
    };
  } catch (error) {
    console.error("Error creating Mercado Pago preference:", error);
    throw new Error("Failed to create Mercado Pago preference");
  }
}

/**
 * Processa a notificação de pagamento do Mercado Pago
 * Chamado pelo webhook
 */
export async function handleMercadoPagoNotification(
  paymentId: string
): Promise<void> {
  try {
    // Busca o pagamento no Mercado Pago
    const payment = await paymentClient.get({ id: paymentId });

    if (!payment.external_reference) {
      throw new Error("External reference not found in payment");
    }

    const orderId = payment.external_reference;

    // Busca o pedido no banco
    const order = await db.order.findUnique({
      where: { id: orderId },
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
      throw new Error(`Order ${orderId} not found`);
    }

    // Verifica o status do pagamento
    if (payment.status === "approved") {
      // Se já foi processado, não faz nada
      if (order.status === OrderStatus.COMPLETED) {
        console.log(`Order ${orderId} already processed`);
        return;
      }

      // Atualiza o pedido para COMPLETED
      await db.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.COMPLETED,
          gatewayTransactionId: payment.id?.toString(),
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

      console.log(`Mercado Pago payment ${paymentId} processed successfully`);
    } else if (payment.status === "rejected" || payment.status === "cancelled") {
      // Marca o pedido como falhado
      await db.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.FAILED,
        },
      });

      console.log(`Mercado Pago payment ${paymentId} failed`);
    }
  } catch (error) {
    console.error("Error handling Mercado Pago notification:", error);
    throw error;
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
      `Mercado Pago Commission: Platform R$${platformCommission.toFixed(
        2
      )}, Instructor R$${instructorAmount.toFixed(2)}`
    );
  } catch (error) {
    console.error("Error processing Mercado Pago commission:", error);
    throw error;
  }
}

/**
 * Obtém detalhes de um pagamento
 */
export async function getMercadoPagoPaymentDetails(paymentId: string) {
  try {
    return await paymentClient.get({ id: paymentId });
  } catch (error) {
    console.error("Error getting Mercado Pago payment details:", error);
    throw new Error("Failed to get Mercado Pago payment details");
  }
}

/**
 * Cria um reembolso no Mercado Pago
 */
export async function createMercadoPagoRefund(
  paymentId: string,
  amount?: number
): Promise<any> {
  try {
    const refundData: any = {
      payment_id: parseInt(paymentId),
    };

    if (amount) {
      refundData.amount = amount;
    }

    // Note: A API do Mercado Pago mudou. Esta é uma implementação básica
    // Pode ser necessário ajustar de acordo com a versão do SDK
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}/refunds`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(refundData),
      }
    );

    if (!response.ok) {
      throw new Error(`Mercado Pago API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating Mercado Pago refund:", error);
    throw new Error("Failed to create Mercado Pago refund");
  }
}

/**
 * Busca pagamentos de um usuário
 */
export async function getUserMercadoPagoPayments(userId: string) {
  return await db.order.findMany({
    where: {
      userId,
      gateway: "mercadopago",
    },
    include: {
      items: {
        include: {
          course: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}
