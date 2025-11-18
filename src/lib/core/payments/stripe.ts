/**
 * Serviço de Pagamento - Stripe
 *
 * Gerencia pagamentos, checkout e split de comissão via Stripe
 */

import Stripe from "stripe";
import { db } from "@/lib/db";
import { OrderStatus } from "@/lib/prisma-types";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not defined in environment variables");
}

// Inicializa o cliente Stripe
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
  typescript: true,
});

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
export interface CheckoutResponse {
  sessionId: string;
  url: string;
}

/**
 * Cria uma sessão de checkout do Stripe
 */
export async function createCheckoutSession(
  userId: string,
  items: CartItem[],
  successUrl: string,
  cancelUrl: string
): Promise<CheckoutResponse> {
  try {
    // Calcula o total
    const totalAmount = items.reduce((sum, item) => sum + item.price, 0);

    // Cria o pedido no banco de dados com status PENDING
    const order = await db.order.create({
      data: {
        userId,
        totalAmount,
        status: OrderStatus.PENDING,
        gateway: "stripe",
        items: {
          create: items.map((item) => ({
            courseId: item.courseId,
            priceAtPurchase: item.price,
          })),
        },
      },
      include: {
        items: {
          include: {
            course: {
              include: {
                instructor: true,
              },
            },
          },
        },
      },
    });

    // Cria line items para o Stripe
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(
      (item) => ({
        price_data: {
          currency: "brl",
          product_data: {
            name: item.title,
            description: `Curso: ${item.title}`,
          },
          unit_amount: Math.round(item.price * 100), // Stripe usa centavos
        },
        quantity: 1,
      })
    );

    // Cria a sessão de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        orderId: order.id,
        userId,
      },
      customer_email: undefined, // Stripe vai pedir o email
    });

    return {
      sessionId: session.id,
      url: session.url!,
    };
  } catch (error) {
    console.error("Error creating Stripe checkout session:", error);
    throw new Error("Failed to create checkout session");
  }
}

/**
 * Processa um pagamento bem-sucedido
 * Chamado pelo webhook do Stripe
 */
export async function handleSuccessfulPayment(
  sessionId: string
): Promise<void> {
  try {
    // Recupera a sessão do Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session.metadata?.orderId) {
      throw new Error("Order ID not found in session metadata");
    }

    const orderId = session.metadata.orderId;

    // Busca o pedido com os itens
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
        user: true,
      },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

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
        gatewayTransactionId: session.payment_intent as string,
      },
    });

    // Processa o split de comissão para cada curso
    for (const item of order.items) {
      await processPlatformCommission(
        item.course.instructorId,
        item.priceAtPurchase.toNumber()
      );
    }

    // Cria as matrículas (enrollments) para cada curso
    for (const item of order.items) {
      await db.enrollment.create({
        data: {
          userId: order.userId,
          courseId: item.courseId,
        },
      });
    }

    console.log(`Order ${orderId} processed successfully`);
  } catch (error) {
    console.error("Error handling successful payment:", error);
    throw error;
  }
}

/**
 * Processa a comissão da plataforma e atualiza o saldo do instrutor
 */
async function processPlatformCommission(
  instructorId: string,
  totalAmount: number
): Promise<void> {
  try {
    // Calcula a comissão da plataforma e o valor do instrutor
    const platformCommission = totalAmount * (PLATFORM_COMMISSION_RATE / 100);
    const instructorAmount = totalAmount - platformCommission;

    // Atualiza o saldo do instrutor
    const instructorProfile = await db.instructorProfile.findUnique({
      where: { userId: instructorId },
    });

    if (!instructorProfile) {
      // Cria o perfil se não existir
      await db.instructorProfile.create({
        data: {
          userId: instructorId,
          balance: instructorAmount,
        },
      });
    } else {
      // Incrementa o saldo
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
      `Commission processed: Platform: R$${platformCommission.toFixed(
        2
      )}, Instructor: R$${instructorAmount.toFixed(2)}`
    );
  } catch (error) {
    console.error("Error processing platform commission:", error);
    throw error;
  }
}

/**
 * Processa um pagamento falhado
 */
export async function handleFailedPayment(sessionId: string): Promise<void> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session.metadata?.orderId) {
      return;
    }

    const orderId = session.metadata.orderId;

    await db.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.FAILED,
      },
    });

    console.log(`Order ${orderId} marked as failed`);
  } catch (error) {
    console.error("Error handling failed payment:", error);
    throw error;
  }
}

/**
 * Verifica o status de uma sessão de checkout
 */
export async function checkCheckoutSession(
  sessionId: string
): Promise<Stripe.Checkout.Session> {
  try {
    return await stripe.checkout.sessions.retrieve(sessionId);
  } catch (error) {
    console.error("Error checking checkout session:", error);
    throw new Error("Failed to check checkout session");
  }
}

/**
 * Cria um reembolso
 * (Apenas admin pode fazer isso)
 */
export async function createRefund(
  orderId: string,
  amount?: number
): Promise<Stripe.Refund> {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
    });

    if (!order || !order.gatewayTransactionId) {
      throw new Error("Order not found or no transaction ID");
    }

    const refund = await stripe.refunds.create({
      payment_intent: order.gatewayTransactionId,
      amount: amount ? Math.round(amount * 100) : undefined, // Centavos ou total
    });

    // TODO: Atualizar status do pedido e remover matrícula se necessário

    return refund;
  } catch (error) {
    console.error("Error creating refund:", error);
    throw new Error("Failed to create refund");
  }
}

/**
 * Lista todas as transações de um usuário
 */
export async function getUserTransactions(userId: string) {
  return await db.order.findMany({
    where: { userId },
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
