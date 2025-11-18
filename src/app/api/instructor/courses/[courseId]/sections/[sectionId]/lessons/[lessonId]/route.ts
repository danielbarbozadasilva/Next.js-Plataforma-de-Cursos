import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ courseId: string; sectionId: string; lessonId: string }>;
  }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { courseId, sectionId, lessonId } = await params;

    // Verificar se a aula pertence à seção do curso do instrutor
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        section: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
    }

    if (
      lesson.section.course.instructorId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await req.json();
    const { title, order, isFreePreview } = body;

    const updatedLesson = await db.lesson.update({
      where: { id: lessonId },
      data: {
        ...(title !== undefined && { title }),
        ...(order !== undefined && { order }),
        ...(isFreePreview !== undefined && { isFreePreview }),
      },
    });

    return NextResponse.json(updatedLesson);
  } catch (error) {
    console.error("Erro ao atualizar aula:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar aula" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ courseId: string; sectionId: string; lessonId: string }>;
  }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { courseId, sectionId, lessonId } = await params;

    // Verificar se a aula pertence à seção do curso do instrutor
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        section: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
    }

    if (
      lesson.section.course.instructorId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    await db.lesson.delete({
      where: { id: lessonId },
    });

    return NextResponse.json({ message: "Aula deletada com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar aula:", error);
    return NextResponse.json(
      { error: "Erro ao deletar aula" },
      { status: 500 }
    );
  }
}
