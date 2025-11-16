import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

// GET - Buscar carrinho do usuário
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    // Buscar ou criar carrinho
    let cart = await db.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            course: {
              include: {
                instructor: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                category: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await db.cart.create({
        data: { userId: session.user.id },
        include: {
          items: {
            include: {
              course: {
                include: {
                  instructor: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                  category: true,
                },
              },
            },
          },
        },
      });
    }

    // Calcular total
    const total = cart.items.reduce(
      (sum, item) => sum + Number(item.course.price),
      0
    );

    return NextResponse.json({
      cart: {
        id: cart.id,
        items: cart.items,
        itemsCount: cart.items.length,
        total,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar carrinho:", error);
    return NextResponse.json(
      { error: "Erro ao buscar carrinho" },
      { status: 500 }
    );
  }
}

const addToCartSchema = z.object({
  courseId: z.string(),
});

// POST - Adicionar item ao carrinho
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
    const { courseId } = addToCartSchema.parse(body);

    // Verificar se o curso existe e está publicado
    const course = await db.course.findUnique({
      where: { id: courseId, isPublished: true },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Curso não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se o aluno já está matriculado
    const enrollment = await db.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
    });

    if (enrollment) {
      return NextResponse.json(
        { error: "Você já está matriculado neste curso" },
        { status: 400 }
      );
    }

    // Buscar ou criar carrinho
    let cart = await db.cart.findUnique({
      where: { userId: session.user.id },
    });

    if (!cart) {
      cart = await db.cart.create({
        data: { userId: session.user.id },
      });
    }

    // Adicionar item ao carrinho (se já não estiver)
    const cartItem = await db.cartItem.upsert({
      where: {
        cartId_courseId: {
          cartId: cart.id,
          courseId,
        },
      },
      update: {},
      create: {
        cartId: cart.id,
        courseId,
      },
      include: {
        course: true,
      },
    });

    return NextResponse.json({
      message: "Curso adicionado ao carrinho",
      item: cartItem,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Erro ao adicionar ao carrinho:", error);
    return NextResponse.json(
      { error: "Erro ao adicionar ao carrinho" },
      { status: 500 }
    );
  }
}

const removeFromCartSchema = z.object({
  courseId: z.string(),
});

// DELETE - Remover item do carrinho
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { courseId } = removeFromCartSchema.parse(body);

    const cart = await db.cart.findUnique({
      where: { userId: session.user.id },
    });

    if (!cart) {
      return NextResponse.json(
        { error: "Carrinho não encontrado" },
        { status: 404 }
      );
    }

    await db.cartItem.delete({
      where: {
        cartId_courseId: {
          cartId: cart.id,
          courseId,
        },
      },
    });

    return NextResponse.json({
      message: "Curso removido do carrinho",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Erro ao remover do carrinho:", error);
    return NextResponse.json(
      { error: "Erro ao remover do carrinho" },
      { status: 500 }
    );
  }
}
