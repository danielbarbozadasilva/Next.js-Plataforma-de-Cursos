import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  Users,
  Eye,
  TrendingUp,
  BookOpen,
  Star,
  ShoppingCart,
} from "lucide-react";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

async function getInstructorAnalytics(instructorId: string) {
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  // Total de visualizações (usando enrollments como proxy)
  const totalViews = await db.enrollment.count({
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

  // Taxa de conversão (vendas / visualizações)
  const totalSales = await db.orderItem.count({
    where: {
      course: {
        instructorId,
      },
      order: {
        status: "COMPLETED",
      },
    },
  });

  // Receita por curso
  const revenueByСourse = await db.orderItem.groupBy({
    by: ["courseId"],
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
    _count: {
      courseId: true,
    },
  });

  // Buscar informações dos cursos
  const coursesWithRevenue = await Promise.all(
    revenueByСourse.map(async (item: any) => {
      const course = await db.course.findUnique({
        where: { id: item.courseId },
        select: {
          title: true,
          imageUrl: true,
        },
      });

      return {
        courseId: item.courseId,
        title: course?.title || "Curso Desconhecido",
        imageUrl: course?.imageUrl,
        revenue: Number(item._sum.priceAtPurchase || 0) * 0.7, // 70% para o instrutor
        sales: item._count.courseId,
      };
    })
  );

  // Ordenar por receita
  coursesWithRevenue.sort((a, b) => b.revenue - a.revenue);

  // Média de avaliações
  const avgRating = await db.review.aggregate({
    where: {
      course: {
        instructorId,
      },
    },
    _avg: {
      rating: true,
    },
  });

  const enrollmentGrowth =
    lastMonthEnrollments > 0
      ? ((currentMonthEnrollments - lastMonthEnrollments) /
          lastMonthEnrollments) *
        100
      : 0;

  return {
    totalViews,
    currentMonthEnrollments,
    enrollmentGrowth,
    totalSales,
    conversionRate: totalViews > 0 ? (totalSales / totalViews) * 100 : 0,
    avgRating: Number(avgRating._avg.rating || 0),
    coursesWithRevenue,
  };
}

export default async function AnalyticsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const analytics = await getInstructorAnalytics(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Acompanhe o desempenho dos seus cursos
        </p>
      </div>

      {/* Cards de Métricas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Visualizações
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalViews}</div>
            <p className="text-xs text-muted-foreground">
              Todas as matrículas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Matrículas (Mês)
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.currentMonthEnrollments}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.enrollmentGrowth > 0 ? "+" : ""}
              {analytics.enrollmentGrowth.toFixed(1)}% de crescimento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Taxa de Conversão
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.conversionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalSales} vendas totais
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
              {analytics.avgRating.toFixed(1)} ⭐
            </div>
            <p className="text-xs text-muted-foreground">
              De todos os cursos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Receita por Curso */}
      <Card>
        <CardHeader>
          <CardTitle>Receita por Curso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.coursesWithRevenue.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma venda registrada ainda
              </p>
            ) : (
              analytics.coursesWithRevenue.map((course) => (
                <div
                  key={course.courseId}
                  className="flex items-center justify-between border-b pb-4 last:border-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded bg-muted flex items-center justify-center overflow-hidden">
                      {course.imageUrl ? (
                        <img
                          src={course.imageUrl}
                          alt={course.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <BookOpen className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{course.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {course.sales} venda(s)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(course.revenue)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Seus ganhos (70%)
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Origem do Tráfego (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Origem do Tráfego</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              Dados de origem do tráfego serão implementados em breve
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
