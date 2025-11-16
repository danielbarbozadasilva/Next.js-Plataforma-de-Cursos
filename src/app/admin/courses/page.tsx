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
import { Eye, CheckCircle, XCircle, Star, Trash2 } from "lucide-react";

async function getCourses(searchParams: {
  search?: string;
  status?: string;
  category?: string;
}) {
  const courses = await db.course.findMany({
    where: {
      AND: [
        searchParams.search
          ? {
              OR: [
                { title: { contains: searchParams.search } },
                { description: { contains: searchParams.search } },
              ],
            }
          : {},
        searchParams.status === "published"
          ? { isPublished: true }
          : searchParams.status === "draft"
          ? { isPublished: false }
          : {},
        searchParams.category
          ? { categoryId: searchParams.category }
          : {},
      ],
    },
    include: {
      instructor: {
        select: {
          name: true,
          email: true,
        },
      },
      category: {
        select: {
          name: true,
        },
      },
      enrollments: {
        select: {
          id: true,
        },
      },
      reviews: {
        select: {
          rating: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  return courses.map((course) => {
    const averageRating =
      course.reviews.length > 0
        ? course.reviews.reduce((acc, r) => acc + r.rating, 0) /
          course.reviews.length
        : 0;

    return {
      ...course,
      enrollmentsCount: course.enrollments.length,
      reviewsCount: course.reviews.length,
      averageRating,
    };
  });
}

async function getCategories() {
  return db.category.findMany({
    orderBy: {
      name: "asc",
    },
  });
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: { search?: string; status?: string; category?: string };
}) {
  const courses = await getCourses(searchParams);
  const categories = await getCategories();

  const pendingCount = courses.filter((c) => !c.isPublished).length;
  const publishedCount = courses.filter((c) => c.isPublished).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Cursos</h1>
          <p className="text-muted-foreground">
            Aprove, destaque e gerencie cursos da plataforma
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Cursos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Publicados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{publishedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Aguardando Aprovação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex gap-4">
            <input
              type="text"
              name="search"
              placeholder="Buscar por título..."
              defaultValue={searchParams.search}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            />
            <select
              name="status"
              defaultValue={searchParams.status}
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              <option value="">Todos os status</option>
              <option value="published">Publicados</option>
              <option value="draft">Rascunhos</option>
            </select>
            <select
              name="category"
              defaultValue={searchParams.category}
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              <option value="">Todas as categorias</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <Button type="submit">Filtrar</Button>
          </form>
        </CardContent>
      </Card>

      {/* Tabela de Cursos */}
      <Card>
        <CardHeader>
          <CardTitle>Cursos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Curso</TableHead>
                <TableHead>Instrutor</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Alunos</TableHead>
                <TableHead>Avaliação</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    Nenhum curso encontrado
                  </TableCell>
                </TableRow>
              ) : (
                courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="font-medium truncate">{course.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(course.createdAt)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{course.instructor.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{course.category.name}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={course.isPublished ? "default" : "secondary"}
                      >
                        {course.isPublished ? "Publicado" : "Rascunho"}
                      </Badge>
                    </TableCell>
                    <TableCell>{course.enrollmentsCount}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm">
                          {course.averageRating.toFixed(1)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({course.reviewsCount})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatCurrency(Number(course.price))}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/admin/courses/${course.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {!course.isPublished && (
                          <Button variant="default" size="sm">
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
