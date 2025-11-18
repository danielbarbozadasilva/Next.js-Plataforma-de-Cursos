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
import { formatDate, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Eye, Ban, RefreshCw } from "lucide-react";

async function getUsers(searchParams: { search?: string; role?: string }) {
  const users = await db.user.findMany({
    where: {
      AND: [
        searchParams.search
          ? {
              OR: [
                { name: { contains: searchParams.search } },
                { email: { contains: searchParams.search } },
              ],
            }
          : {},
        searchParams.role ? { role: searchParams.role as any } : {},
      ],
    },
    include: {
      enrollments: {
        select: {
          id: true,
        },
      },
      orders: {
        where: {
          status: "COMPLETED",
        },
        select: {
          totalAmount: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  return users.map((user: any) => ({
    ...user,
    totalSpent: user.orders.reduce(
      (acc: any, order: any) => acc + Number(order.totalAmount),
      0
    ),
    enrollmentsCount: user.enrollments.length,
  }));
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { search?: string; role?: string };
}) {
  const users = await getUsers(searchParams);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie alunos, instrutores e administradores
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <form className="flex gap-4 flex-1">
              <input
                type="text"
                name="search"
                placeholder="Buscar por nome ou email..."
                defaultValue={searchParams.search}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              />
              <select
                name="role"
                defaultValue={searchParams.role}
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">Todos os papéis</option>
                <option value="STUDENT">Alunos</option>
                <option value="INSTRUCTOR">Instrutores</option>
                <option value="ADMIN">Administradores</option>
              </select>
              <Button type="submit">Filtrar</Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Cursos</TableHead>
                <TableHead>Total Gasto</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
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
                          ? "Admin"
                          : user.role === "INSTRUCTOR"
                          ? "Instrutor"
                          : "Aluno"}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.enrollmentsCount}</TableCell>
                    <TableCell>{formatCurrency(user.totalSpent)}</TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/admin/users/${user.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
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
