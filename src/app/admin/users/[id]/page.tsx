import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Ban, RefreshCw, Mail, Calendar, ShoppingCart } from "lucide-react";

async function getUserDetails(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      enrollments: {
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
          createdAt: "desc",
        },
      },
      orders: {
        include: {
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
        orderBy: {
          createdAt: "desc",
        },
      },
      completedLessons: {
        select: {
          id: true,
          lessonId: true,
        },
      },
      instructorProfile: true,
    },
  });

  if (!user) {
    notFound();
  }

  // Calcular progresso
  const enrollmentsWithProgress = await Promise.all(
    user.enrollments.map(async (enrollment: any) => {
      const totalLessons = await db.lesson.count({
        where: {
          section: {
            courseId: enrollment.courseId,
          },
        },
      });

      const completedLessons = await db.completedLesson.count({
        where: {
          userId: userId,
          lesson: {
            section: {
              courseId: enrollment.courseId,
            },
          },
        },
      });

      const progress =
        totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

      return {
        ...enrollment,
        totalLessons,
        completedLessons,
        progress,
      };
    })
  );

  return {
    ...user,
    enrollments: enrollmentsWithProgress,
  };
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUserDetails(id);

  const totalSpent = user.orders
    .filter((order: any) => order.status === "COMPLETED")
    .reduce((acc: any, order: any) => acc + Number(order.totalAmount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{user.name}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset Senha
          </Button>
          <Button variant="destructive">
            <Ban className="h-4 w-4 mr-2" />
            Banir Usuário
          </Button>
        </div>
      </div>

      {/* Informações Básicas */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Papel</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={
                user.role === "ADMIN"
                  ? "destructive"
                  : user.role === "INSTRUCTOR"
                  ? "default"
                  : "secondary"
              }
            >
              {user.role === "ADMIN"
                ? "Administrador"
                : user.role === "INSTRUCTOR"
                ? "Instrutor"
                : "Aluno"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Gasto
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalSpent)}
            </div>
            <p className="text-xs text-muted-foreground">
              {user.orders.length} pedidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Data de Cadastro
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {formatDate(user.createdAt)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cursos Matriculados */}
      <Card>
        <CardHeader>
          <CardTitle>Cursos Matriculados ({user.enrollments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {user.enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum curso matriculado
            </p>
          ) : (
            <div className="space-y-4">
              {user.enrollments.map((enrollment: any) => (
                <div
                  key={enrollment.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0"
                >
                  <div>
                    <p className="font-medium">{enrollment.course.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Matriculado em {formatDate(enrollment.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {enrollment.progress.toFixed(0)}% concluído
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {enrollment.completedLessons} de {enrollment.totalLessons}{" "}
                      aulas
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Compras */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Compras</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Curso(s)</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Gateway</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {user.orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Nenhuma compra realizada
                  </TableCell>
                </TableRow>
              ) : (
                user.orders.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell>{formatDateTime(order.createdAt)}</TableCell>
                    <TableCell>
                      {order.items.map((item: any) => item.course.title).join(", ")}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(Number(order.totalAmount))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          order.status === "COMPLETED"
                            ? "default"
                            : order.status === "PENDING"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {order.status === "COMPLETED"
                          ? "Concluído"
                          : order.status === "PENDING"
                          ? "Pendente"
                          : "Falhou"}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.gateway || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
