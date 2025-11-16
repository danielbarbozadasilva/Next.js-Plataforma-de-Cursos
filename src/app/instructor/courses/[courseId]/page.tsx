"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Settings,
  BookOpen,
  Image as ImageIcon,
  DollarSign,
  Save,
  Eye,
  Trash2,
} from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  price: number;
  isPublished: boolean;
  level: string;
  language: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
  sections: any[];
  requirements: any[];
  learnObjectives: any[];
  targetAudience: any[];
}

export default function EditCoursePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [imageUrl, setImageUrl] = useState("");
  const [level, setLevel] = useState("ALL_LEVELS");
  const [language, setLanguage] = useState("pt-br");

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/instructor/courses/${courseId}`);
      if (!response.ok) throw new Error("Erro ao carregar curso");

      const data = await response.json();
      setCourse(data);
      setTitle(data.title);
      setDescription(data.description || "");
      setPrice(data.price.toString());
      setImageUrl(data.imageUrl || "");
      setLevel(data.level);
      setLanguage(data.language);
    } catch (error) {
      console.error("Erro ao carregar curso:", error);
      alert("Erro ao carregar curso");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/instructor/courses/${courseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          price: parseFloat(price),
          imageUrl,
          level,
          language,
        }),
      });

      if (!response.ok) throw new Error("Erro ao salvar curso");

      const updatedCourse = await response.json();
      setCourse(updatedCourse);
      alert("Curso salvo com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar curso:", error);
      alert("Erro ao salvar curso");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!course) return;

    // Validações antes de publicar
    if (!title || !description || !imageUrl) {
      alert(
        "Por favor, preencha todos os campos obrigatórios (título, descrição e imagem)"
      );
      return;
    }

    if (course.sections.length === 0) {
      alert("Adicione pelo menos uma seção ao curso antes de publicar");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/instructor/courses/${courseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isPublished: !course.isPublished,
        }),
      });

      if (!response.ok) throw new Error("Erro ao publicar curso");

      const updatedCourse = await response.json();
      setCourse(updatedCourse);
      alert(
        updatedCourse.isPublished
          ? "Curso publicado com sucesso!"
          : "Curso despublicado"
      );
    } catch (error) {
      console.error("Erro ao publicar curso:", error);
      alert("Erro ao publicar curso");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Tem certeza que deseja deletar este curso? Esta ação não pode ser desfeita."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/instructor/courses/${courseId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao deletar curso");
      }

      alert("Curso deletado com sucesso!");
      router.push("/instructor/courses");
    } catch (error: any) {
      console.error("Erro ao deletar curso:", error);
      alert(error.message || "Erro ao deletar curso");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-xl mb-4">Curso não encontrado</p>
        <Link href="/instructor/courses">
          <Button>Voltar para Meus Cursos</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/instructor/courses">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{course.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              {course.isPublished ? (
                <Badge className="bg-green-500">Publicado</Badge>
              ) : (
                <Badge variant="secondary">Rascunho</Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {course.sections.length} seções
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
          <Button onClick={handlePublish} disabled={isSaving}>
            <Eye className="mr-2 h-4 w-4" />
            {course.isPublished ? "Despublicar" : "Publicar"}
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("basic")}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === "basic"
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings className="inline h-4 w-4 mr-2" />
            Configurações Básicas
          </button>
          <button
            onClick={() => setActiveTab("curriculum")}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === "curriculum"
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="inline h-4 w-4 mr-2" />
            Currículo
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "basic" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Título <span className="text-red-500">*</span>
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título do curso"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Descrição <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o que os alunos aprenderão neste curso..."
                  className="w-full min-h-[150px] rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nível</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="ALL_LEVELS">Todos os Níveis</option>
                  <option value="BEGINNER">Iniciante</option>
                  <option value="INTERMEDIATE">Intermediário</option>
                  <option value="ADVANCED">Avançado</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Idioma</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="pt-br">Português (BR)</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Imagem de Capa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    URL da Imagem <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://exemplo.com/imagem.jpg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Recomendado: 1280x720px (16:9)
                  </p>
                </div>
                {imageUrl && (
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "";
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Preço
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Preço (R$)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Você receberá 70% do valor (taxa da plataforma: 30%)
                  </p>
                  {parseFloat(price) > 0 && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium">Seus ganhos por venda:</p>
                      <p className="text-2xl font-bold text-primary">
                        R$ {(parseFloat(price) * 0.7).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "curriculum" && (
        <Card>
          <CardHeader>
            <CardTitle>Currículo do Curso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                Construa o currículo do seu curso
              </h3>
              <p className="text-muted-foreground mb-6">
                Organize seu conteúdo em seções e aulas. Use drag-and-drop para
                reordenar.
              </p>
              <Link href={`/instructor/courses/${courseId}/curriculum`}>
                <Button>Gerenciar Currículo</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
