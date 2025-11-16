import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Parâmetros de busca e filtros
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId");
    const level = searchParams.get("level");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const minRating = searchParams.get("minRating");
    const sort = searchParams.get("sort") || "popular"; // popular, newest, price-asc, price-desc, rating
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");

    // Construir filtros
    const where: any = {
      isPublished: true,
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(categoryId && { categoryId }),
      ...(level && { level }),
      ...(minPrice && { price: { gte: parseFloat(minPrice) } }),
      ...(maxPrice && { price: { lte: parseFloat(maxPrice) } }),
    };

    // Ordenação
    let orderBy: any = {};
    switch (sort) {
      case "newest":
        orderBy = { createdAt: "desc" };
        break;
      case "price-asc":
        orderBy = { price: "asc" };
        break;
      case "price-desc":
        orderBy = { price: "desc" };
        break;
      case "rating":
        // Para ordenar por rating, precisaremos fazer uma query mais complexa
        orderBy = { createdAt: "desc" }; // Fallback
        break;
      default: // popular
        orderBy = { createdAt: "desc" }; // Simplificado - pode adicionar lógica de popularidade
        break;
    }

    // Buscar cursos com paginação
    const [courses, total] = await Promise.all([
      db.course.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
              reviews: true,
            },
          },
          reviews: {
            select: {
              rating: true,
            },
          },
        },
      }),
      db.course.count({ where }),
    ]);

    // Calcular média de avaliações para cada curso
    const coursesWithRating = courses.map((course) => {
      const totalRating = course.reviews.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = course.reviews.length > 0
        ? totalRating / course.reviews.length
        : 0;

      return {
        id: course.id,
        title: course.title,
        description: course.description,
        imageUrl: course.imageUrl,
        price: course.price,
        level: course.level,
        language: course.language,
        instructor: course.instructor,
        category: course.category,
        studentsCount: course._count.enrollments,
        reviewsCount: course._count.reviews,
        rating: Math.round(avgRating * 10) / 10, // Arredondar para 1 casa decimal
      };
    });

    // Aplicar filtro de rating se necessário
    let filteredCourses = coursesWithRating;
    if (minRating) {
      filteredCourses = coursesWithRating.filter(
        (course) => course.rating >= parseFloat(minRating)
      );
    }

    // Ordenar por rating se necessário
    if (sort === "rating") {
      filteredCourses.sort((a, b) => b.rating - a.rating);
    }

    return NextResponse.json({
      courses: filteredCourses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao buscar cursos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar cursos" },
      { status: 500 }
    );
  }
}
