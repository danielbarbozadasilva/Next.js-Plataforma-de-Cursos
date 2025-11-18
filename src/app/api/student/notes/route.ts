import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

// GET - Buscar notas de uma aula
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
    const lessonId = searchParams.get("lessonId");

    if (!lessonId) {
      return NextResponse.json(
        { error: "lessonId é obrigatório" },
        { status: 400 }
      );
    }

    const notes = await db.note.findMany({
      where: {
        userId: session.user.id,
        lessonId,
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Erro ao buscar notas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar notas" },
      { status: 500 }
    );
  }
}

const createNoteSchema = z.object({
  lessonId: z.string(),
  content: z.string().min(1, "Conteúdo é obrigatório"),
  timestamp: z.number().optional(),
});

// POST - Criar nota
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
    const { lessonId, content, timestamp } = createNoteSchema.parse(body);

    // Verificar se a aula existe
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        section: true,
      },
    });

    if (!lesson) {
      return NextResponse.json(
        { error: "Aula não encontrada" },
        { status: 404 }
      );
    }

    // Verificar se o aluno está matriculado no curso
    const enrollment = await db.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: lesson.section.courseId,
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "Você não está matriculado neste curso" },
        { status: 403 }
      );
    }

    const note = await db.note.create({
      data: {
        userId: session.user.id,
        lessonId,
        content,
        timestamp,
      },
    });

    return NextResponse.json({
      message: "Nota criada com sucesso",
      note,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Erro ao criar nota:", error);
    return NextResponse.json(
      { error: "Erro ao criar nota" },
      { status: 500 }
    );
  }
}
