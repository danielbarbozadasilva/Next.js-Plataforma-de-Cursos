import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

// GET - Buscar wishlist do usuário
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const wishlist = await db.wishlist.findMany({
      where: { userId: session.user.id },
      include: {
        course: {
          include: {
            instructor: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            category: true,
            _count: {
              select: {
                enrollments: true,
                reviews: true,
              },
            },
            reviews: {
              select: {
                rating: true,
              },
            },
          },
        },
      },
      orderBy: {
        addedAt: "desc",
      },
    });

    // Adicionar rating médio
    const wishlistWithRating = wishlist.map((item) => {
      const totalRating = item.course.reviews.reduce(
        (sum, r) => sum + r.rating,
        0
      );
      const avgRating =
        item.course.reviews.length > 0
          ? totalRating / item.course.reviews.length
          : 0;

      return {
        id: item.id,
        addedAt: item.addedAt,
        course: {
          ...item.course,
          rating: Math.round(avgRating * 10) / 10,
          studentsCount: item.course._count.enrollments,
          reviewsCount: item.course._count.reviews,
        },
      };
    });

    return NextResponse.json({
      wishlist: wishlistWithRating,
    });
  } catch (error) {
    console.error("Erro ao buscar wishlist:", error);
    return NextResponse.json(
      { error: "Erro ao buscar wishlist" },
      { status: 500 }
    );
  }
}

const addToWishlistSchema = z.object({
  courseId: z.string(),
});

// POST - Adicionar curso à wishlist
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
    const { courseId } = addToWishlistSchema.parse(body);

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

    // Adicionar à wishlist (se já não estiver)
    const wishlistItem = await db.wishlist.upsert({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
      update: {},
      create: {
        userId: session.user.id,
        courseId,
      },
      include: {
        course: true,
      },
    });

    return NextResponse.json({
      message: "Curso adicionado à lista de desejos",
      item: wishlistItem,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Erro ao adicionar à wishlist:", error);
    return NextResponse.json(
      { error: "Erro ao adicionar à wishlist" },
      { status: 500 }
    );
  }
}

const removeFromWishlistSchema = z.object({
  courseId: z.string(),
});

// DELETE - Remover curso da wishlist
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
    const { courseId } = removeFromWishlistSchema.parse(body);

    await db.wishlist.delete({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
    });

    return NextResponse.json({
      message: "Curso removido da lista de desejos",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Erro ao remover da wishlist:", error);
    return NextResponse.json(
      { error: "Erro ao remover da wishlist" },
      { status: 500 }
    );
  }
}
