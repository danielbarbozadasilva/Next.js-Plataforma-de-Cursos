import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; sectionId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { courseId, sectionId } = await params;

    // Verificar se a seção pertence ao curso do instrutor
    const section = await db.section.findUnique({
      where: { id: sectionId },
      include: {
        course: true,
      },
    });

    if (!section) {
      return NextResponse.json({ error: "Seção não encontrada" }, { status: 404 });
    }

    if (
      section.course.instructorId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await req.json();
    const { title, order, isFreePreview } = body;

    if (!title || title.trim().length < 3) {
      return NextResponse.json(
        { error: "Título inválido (mínimo 3 caracteres)" },
        { status: 400 }
      );
    }

    // Buscar a maior ordem atual para calcular a próxima
    const lastLesson = await db.lesson.findFirst({
      where: { sectionId },
      orderBy: { order: "desc" },
    });

    const lesson = await db.lesson.create({
      data: {
        title: title.trim(),
        order: order !== undefined ? order : (lastLesson?.order ?? -1) + 1,
        isFreePreview: isFreePreview || false,
        sectionId,
      },
    });

    return NextResponse.json(lesson, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar aula:", error);
    return NextResponse.json(
      { error: "Erro ao criar aula" },
      { status: 500 }
    );
  }
}
