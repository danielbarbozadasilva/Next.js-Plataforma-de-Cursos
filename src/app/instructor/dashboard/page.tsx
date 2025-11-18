import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  DollarSign,
  Users,
  BookOpen,
  Star,
  TrendingUp,
  MessageSquare,
  Eye,
} from "lucide-react";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import { redirect } from "next/navigation";

async function getInstructorStats(instructorId: string) {
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  // Buscar perfil do instrutor
  const instructorProfile = await db.instructorProfile.findUnique({
    where: { userId: instructorId },
  });

  // Total de cursos do instrutor
  const totalCourses = await db.course.count({
    where: { instructorId },
  });

  // Cursos publicados
  const publishedCourses = await db.course.count({
    where: { instructorId, isPublished: true },
  });

  // Total de matrículas em todos os cursos do instrutor
  const totalEnrollments = await db.enrollment.count({
    where: {
      course: {
        instructorId,
      },
    },
  });

  // Matrículas do mês atual
  const currentMonthEnrollments = await db.enrollment.count({
    where: {
      course: {
        instructorId,
      },
      createdAt: {
        gte: currentMonthStart,
        lte: currentMonthEnd,
      },
    },
  });

  // Matrículas do mês passado
  const lastMonthEnrollments = await db.enrollment.count({
    where: {
      course: {
        instructorId,
      },
      createdAt: {
        gte: lastMonthStart,
        lte: lastMonthEnd,
      },
    },
  });

  // Receita total do instrutor (70% da receita dos cursos - taxa da plataforma de 30%)
  const totalRevenue = await db.orderItem.aggregate({
    where: {
      course: {
        instructorId,
      },
      order: {
        status: "COMPLETED",
      },
    },
    _sum: {
      priceAtPurchase: true,
    },
  });

  // Receita do mês atual
  const currentMonthRevenue = await db.orderItem.aggregate({
    where: {
      course: {
        instructorId,
      },
      order: {
        status: "COMPLETED",
        createdAt: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
    },
    _sum: {
      priceAtPurchase: true,
    },
  });

  // Receita do mês passado
  const lastMonthRevenue = await db.orderItem.aggregate({
    where: {
      course: {
        instructorId,
      },
      order: {
        status: "COMPLETED",
        createdAt: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
      },
    },
    _sum: {
      priceAtPurchase: true,
    },
  });

  // Média de avaliações dos cursos
  const reviews = await db.review.aggregate({
    where: {
      course: {
        instructorId,
      },
    },
    _avg: {
      rating: true,
    },
    _count: {
      rating: true,
    },
  });

  // Perguntas sem resposta (Q&A)
  const unansweredQuestions = await db.question.count({
    where: {
      course: {
        instructorId,
      },
      answers: {
        none: {},
      },
    },
  });

  // Cálculo de crescimento de matrículas
  const enrollmentGrowth = lastMonthEnrollments
    ? ((currentMonthEnrollments - lastMonthEnrollments) / lastMonthEnrollments) * 100
    : 0;

  // Cálculo de crescimento da receita
  const revenueGrowth = lastMonthRevenue._sum.priceAtPurchase
    ? ((Number(currentMonthRevenue._sum.priceAtPurchase || 0) -
        Number(lastMonthRevenue._sum.priceAtPurchase)) /
        Number(lastMonthRevenue._sum.priceAtPurchase)) *
      100
    : 0;

  // Receita do instrutor (70% da receita bruta)
  const instructorRevenue = Number(totalRevenue._sum.priceAtPurchase || 0) * 0.7;
  const currentMonthInstructorRevenue =
    Number(currentMonthRevenue._sum.priceAtPurchase || 0) * 0.7;

  return {
    balance: Number(instructorProfile?.balance || 0),
    revenue: {
      total: instructorRevenue,
      currentMonth: currentMonthInstructorRevenue,
      growth: revenueGrowth,
    },
    courses: {
      total: totalCourses,
      published: publishedCourses,
    },
    enrollments: {
      total: totalEnrollments,
      currentMonth: currentMonthEnrollments,
      growth: enrollmentGrowth,
    },
    reviews: {
      average: Number(reviews._avg.rating || 0),
      count: reviews._count.rating,
    },
    unansweredQuestions,
  };
}

async function getRecentEnrollments(instructorId: string) {
  const enrollments = await db.enrollment.findMany({
    where: {
      course: {
        instructorId,
      },
    },
    take: 5,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      course: {
        select: {
          title: true,
        },
      },
    },
  });

  return enrollments;
}

async function getTopCourses(instructorId: string) {
  const courses = await db.course.findMany({
    where: {
      instructorId,
      isPublished: true,
    },
    take: 5,
    orderBy: {
      enrollments: {
        _count: "desc",
      },
    },
    include: {
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
  });

  return courses.map((course: any) => ({
    ...course,
    averageRating:
      course.reviews.length > 0
        ? course.reviews.reduce((sum: any, r: any) => sum + r.rating, 0) / course.reviews.length
        : 0,
  }));
}

export default async function InstructorDashboard() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const stats = await getInstructorStats(session.user.id);
  const recentEnrollments = await getRecentEnrollments(session.user.id);
  const topCourses = await getTopCourses(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do seu desempenho como instrutor
        </p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Receita do Mês
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.revenue.currentMonth)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.revenue.growth > 0 ? "+" : ""}
              {stats.revenue.growth.toFixed(1)}% em relação ao mês passado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Saldo Disponível
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.balance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Receita total: {formatCurrency(stats.revenue.total)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Novas Matrículas
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              +{stats.enrollments.currentMonth}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.enrollments.growth > 0 ? "+" : ""}
              {stats.enrollments.growth.toFixed(1)}% de crescimento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Avaliação Média
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.reviews.average.toFixed(1)} ⭐
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.reviews.count} avaliações
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Informações Adicionais */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Meus Cursos
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.courses.published}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.courses.total} cursos no total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Alunos
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.enrollments.total}
            </div>
            <p className="text-xs text-muted-foreground">
              Matrículas em todos os cursos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Perguntas Pendentes
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.unansweredQuestions}
            </div>
            <p className="text-xs text-muted-foreground">
              Aguardando sua resposta
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Matrículas Recentes e Top Cursos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Matrículas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentEnrollments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma matrícula encontrada
                </p>
              ) : (
                recentEnrollments.map((enrollment: any) => (
                  <div
                    key={enrollment.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {enrollment.user.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {enrollment.course.title}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(enrollment.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cursos Mais Populares</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCourses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum curso encontrado
                </p>
              ) : (
                topCourses.map((course: any) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{course.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {course._count.enrollments} alunos •{" "}
                        {course.averageRating.toFixed(1)} ⭐
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">
                        {formatCurrency(Number(course.price))}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
