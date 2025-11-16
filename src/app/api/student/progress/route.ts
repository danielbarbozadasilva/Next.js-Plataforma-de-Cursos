import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

// GET - Buscar progresso de um curso
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

    // Verificar se o aluno está matriculado
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
        { error: "Você não está matriculado neste curso" },
        { status: 403 }
      );
    }

    // Buscar progresso (aulas completadas)
    const completedLessons = await db.completedLesson.findMany({
      where: {
        userId: session.user.id,
        lesson: {
          section: {
            courseId,
          },
        },
      },
      include: {
        lesson: true,
      },
    });

    // Buscar total de aulas do curso
    const course = await db.course.findUnique({
      where: { id: courseId },
      include: {
        sections: {
          include: {
            lessons: true,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Curso não encontrado" },
        { status: 404 }
      );
    }

    const totalLessons = course.sections.reduce(
      (sum, section) => sum + section.lessons.length,
      0
    );

    const completedCount = completedLessons.length;
    const progressPercentage =
      totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    return NextResponse.json({
      courseId,
      totalLessons,
      completedLessons: completedCount,
      progressPercentage,
      completedLessonIds: completedLessons.map((cl) => cl.lessonId),
    });
  } catch (error) {
    console.error("Erro ao buscar progresso:", error);
    return NextResponse.json(
      { error: "Erro ao buscar progresso" },
      { status: 500 }
    );
  }
}

const markCompleteSchema = z.object({
  lessonId: z.string(),
});

// POST - Marcar aula como completa
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
    const { lessonId } = markCompleteSchema.parse(body);

    // Buscar aula e verificar se o aluno está matriculado no curso
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
      return NextResponse.json(
        { error: "Aula não encontrada" },
        { status: 404 }
      );
    }

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

    // Marcar aula como completa (upsert para evitar duplicatas)
    const completedLesson = await db.completedLesson.upsert({
      where: {
        userId_lessonId: {
          userId: session.user.id,
          lessonId,
        },
      },
      update: {},
      create: {
        userId: session.user.id,
        lessonId,
      },
    });

    // Verificar se o curso foi 100% completado
    const totalLessons = await db.lesson.count({
      where: {
        section: {
          courseId: lesson.section.courseId,
        },
      },
    });

    const completedCount = await db.completedLesson.count({
      where: {
        userId: session.user.id,
        lesson: {
          section: {
            courseId: lesson.section.courseId,
          },
        },
      },
    });

    let certificate = null;

    // Se completou 100%, gerar certificado
    if (completedCount === totalLessons) {
      const existingCertificate = await db.certificate.findUnique({
        where: {
          userId_courseId: {
            userId: session.user.id,
            courseId: lesson.section.courseId,
          },
        },
      });

      if (!existingCertificate) {
        certificate = await db.certificate.create({
          data: {
            userId: session.user.id,
            courseId: lesson.section.courseId,
            verificationCode: generateVerificationCode(),
          },
        });
      }
    }

    return NextResponse.json({
      message: "Aula marcada como completa",
      completedLesson,
      progressPercentage: Math.round((completedCount / totalLessons) * 100),
      certificateGenerated: !!certificate,
      certificate,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Erro ao marcar aula como completa:", error);
    return NextResponse.json(
      { error: "Erro ao marcar aula como completa" },
      { status: 500 }
    );
  }
}

// Gerar código de verificação único para certificado
function generateVerificationCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
