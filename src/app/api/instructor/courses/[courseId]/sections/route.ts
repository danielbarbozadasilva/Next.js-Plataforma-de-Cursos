import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Verificar se o curso pertence ao instrutor
    const course = await db.course.findUnique({
      where: { id: params.courseId },
    });

    if (!course) {
      return NextResponse.json({ error: "Curso não encontrado" }, { status: 404 });
    }

    if (course.instructorId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await req.json();
    const { title, order } = body;

    if (!title || title.trim().length < 3) {
      return NextResponse.json(
        { error: "Título inválido (mínimo 3 caracteres)" },
        { status: 400 }
      );
    }

    // Buscar a maior ordem atual para calcular a próxima
    const lastSection = await db.section.findFirst({
      where: { courseId: params.courseId },
      orderBy: { order: "desc" },
    });

    const section = await db.section.create({
      data: {
        title: title.trim(),
        order: order !== undefined ? order : (lastSection?.order ?? -1) + 1,
        courseId: params.courseId,
      },
    });

    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar seção:", error);
    return NextResponse.json(
      { error: "Erro ao criar seção" },
      { status: 500 }
    );
  }
}
