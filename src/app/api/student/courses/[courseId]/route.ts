import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params;

    const course = await db.course.findUnique({
      where: {
        id: courseId,
        isPublished: true,
      },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            image: true,
            instructorProfile: {
              select: {
                bio: true,
                websiteUrl: true,
              },
            },
          },
        },
        category: true,
        sections: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
              include: {
                videoData: {
                  select: {
                    duration: true,
                    playbackId: true,
                  },
                },
              },
            },
          },
        },
        requirements: true,
        learnObjectives: true,
        targetAudience: true,
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: {
            enrollments: true,
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

    // Calcular estatísticas do curso
    const totalLessons = course.sections.reduce(
      (sum, section) => sum + section.lessons.length,
      0
    );

    const totalDuration = course.sections.reduce(
      (sum, section) =>
        sum +
        section.lessons.reduce(
          (lessonSum, lesson) =>
            lessonSum + (lesson.videoData?.duration || 0),
          0
        ),
      0
    );

    const totalRating = course.reviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );
    const avgRating =
      course.reviews.length > 0 ? totalRating / course.reviews.length : 0;

    // Calcular distribuição de ratings (1-5 estrelas)
    const ratingDistribution = {
      5: course.reviews.filter((r) => r.rating === 5).length,
      4: course.reviews.filter((r) => r.rating === 4).length,
      3: course.reviews.filter((r) => r.rating === 3).length,
      2: course.reviews.filter((r) => r.rating === 2).length,
      1: course.reviews.filter((r) => r.rating === 1).length,
    };

    // Preparar currículo (sections + lessons) sem conteúdo sensível
    const curriculum = course.sections.map((section) => ({
      id: section.id,
      title: section.title,
      order: section.order,
      lessons: section.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        order: lesson.order,
        isFreePreview: lesson.isFreePreview,
        duration: lesson.videoData?.duration || 0,
        hasVideo: !!lesson.videoData,
      })),
    }));

    return NextResponse.json({
      id: course.id,
      title: course.title,
      description: course.description,
      imageUrl: course.imageUrl,
      price: course.price,
      level: course.level,
      language: course.language,
      instructor: {
        id: course.instructor.id,
        name: course.instructor.name,
        image: course.instructor.image,
        bio: course.instructor.instructorProfile?.bio,
        websiteUrl: course.instructor.instructorProfile?.websiteUrl,
      },
      category: course.category,
      requirements: course.requirements,
      learnObjectives: course.learnObjectives,
      targetAudience: course.targetAudience,
      curriculum,
      reviews: course.reviews,
      stats: {
        studentsCount: course._count.enrollments,
        reviewsCount: course.reviews.length,
        rating: Math.round(avgRating * 10) / 10,
        ratingDistribution,
        totalLessons,
        totalDuration: Math.round(totalDuration),
      },
    });
  } catch (error) {
    console.error("Erro ao buscar detalhes do curso:", error);
    return NextResponse.json(
      { error: "Erro ao buscar detalhes do curso" },
      { status: 500 }
    );
  }
}
