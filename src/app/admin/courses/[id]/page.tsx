import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, XCircle, Star, Users, DollarSign } from "lucide-react";
import Image from "next/image";

async function getCourseDetails(courseId: string) {
  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      category: {
        select: {
          name: true,
          slug: true,
        },
      },
      sections: {
        include: {
          lessons: {
            select: {
              id: true,
              title: true,
              order: true,
            },
          },
        },
        orderBy: {
          order: "asc",
        },
      },
      enrollments: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      },
      reviews: {
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      requirements: true,
      learnObjectives: true,
      orderItems: {
        select: {
          priceAtPurchase: true,
        },
      },
    },
  });

  if (!course) {
    notFound();
  }

  const averageRating =
    course.reviews.length > 0
      ? course.reviews.reduce((acc: any, r: any) => acc + r.rating, 0) /
        course.reviews.length
      : 0;

  const totalRevenue = course.orderItems.reduce(
    (acc: any, item: any) => acc + Number(item.priceAtPurchase),
    0
  );

  const totalLessons = course.sections.reduce(
    (acc: any, section: any) => acc + section.lessons.length,
    0
  );

  return {
    ...course,
    averageRating,
    totalRevenue,
    totalLessons,
  };
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const course = await getCourseDetails(id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{course.title}</h1>
          <p className="text-muted-foreground">
            Por {course.instructor.name} • {course.category.name}
          </p>
        </div>
        <div className="flex gap-2">
          {!course.isPublished && (
            <>
              <Button variant="default">
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprovar Curso
              </Button>
              <Button variant="destructive">
                <XCircle className="h-4 w-4 mr-2" />
                Rejeitar
              </Button>
            </>
          )}
          {course.isPublished && (
            <Button variant="outline">
              <Star className="h-4 w-4 mr-2" />
              Destacar Curso
            </Button>
          )}
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={course.isPublished ? "default" : "secondary"}>
              {course.isPublished ? "Publicado" : "Rascunho"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Alunos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {course.enrollments.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receita</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(course.totalRevenue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avaliação</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {course.averageRating.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              {course.reviews.length} avaliações
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Informações do Curso */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Detalhes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {course.imageUrl && (
              <div className="relative w-full h-48 rounded-lg overflow-hidden">
                <Image
                  src={course.imageUrl}
                  alt={course.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Preço:</span>
                <span className="font-medium">
                  {formatCurrency(Number(course.price))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Nível:</span>
                <Badge variant="outline">{course.level}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Idioma:</span>
                <span className="font-medium">{course.language}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Aulas:</span>
                <span className="font-medium">{course.totalLessons}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Criado:</span>
                <span className="font-medium">
                  {formatDate(course.createdAt)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Descrição</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{course.description}</p>
          </CardContent>
        </Card>
      </div>

      {/* Objetivos e Requisitos */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>O que você vai aprender</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {course.learnObjectives.map((obj: any) => (
                <li key={obj.id} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{obj.text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Requisitos</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {course.requirements.map((req: any) => (
                <li key={req.id} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground">•</span>
                  <span>{req.text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Estrutura do Curso */}
      <Card>
        <CardHeader>
          <CardTitle>Conteúdo do Curso ({course.sections.length} seções)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {course.sections.map((section: any) => (
              <div key={section.id} className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">{section.title}</h3>
                <ul className="space-y-1 ml-4">
                  {section.lessons.map((lesson: any) => (
                    <li key={lesson.id} className="text-sm text-muted-foreground">
                      {lesson.order}. {lesson.title}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Avaliações */}
      <Card>
        <CardHeader>
          <CardTitle>Avaliações ({course.reviews.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {course.reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma avaliação ainda
              </p>
            ) : (
              course.reviews.map((review: any) => (
                <div key={review.id} className="border-b pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{review.user.name}</span>
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(review.createdAt)}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm">{review.comment}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
