import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, Users, Eye, Edit } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

async function getInstructorCourses(instructorId: string) {
  const courses = await db.course.findMany({
    where: {
      instructorId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      category: true,
      _count: {
        select: {
          enrollments: true,
          sections: true,
          reviews: true,
        },
      },
    },
  });

  return courses;
}

export default async function InstructorCoursesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const courses = await getInstructorCourses(session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meus Cursos</h1>
          <p className="text-muted-foreground">
            Gerencie seus cursos e crie novos conteúdos
          </p>
        </div>
        <Link href="/instructor/courses/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Curso
          </Button>
        </Link>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              Nenhum curso criado ainda
            </h2>
            <p className="text-muted-foreground text-center mb-6">
              Comece criando seu primeiro curso e compartilhe seu conhecimento
              com milhares de alunos.
            </p>
            <Link href="/instructor/courses/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Curso
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course: any) => (
            <Card key={course.id} className="overflow-hidden">
              <div className="aspect-video bg-muted relative">
                {course.imageUrl ? (
                  <img
                    src={course.imageUrl}
                    alt={course.title}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <BookOpen className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  {course.isPublished ? (
                    <Badge className="bg-green-500">Publicado</Badge>
                  ) : (
                    <Badge variant="secondary">Rascunho</Badge>
                  )}
                </div>
              </div>
              <CardHeader>
                <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {course.category.name}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <p className="font-semibold">{course._count.enrollments}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Users className="h-3 w-3" />
                      Alunos
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold">{course._count.sections}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      Seções
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold">{course._count.reviews}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      ⭐ Reviews
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-lg font-bold">
                    {formatCurrency(Number(course.price))}
                  </span>
                  <div className="flex gap-2">
                    <Link href={`/instructor/courses/${course.id}`}>
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    {course.isPublished && (
                      <Link href={`/courses/${course.id}`} target="_blank">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
