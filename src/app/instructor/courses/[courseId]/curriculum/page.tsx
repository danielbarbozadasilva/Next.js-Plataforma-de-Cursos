"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Plus,
  GripVertical,
  Edit,
  Trash2,
  Video,
  FileText,
  Paperclip,
  Eye,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Lesson {
  id: string;
  title: string;
  order: number;
  isFreePreview: boolean;
  sectionId: string;
}

interface Section {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  sections: Section[];
}

// Componente de Aula Arrastável
function SortableLesson({ lesson, sectionId, onEdit, onDelete }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-card border rounded-lg hover:border-primary/50 transition-colors"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{lesson.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <Video className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Aula {lesson.order + 1}</span>
          {lesson.isFreePreview && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
              Preview Grátis
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onEdit(lesson)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(lesson.id)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

// Componente de Seção Arrastável
function SortableSection({
  section,
  onEditSection,
  onDeleteSection,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card>
        <CardContent className="p-4">
          {/* Header da Seção */}
          <div className="flex items-center gap-3 mb-4">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{section.title}</h3>
              <p className="text-xs text-muted-foreground">
                Seção {section.order + 1} • {section.lessons.length} aula(s)
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEditSection(section)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDeleteSection(section.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>

          {/* Lista de Aulas */}
          <div className="space-y-2 ml-8">
            {section.lessons.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma aula nesta seção
              </p>
            ) : (
              <SortableContext
                items={section.lessons.map((l: Lesson) => l.id)}
                strategy={verticalListSortingStrategy}
              >
                {section.lessons.map((lesson: Lesson) => (
                  <SortableLesson
                    key={lesson.id}
                    lesson={lesson}
                    sectionId={section.id}
                    onEdit={onEditLesson}
                    onDelete={onDeleteLesson}
                  />
                ))}
              </SortableContext>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onAddLesson(section.id)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Aula
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CurriculumPage() {
  const params = useParams();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);

  const [sectionTitle, setSectionTitle] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [isFreePreview, setIsFreePreview] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/instructor/courses/${courseId}`);
      if (!response.ok) throw new Error("Erro ao carregar curso");

      const data = await response.json();
      setCourse(data);
    } catch (error) {
      console.error("Erro ao carregar curso:", error);
      alert("Erro ao carregar curso");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !course) {
      return;
    }

    // Aqui você implementaria a lógica de reordenação
    // Por simplicidade, vou apenas exibir um alerta
    alert("Funcionalidade de drag-and-drop será implementada na API");
  };

  const handleAddSection = () => {
    setSectionTitle("");
    setEditingSection(null);
    setShowSectionModal(true);
  };

  const handleEditSection = (section: Section) => {
    setSectionTitle(section.title);
    setEditingSection(section);
    setShowSectionModal(true);
  };

  const handleSaveSection = async () => {
    if (!sectionTitle.trim()) {
      alert("Por favor, insira um título para a seção");
      return;
    }

    try {
      const url = editingSection
        ? `/api/instructor/courses/${courseId}/sections/${editingSection.id}`
        : `/api/instructor/courses/${courseId}/sections`;

      const method = editingSection ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: sectionTitle,
          order: course?.sections.length || 0,
        }),
      });

      if (!response.ok) throw new Error("Erro ao salvar seção");

      setShowSectionModal(false);
      fetchCourse();
    } catch (error) {
      console.error("Erro ao salvar seção:", error);
      alert("Erro ao salvar seção");
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm("Tem certeza que deseja deletar esta seção e todas as suas aulas?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/instructor/courses/${courseId}/sections/${sectionId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Erro ao deletar seção");

      fetchCourse();
    } catch (error) {
      console.error("Erro ao deletar seção:", error);
      alert("Erro ao deletar seção");
    }
  };

  const handleAddLesson = (sectionId: string) => {
    setLessonTitle("");
    setIsFreePreview(false);
    setEditingLesson(null);
    setCurrentSectionId(sectionId);
    setShowLessonModal(true);
  };

  const handleEditLesson = (lesson: Lesson) => {
    setLessonTitle(lesson.title);
    setIsFreePreview(lesson.isFreePreview);
    setEditingLesson(lesson);
    setCurrentSectionId(lesson.sectionId);
    setShowLessonModal(true);
  };

  const handleSaveLesson = async () => {
    if (!lessonTitle.trim() || !currentSectionId) {
      alert("Por favor, insira um título para a aula");
      return;
    }

    try {
      const section = course?.sections.find(s => s.id === currentSectionId);
      const url = editingLesson
        ? `/api/instructor/courses/${courseId}/sections/${currentSectionId}/lessons/${editingLesson.id}`
        : `/api/instructor/courses/${courseId}/sections/${currentSectionId}/lessons`;

      const method = editingLesson ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: lessonTitle,
          isFreePreview,
          order: section?.lessons.length || 0,
        }),
      });

      if (!response.ok) throw new Error("Erro ao salvar aula");

      setShowLessonModal(false);
      fetchCourse();
    } catch (error) {
      console.error("Erro ao salvar aula:", error);
      alert("Erro ao salvar aula");
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("Tem certeza que deseja deletar esta aula?")) {
      return;
    }

    const lesson = course?.sections
      .flatMap(s => s.lessons)
      .find(l => l.id === lessonId);

    if (!lesson) return;

    try {
      const response = await fetch(
        `/api/instructor/courses/${courseId}/sections/${lesson.sectionId}/lessons/${lessonId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Erro ao deletar aula");

      fetchCourse();
    } catch (error) {
      console.error("Erro ao deletar aula:", error);
      alert("Erro ao deletar aula");
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
        <div>
          <Link href={`/instructor/courses/${courseId}`}>
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Currículo do Curso</h1>
          <p className="text-muted-foreground">{course.title}</p>
        </div>
        <Button onClick={handleAddSection}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Seção
        </Button>
      </div>

      {/* Lista de Seções */}
      {course.sections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              Nenhuma seção criada ainda
            </h2>
            <p className="text-muted-foreground text-center mb-6">
              Comece criando seções para organizar o conteúdo do seu curso.
            </p>
            <Button onClick={handleAddSection}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeira Seção
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={course.sections.map(s => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {course.sections.map((section) => (
                <SortableSection
                  key={section.id}
                  section={section}
                  onEditSection={handleEditSection}
                  onDeleteSection={handleDeleteSection}
                  onAddLesson={handleAddLesson}
                  onEditLesson={handleEditLesson}
                  onDeleteLesson={handleDeleteLesson}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Modal de Seção */}
      {showSectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <h2 className="text-xl font-bold">
                {editingSection ? "Editar Seção" : "Nova Seção"}
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Título da Seção</label>
                <Input
                  value={sectionTitle}
                  onChange={(e) => setSectionTitle(e.target.value)}
                  placeholder="Ex: Introdução ao Next.js"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowSectionModal(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSaveSection}>
                  {editingSection ? "Salvar" : "Criar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Aula */}
      {showLessonModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <h2 className="text-xl font-bold">
                {editingLesson ? "Editar Aula" : "Nova Aula"}
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Título da Aula</label>
                <Input
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="Ex: Configurando o ambiente"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="freePreview"
                  checked={isFreePreview}
                  onChange={(e) => setIsFreePreview(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="freePreview" className="text-sm">
                  Permitir pré-visualização gratuita
                </label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowLessonModal(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSaveLesson}>
                  {editingLesson ? "Salvar" : "Criar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
