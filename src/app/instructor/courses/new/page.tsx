"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewCoursePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/instructor/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        throw new Error("Erro ao criar curso");
      }

      const course = await response.json();
      router.push(`/instructor/courses/${course.id}`);
    } catch (error) {
      console.error("Erro ao criar curso:", error);
      alert("Erro ao criar curso. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/instructor/courses">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Criar Novo Curso</h1>
        <p className="text-muted-foreground">
          Comece dando um título para o seu curso. Você poderá configurar todos
          os detalhes depois.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Título do Curso <span className="text-red-500">*</span>
              </label>
              <Input
                id="title"
                placeholder="Ex: Desenvolvimento Web Completo com Next.js"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                minLength={5}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                Escolha um título claro e descritivo que explique o que os
                alunos aprenderão.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <Link href="/instructor/courses">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={!title || isLoading}>
                {isLoading ? "Criando..." : "Criar Curso"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
