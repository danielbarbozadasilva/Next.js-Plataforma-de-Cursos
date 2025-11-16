import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await req.json();
    const { title } = body;

    if (!title || title.trim().length < 5) {
      return NextResponse.json(
        { error: "Título inválido (mínimo 5 caracteres)" },
        { status: 400 }
      );
    }

    // Buscar primeira categoria disponível (ou criar uma padrão)
    let defaultCategory = await db.category.findFirst();

    if (!defaultCategory) {
      // Criar categoria padrão se não existir nenhuma
      defaultCategory = await db.category.create({
        data: {
          name: "Sem Categoria",
          slug: "sem-categoria",
        },
      });
    }

    const course = await db.course.create({
      data: {
        title: title.trim(),
        description: "",
        price: 0,
        instructorId: session.user.id,
        categoryId: defaultCategory.id,
        isPublished: false,
      },
    });

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar curso:", error);
    return NextResponse.json(
      { error: "Erro ao criar curso" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const courses = await db.course.findMany({
      where: {
        instructorId: session.user.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        category: true,
        _count: {
          select: {
            enrollments: true,
            sections: true,
            reviews: true,
          },
        },
      },
    });

    return NextResponse.json(courses);
  } catch (error) {
    console.error("Erro ao buscar cursos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar cursos" },
      { status: 500 }
    );
  }
}
