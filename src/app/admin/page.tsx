import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  DollarSign,
  Users,
  BookOpen,
  TrendingUp,
  Clock,
  MessageSquare,
} from "lucide-react";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

async function getDashboardStats() {
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  // Receita do mês atual
  const currentMonthRevenue = await db.order.aggregate({
    where: {
      status: "COMPLETED",
      createdAt: {
        gte: currentMonthStart,
        lte: currentMonthEnd,
      },
    },
    _sum: {
      totalAmount: true,
    },
  });

  // Receita do mês passado
  const lastMonthRevenue = await db.order.aggregate({
    where: {
      status: "COMPLETED",
      createdAt: {
        gte: lastMonthStart,
        lte: lastMonthEnd,
      },
    },
    _sum: {
      totalAmount: true,
    },
  });

  // Novos usuários do mês
  const newUsersThisMonth = await db.user.count({
    where: {
      createdAt: {
        gte: currentMonthStart,
        lte: currentMonthEnd,
      },
    },
  });

  // Total de usuários
  const totalUsers = await db.user.count();

  // Cursos pendentes de aprovação
  const pendingCourses = await db.course.count({
    where: {
      isPublished: false,
    },
  });

  // Total de cursos
  const totalCourses = await db.course.count();

  // Tickets abertos (usando Questions como proxy)
  const openTickets = await db.question.count({
    where: {
      answers: {
        none: {},
      },
    },
  });

  // Cálculo de crescimento da receita
  const revenueGrowth = lastMonthRevenue._sum.totalAmount
    ? ((Number(currentMonthRevenue._sum.totalAmount || 0) -
        Number(lastMonthRevenue._sum.totalAmount)) /
        Number(lastMonthRevenue._sum.totalAmount)) *
      100
    : 0;

  return {
    revenue: {
      current: Number(currentMonthRevenue._sum.totalAmount || 0),
      growth: revenueGrowth,
    },
    users: {
      total: totalUsers,
      newThisMonth: newUsersThisMonth,
    },
    courses: {
      total: totalCourses,
      pending: pendingCourses,
    },
    tickets: openTickets,
  };
}

async function getRecentOrders() {
  const orders = await db.order.findMany({
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
      items: {
        include: {
          course: {
            select: {
              title: true,
            },
          },
        },
      },
    },
  });

  return orders;
}

export default async function AdminDashboard() {
  const stats = await getDashboardStats();
  const recentOrders = await getRecentOrders();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral da plataforma
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
              {formatCurrency(stats.revenue.current)}
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
              Novos Usuários
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              +{stats.users.newThisMonth}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de {stats.users.total} usuários
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Cursos Pendentes
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.courses.pending}
            </div>
            <p className="text-xs text-muted-foreground">
              De {stats.courses.total} cursos totais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Tickets Abertos
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.tickets}
            </div>
            <p className="text-xs text-muted-foreground">
              Perguntas sem resposta
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pedidos Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Pedidos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum pedido encontrado
              </p>
            ) : (
              recentOrders.map((order: any) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {order.user.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.items[0]?.course.title}
                      {order.items.length > 1 &&
                        ` +${order.items.length - 1} mais`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">
                      {formatCurrency(Number(order.totalAmount))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.status === "COMPLETED"
                        ? "Concluído"
                        : order.status === "PENDING"
                        ? "Pendente"
                        : "Falhou"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
