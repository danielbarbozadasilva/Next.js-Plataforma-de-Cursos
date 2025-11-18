import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, CheckCircle, Clock, BookOpen } from "lucide-react";
import Link from "next/link";

async function getInstructorQuestions(instructorId: string) {
  const questions = await db.question.findMany({
    where: {
      course: {
        instructorId,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      author: {
        select: {
          name: true,
          email: true,
          image: true,
        },
      },
      course: {
        select: {
          title: true,
        },
      },
      lesson: {
        select: {
          title: true,
        },
      },
      answers: {
        orderBy: {
          createdAt: "asc",
        },
        include: {
          author: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });

  return questions;
}

export default async function QAPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const questions = await getInstructorQuestions(session.user.id);
  const unanswered = questions.filter((q: any) => q.answers.length === 0);
  const answered = questions.filter((q: any) => q.answers.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Q&A / Fórum</h1>
        <p className="text-muted-foreground">
          Responda às perguntas dos seus alunos
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Perguntas
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{questions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Aguardando Resposta
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {unanswered.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Respondidas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {answered.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Perguntas */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Perguntas Recentes</h2>

        {questions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                Nenhuma pergunta ainda
              </h3>
              <p className="text-muted-foreground text-center">
                Quando seus alunos fizerem perguntas, elas aparecerão aqui.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {questions.map((question: any) => (
              <Card key={question.id}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {question.author.image ? (
                        <img
                          src={question.author.image}
                          alt={question.author.name}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">
                            {question.author.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{question.title}</h3>
                        {question.answers.length === 0 ? (
                          <Badge variant="secondary">Não respondida</Badge>
                        ) : (
                          <Badge className="bg-green-500">
                            {question.answers.length} resposta(s)
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <span>{question.author.name}</span>
                        <span>•</span>
                        <span>
                          {new Date(question.createdAt).toLocaleDateString(
                            "pt-BR"
                          )}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {question.course.title}
                        </span>
                        {question.lesson && (
                          <>
                            <span>•</span>
                            <span>{question.lesson.title}</span>
                          </>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground mb-4">
                        {question.content.length > 200
                          ? question.content.substring(0, 200) + "..."
                          : question.content}
                      </p>

                      {/* Respostas */}
                      {question.answers.length > 0 && (
                        <div className="border-l-2 border-primary/20 pl-4 space-y-3 mb-4">
                          {question.answers.map((answer: any) => (
                            <div
                              key={answer.id}
                              className="bg-muted/50 p-3 rounded-lg"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                {answer.author.image ? (
                                  <img
                                    src={answer.author.image}
                                    alt={answer.author.name}
                                    className="h-6 w-6 rounded-full"
                                  />
                                ) : (
                                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-xs font-bold text-primary">
                                      {answer.author.name.charAt(0)}
                                    </span>
                                  </div>
                                )}
                                <span className="text-sm font-medium">
                                  {answer.author.name}
                                </span>
                                {answer.isBestAnswer && (
                                  <Badge className="bg-green-500 text-xs">
                                    Melhor Resposta
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm">{answer.content}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Link
                          href={`/instructor/communication/qa/${question.id}`}
                        >
                          <Button size="sm">
                            {question.answers.length === 0
                              ? "Responder"
                              : "Ver Detalhes"}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
