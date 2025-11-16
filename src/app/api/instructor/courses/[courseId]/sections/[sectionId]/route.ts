import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { courseId: string; sectionId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Verificar se a seção pertence ao curso do instrutor
    const section = await db.section.findUnique({
      where: { id: params.sectionId },
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
    const { title, order } = body;

    const updatedSection = await db.section.update({
      where: { id: params.sectionId },
      data: {
        ...(title !== undefined && { title }),
        ...(order !== undefined && { order }),
      },
    });

    return NextResponse.json(updatedSection);
  } catch (error) {
    console.error("Erro ao atualizar seção:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar seção" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { courseId: string; sectionId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Verificar se a seção pertence ao curso do instrutor
    const section = await db.section.findUnique({
      where: { id: params.sectionId },
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

    await db.section.delete({
      where: { id: params.sectionId },
    });

    return NextResponse.json({ message: "Seção deletada com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar seção:", error);
    return NextResponse.json(
      { error: "Erro ao deletar seção" },
      { status: 500 }
    );
  }
}
