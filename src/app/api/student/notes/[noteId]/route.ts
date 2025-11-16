import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const updateNoteSchema = z.object({
  content: z.string().min(1, "Conteúdo é obrigatório"),
  timestamp: z.number().optional(),
});

// PUT - Atualizar nota
export async function PUT(
  req: NextRequest,
  { params }: { params: { noteId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { noteId } = params;
    const body = await req.json();
    const { content, timestamp } = updateNoteSchema.parse(body);

    // Verificar se a nota existe e pertence ao usuário
    const note = await db.note.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      return NextResponse.json(
        { error: "Nota não encontrada" },
        { status: 404 }
      );
    }

    if (note.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Você não tem permissão para editar esta nota" },
        { status: 403 }
      );
    }

    const updatedNote = await db.note.update({
      where: { id: noteId },
      data: {
        content,
        timestamp,
      },
    });

    return NextResponse.json({
      message: "Nota atualizada com sucesso",
      note: updatedNote,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Erro ao atualizar nota:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar nota" },
      { status: 500 }
    );
  }
}

// DELETE - Deletar nota
export async function DELETE(
  req: NextRequest,
  { params }: { params: { noteId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { noteId } = params;

    // Verificar se a nota existe e pertence ao usuário
    const note = await db.note.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      return NextResponse.json(
        { error: "Nota não encontrada" },
        { status: 404 }
      );
    }

    if (note.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Você não tem permissão para deletar esta nota" },
        { status: 403 }
      );
    }

    await db.note.delete({
      where: { id: noteId },
    });

    return NextResponse.json({
      message: "Nota deletada com sucesso",
    });
  } catch (error) {
    console.error("Erro ao deletar nota:", error);
    return NextResponse.json(
      { error: "Erro ao deletar nota" },
      { status: 500 }
    );
  }
}
