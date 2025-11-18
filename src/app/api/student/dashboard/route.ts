import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    // Buscar cursos matriculados com progresso
    const enrollments = await db.enrollment.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        course: {
          include: {
            instructor: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            category: true,
            sections: {
              include: {
                lessons: true,
              },
            },
            _count: {
              select: {
                reviews: true,
              },
            },
            reviews: {
              select: {
                rating: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calcular progresso de cada curso
    const coursesWithProgress = await Promise.all(
      enrollments.map(async (enrollment: any) => {
        const totalLessons = enrollment.course.sections.reduce(
          (sum: any, section: any) => sum + section.lessons.length,
          0
        );

        const completedLessons = await db.completedLesson.count({
          where: {
            userId: session.user.id,
            lesson: {
              section: {
                courseId: enrollment.course.id,
              },
            },
          },
        });

        const progressPercentage =
          totalLessons > 0
            ? Math.round((completedLessons / totalLessons) * 100)
            : 0;

        const totalRating = enrollment.course.reviews.reduce(
          (sum: any, r: any) => sum + r.rating,
          0
        );
        const avgRating =
          enrollment.course.reviews.length > 0
            ? totalRating / enrollment.course.reviews.length
            : 0;

        return {
          id: enrollment.course.id,
          title: enrollment.course.title,
          description: enrollment.course.description,
          imageUrl: enrollment.course.imageUrl,
          instructor: enrollment.course.instructor,
          category: enrollment.course.category,
          enrolledAt: enrollment.createdAt,
          totalLessons,
          completedLessons,
          progressPercentage,
          rating: Math.round(avgRating * 10) / 10,
          reviewsCount: enrollment.course._count.reviews,
        };
      })
    );

    // Buscar histórico de compras
    const orders = await db.order.findMany({
      where: {
        userId: session.user.id,
        status: "COMPLETED",
      },
      include: {
        items: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                imageUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    // Buscar certificados
    const certificates = await db.certificate.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
          },
        },
      },
      orderBy: {
        issuedAt: "desc",
      },
    });

    // Estatísticas gerais
    const stats = {
      totalCourses: enrollments.length,
      completedCourses: coursesWithProgress.filter((c: any) => c.progressPercentage === 100).length,
      inProgressCourses: coursesWithProgress.filter((c: any) => c.progressPercentage > 0 && c.progressPercentage < 100).length,
      certificatesEarned: certificates.length,
      totalSpent: orders.reduce((sum: any, order: any) => sum + Number(order.totalAmount), 0),
    };

    return NextResponse.json({
      courses: coursesWithProgress,
      orders,
      certificates,
      stats,
    });
  } catch (error) {
    console.error("Erro ao buscar dados do dashboard:", error);
    return NextResponse.json(
      { error: "Erro ao buscar dados do dashboard" },
      { status: 500 }
    );
  }
}
