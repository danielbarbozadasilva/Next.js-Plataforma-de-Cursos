import { db } from "@/lib/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Eye, DollarSign, BookOpen } from "lucide-react";

async function getInstructors() {
  const instructors = await db.user.findMany({
    where: {
      role: "INSTRUCTOR",
    },
    include: {
      instructorProfile: true,
      coursesAsInstructor: {
        select: {
          id: true,
          isPublished: true,
        },
      },
      instructorPayouts: {
        where: {
          status: "PENDING",
        },
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return instructors.map((instructor: any) => {
    const publishedCourses = instructor.coursesAsInstructor.filter(
      (c: any) => c.isPublished
    ).length;
    const totalCourses = instructor.coursesAsInstructor.length;
    const balance = Number(instructor.instructorProfile?.balance || 0);
    const pendingPayouts = instructor.instructorPayouts.length;

    return {
      ...instructor,
      publishedCourses,
      totalCourses,
      balance,
      pendingPayouts,
    };
  });
}

export default async function InstructorsPage() {
  const instructors = await getInstructors();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Instrutores</h1>
          <p className="text-muted-foreground">
            Gerencie instrutores, comissões e saques
          </p>
        </div>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Instrutores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{instructors.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Saques Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {instructors.reduce((acc: any, i: any) => acc + i.pendingPayouts, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Saldo Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                instructors.reduce((acc: any, i: any) => acc + i.balance, 0)
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Instrutores */}
      <Card>
        <CardHeader>
          <CardTitle>Instrutores</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Cursos</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Saques Pendentes</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instructors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Nenhum instrutor encontrado
                  </TableCell>
                </TableRow>
              ) : (
                instructors.map((instructor: any) => (
                  <TableRow key={instructor.id}>
                    <TableCell className="font-medium">
                      {instructor.name}
                    </TableCell>
                    <TableCell>{instructor.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {instructor.publishedCourses}/{instructor.totalCourses}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        {formatCurrency(instructor.balance)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {instructor.pendingPayouts > 0 ? (
                        <Badge variant="destructive">
                          {instructor.pendingPayouts}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">0</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(instructor.createdAt)}</TableCell>
                    <TableCell>
                      <Link href={`/admin/instructors/${instructor.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
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
