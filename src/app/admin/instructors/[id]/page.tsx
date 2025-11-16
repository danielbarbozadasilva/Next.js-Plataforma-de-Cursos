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
import { DollarSign, BookOpen, Users, TrendingUp } from "lucide-react";

async function getInstructorDetails(instructorId: string) {
  const instructor = await db.user.findUnique({
    where: { id: instructorId, role: "INSTRUCTOR" },
    include: {
      instructorProfile: true,
      coursesAsInstructor: {
        include: {
          enrollments: {
            select: {
              id: true,
            },
          },
          orderItems: {
            select: {
              priceAtPurchase: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      instructorPayouts: {
        orderBy: {
          requestedAt: "desc",
        },
      },
    },
  });

  if (!instructor) {
    notFound();
  }

  // Calcular receita total
  const totalRevenue = instructor.coursesAsInstructor.reduce(
    (acc, course) =>
      acc +
      course.orderItems.reduce(
        (sum, item) => sum + Number(item.priceAtPurchase),
        0
      ),
    0
  );

  // Calcular total de alunos
  const totalStudents = instructor.coursesAsInstructor.reduce(
    (acc, course) => acc + course.enrollments.length,
    0
  );

  return {
    ...instructor,
    totalRevenue,
    totalStudents,
  };
}

export default async function InstructorDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const instructor = await getInstructorDetails(params.id);
  const balance = Number(instructor.instructorProfile?.balance || 0);

  // Assumindo 70% de comissão para o instrutor
  const instructorCommission = instructor.totalRevenue * 0.7;
  const platformCommission = instructor.totalRevenue * 0.3;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{instructor.name}</h1>
          <p className="text-muted-foreground">{instructor.email}</p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Saldo Disponível
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(balance)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Receita Total
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(instructor.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Comissão: {formatCurrency(instructorCommission)} (70%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cursos</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {instructor.coursesAsInstructor.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {
                instructor.coursesAsInstructor.filter((c) => c.isPublished)
                  .length
              }{" "}
              publicados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Alunos
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{instructor.totalStudents}</div>
          </CardContent>
        </Card>
      </div>

      {/* Bio do Instrutor */}
      {instructor.instructorProfile?.bio && (
        <Card>
          <CardHeader>
            <CardTitle>Biografia</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{instructor.instructorProfile.bio}</p>
            {instructor.instructorProfile.websiteUrl && (
              <p className="mt-2 text-sm text-muted-foreground">
                Website:{" "}
                <a
                  href={instructor.instructorProfile.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {instructor.instructorProfile.websiteUrl}
                </a>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cursos do Instrutor */}
      <Card>
        <CardHeader>
          <CardTitle>
            Cursos ({instructor.coursesAsInstructor.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Alunos</TableHead>
                <TableHead>Receita</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instructor.coursesAsInstructor.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Nenhum curso criado
                  </TableCell>
                </TableRow>
              ) : (
                instructor.coursesAsInstructor.map((course) => {
                  const courseRevenue = course.orderItems.reduce(
                    (sum, item) => sum + Number(item.priceAtPurchase),
                    0
                  );

                  return (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">
                        {course.title}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            course.isPublished ? "default" : "secondary"
                          }
                        >
                          {course.isPublished ? "Publicado" : "Rascunho"}
                        </Badge>
                      </TableCell>
                      <TableCell>{course.enrollments.length}</TableCell>
                      <TableCell>{formatCurrency(courseRevenue)}</TableCell>
                      <TableCell>{formatDate(course.createdAt)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Histórico de Saques */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Saques</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data da Solicitação</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Processado em</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instructor.instructorPayouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Nenhum saque solicitado
                  </TableCell>
                </TableRow>
              ) : (
                instructor.instructorPayouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell>
                      {formatDateTime(payout.requestedAt)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(Number(payout.amount))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          payout.status === "PROCESSED"
                            ? "default"
                            : payout.status === "PENDING"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {payout.status === "PROCESSED"
                          ? "Processado"
                          : payout.status === "PENDING"
                          ? "Pendente"
                          : "Falhou"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {payout.processedAt
                        ? formatDateTime(payout.processedAt)
                        : "-"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {payout.notes || "-"}
                    </TableCell>
                    <TableCell>
                      {payout.status === "PENDING" && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="default">
                            Aprovar
                          </Button>
                          <Button size="sm" variant="destructive">
                            Rejeitar
                          </Button>
                        </div>
                      )}
                    </TableCell>
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
