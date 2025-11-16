import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const createAnswerSchema = z.object({
  questionId: z.string(),
  content: z.string().min(10, "Resposta deve ter pelo menos 10 caracteres"),
});

// POST - Criar resposta
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
    const { questionId, content } = createAnswerSchema.parse(body);

    // Buscar pergunta
    const question = await db.question.findUnique({
      where: { id: questionId },
      include: {
        course: true,
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: "Pergunta não encontrada" },
        { status: 404 }
      );
    }

    // Verificar se o usuário está matriculado ou é o instrutor do curso
    const enrollment = await db.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: question.courseId,
        },
      },
    });

    const isInstructor = question.course.instructorId === session.user.id;

    if (!enrollment && !isInstructor) {
      return NextResponse.json(
        { error: "Você não tem permissão para responder esta pergunta" },
        { status: 403 }
      );
    }

    const answer = await db.answer.create({
      data: {
        authorId: session.user.id,
        questionId,
        content,
        isBestAnswer: false,
      },
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
    });

    return NextResponse.json({
      message: "Resposta criada com sucesso",
      answer,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Erro ao criar resposta:", error);
    return NextResponse.json(
      { error: "Erro ao criar resposta" },
      { status: 500 }
    );
  }
}
