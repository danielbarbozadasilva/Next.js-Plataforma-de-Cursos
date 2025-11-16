import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const createReviewSchema = z.object({
  courseId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

// POST - Criar avaliação
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
    const { courseId, rating, comment } = createReviewSchema.parse(body);

    // Verificar se o aluno está matriculado no curso
    const enrollment = await db.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "Você precisa estar matriculado no curso para avaliá-lo" },
        { status: 403 }
      );
    }

    // Criar ou atualizar avaliação
    const review = await db.review.upsert({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
      update: {
        rating,
        comment,
      },
      create: {
        userId: session.user.id,
        courseId,
        rating,
        comment,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Avaliação enviada com sucesso",
      review,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Erro ao criar avaliação:", error);
    return NextResponse.json(
      { error: "Erro ao criar avaliação" },
      { status: 500 }
    );
  }
}

// GET - Buscar avaliação do usuário para um curso
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) {
      return NextResponse.json(
        { error: "courseId é obrigatório" },
        { status: 400 }
      );
    }

    const review = await db.review.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({ review });
  } catch (error) {
    console.error("Erro ao buscar avaliação:", error);
    return NextResponse.json(
      { error: "Erro ao buscar avaliação" },
      { status: 500 }
    );
  }
}
