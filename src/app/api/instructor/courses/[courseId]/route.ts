import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const course = await db.course.findUnique({
      where: {
        id: params.courseId,
      },
      include: {
        category: true,
        sections: {
          orderBy: {
            order: "asc",
          },
          include: {
            lessons: {
              orderBy: {
                order: "asc",
              },
            },
          },
        },
        requirements: true,
        learnObjectives: true,
        targetAudience: true,
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Curso não encontrado" }, { status: 404 });
    }

    // Verificar se o usuário é o instrutor do curso ou admin
    if (course.instructorId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    return NextResponse.json(course);
  } catch (error) {
    console.error("Erro ao buscar curso:", error);
    return NextResponse.json(
      { error: "Erro ao buscar curso" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const course = await db.course.findUnique({
      where: { id: params.courseId },
    });

    if (!course) {
      return NextResponse.json({ error: "Curso não encontrado" }, { status: 404 });
    }

    // Verificar se o usuário é o instrutor do curso ou admin
    if (course.instructorId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      description,
      imageUrl,
      price,
      categoryId,
      level,
      language,
      isPublished,
    } = body;

    const updatedCourse = await db.course.update({
      where: { id: params.courseId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(categoryId !== undefined && { categoryId }),
        ...(level !== undefined && { level }),
        ...(language !== undefined && { language }),
        ...(isPublished !== undefined && { isPublished }),
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(updatedCourse);
  } catch (error) {
    console.error("Erro ao atualizar curso:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar curso" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const course = await db.course.findUnique({
      where: { id: params.courseId },
      include: {
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Curso não encontrado" }, { status: 404 });
    }

    // Verificar se o usuário é o instrutor do curso ou admin
    if (course.instructorId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    // Não permitir deletar curso com alunos matriculados
    if (course._count.enrollments > 0) {
      return NextResponse.json(
        { error: "Não é possível deletar um curso com alunos matriculados" },
        { status: 400 }
      );
    }

    await db.course.delete({
      where: { id: params.courseId },
    });

    return NextResponse.json({ message: "Curso deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar curso:", error);
    return NextResponse.json(
      { error: "Erro ao deletar curso" },
      { status: 500 }
    );
  }
}
