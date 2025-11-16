import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const checkoutSchema = z.object({
  courseIds: z.array(z.string()).min(1, "Pelo menos um curso é necessário"),
  paymentMethod: z.enum(["CREDIT_CARD", "PIX", "BOLETO"]),
  couponCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { courseIds, paymentMethod, couponCode } = checkoutSchema.parse(body);

    // Buscar cursos
    const courses = await db.course.findMany({
      where: {
        id: { in: courseIds },
        isPublished: true,
      },
    });

    if (courses.length !== courseIds.length) {
      return NextResponse.json(
        { error: "Um ou mais cursos não foram encontrados" },
        { status: 404 }
      );
    }

    // Verificar se o aluno já está matriculado em algum curso
    const existingEnrollments = await db.enrollment.findMany({
      where: {
        userId: session.user.id,
        courseId: { in: courseIds },
      },
    });

    if (existingEnrollments.length > 0) {
      return NextResponse.json(
        {
          error: "Você já está matriculado em um ou mais desses cursos",
          enrolledCourses: existingEnrollments.map((e) => e.courseId),
        },
        { status: 400 }
      );
    }

    // Calcular total
    let totalAmount = courses.reduce(
      (sum, course) => sum + Number(course.price),
      0
    );

    // Aplicar cupom se fornecido
    let discount = 0;
    if (couponCode) {
      const coupon = await db.coupon.findUnique({
        where: { code: couponCode },
      });

      if (
        coupon &&
        coupon.isActive &&
        (!coupon.expiresAt || coupon.expiresAt > new Date()) &&
        (!coupon.maxUses || coupon.usedCount < coupon.maxUses)
      ) {
        if (coupon.discountType === "PERCENTAGE") {
          discount = (totalAmount * Number(coupon.value)) / 100;
        } else {
          discount = Number(coupon.value);
        }

        // Atualizar contagem de uso do cupom
        await db.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }
    }

    const finalAmount = totalAmount - discount;

    // Criar pedido
    const order = await db.order.create({
      data: {
        userId: session.user.id,
        totalAmount: finalAmount,
        status: "PENDING",
        gateway: getPaymentGateway(paymentMethod),
        items: {
          create: courses.map((course) => ({
            courseId: course.id,
            priceAtPurchase: course.price,
          })),
        },
      },
      include: {
        items: {
          include: {
            course: true,
          },
        },
      },
    });

    // Simular processamento de pagamento
    // Em produção, aqui você integraria com gateway de pagamento real
    const paymentResult = await simulatePayment(paymentMethod, order.id);

    if (paymentResult.success) {
      // Atualizar status do pedido
      await db.order.update({
        where: { id: order.id },
        data: {
          status: "COMPLETED",
          gatewayTransactionId: paymentResult.transactionId,
        },
      });

      // Criar matrículas
      await db.enrollment.createMany({
        data: courses.map((course) => ({
          userId: session.user.id,
          courseId: course.id,
        })),
      });

      // Limpar carrinho
      const cart = await db.cart.findUnique({
        where: { userId: session.user.id },
      });

      if (cart) {
        await db.cartItem.deleteMany({
          where: {
            cartId: cart.id,
            courseId: { in: courseIds },
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: "Pagamento realizado com sucesso",
        order: {
          id: order.id,
          totalAmount: finalAmount,
          discount,
          transactionId: paymentResult.transactionId,
          paymentMethod,
        },
      });
    } else {
      // Atualizar status do pedido para FAILED
      await db.order.update({
        where: { id: order.id },
        data: { status: "FAILED" },
      });

      return NextResponse.json(
        {
          success: false,
          error: "Falha no processamento do pagamento",
          details: paymentResult.error,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Erro no checkout:", error);
    return NextResponse.json(
      { error: "Erro ao processar checkout" },
      { status: 500 }
    );
  }
}

// Função auxiliar para determinar gateway de pagamento
function getPaymentGateway(method: string): string {
  switch (method) {
    case "CREDIT_CARD":
    case "PIX":
    case "BOLETO":
      return "mercadopago"; // Pode ser Stripe, MercadoPago, etc.
    default:
      return "unknown";
  }
}

// Simulação de pagamento (substituir por integração real)
async function simulatePayment(
  method: string,
  orderId: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  // Simular delay de processamento
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Simular sucesso (em produção, integrar com gateway real)
  const success = Math.random() > 0.1; // 90% de sucesso

  if (success) {
    return {
      success: true,
      transactionId: `TXN-${Date.now()}-${orderId.substring(0, 8)}`,
    };
  } else {
    return {
      success: false,
      error: "Pagamento recusado",
    };
  }
}
