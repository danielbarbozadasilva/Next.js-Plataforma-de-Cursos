import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

// GET - Buscar perguntas de um curso ou aula
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const lessonId = searchParams.get("lessonId");

    if (!courseId) {
      return NextResponse.json(
        { error: "courseId é obrigatório" },
        { status: 400 }
      );
    }

    const where: any = { courseId };
    if (lessonId) {
      where.lessonId = lessonId;
    }

    const questions = await db.question.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        lesson: {
          select: {
            id: true,
            title: true,
          },
        },
        answers: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                image: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        _count: {
          select: {
            answers: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Erro ao buscar perguntas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar perguntas" },
      { status: 500 }
    );
  }
}

const createQuestionSchema = z.object({
  courseId: z.string(),
  lessonId: z.string().optional(),
  title: z.string().min(5, "Título deve ter pelo menos 5 caracteres"),
  content: z.string().min(10, "Conteúdo deve ter pelo menos 10 caracteres"),
});

// POST - Criar pergunta
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
    const { courseId, lessonId, title, content } = createQuestionSchema.parse(body);

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
        { error: "Você precisa estar matriculado no curso para fazer perguntas" },
        { status: 403 }
      );
    }

    const question = await db.question.create({
      data: {
        authorId: session.user.id,
        courseId,
        lessonId,
        title,
        content,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        lesson: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Pergunta criada com sucesso",
      question,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Erro ao criar pergunta:", error);
    return NextResponse.json(
      { error: "Erro ao criar pergunta" },
      { status: 500 }
    );
  }
}
