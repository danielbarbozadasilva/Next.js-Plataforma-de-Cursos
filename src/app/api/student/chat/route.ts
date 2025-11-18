import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

// GET - Buscar conversas do usuário
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    // Buscar todas as conversas do usuário
    const chatParticipations = await db.chatParticipant.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        chat: {
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                    role: true,
                  },
                },
              },
            },
            messages: {
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
              include: {
                sender: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        chat: {
          updatedAt: "desc",
        },
      },
    });

    const chats = chatParticipations.map((cp: any) => ({
      id: cp.chat.id,
      participants: cp.chat.participants.map((p: any) => p.user),
      lastMessage: cp.chat.messages[0] || null,
      updatedAt: cp.chat.updatedAt,
    }));

    return NextResponse.json({ chats });
  } catch (error) {
    console.error("Erro ao buscar conversas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar conversas" },
      { status: 500 }
    );
  }
}

const createChatSchema = z.object({
  instructorId: z.string(),
});

// POST - Criar ou buscar conversa com instrutor
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { instructorId } = createChatSchema.parse(body);

    // Verificar se o instrutor existe
    const instructor = await db.user.findUnique({
      where: { id: instructorId, role: "INSTRUCTOR" },
    });

    if (!instructor) {
      return NextResponse.json(
        { error: "Instrutor não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se já existe uma conversa entre eles
    const existingChat = await db.chat.findFirst({
      where: {
        AND: [
          {
            participants: {
              some: {
                userId: session.user.id,
              },
            },
          },
          {
            participants: {
              some: {
                userId: instructorId,
              },
            },
          },
        ],
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                role: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: "asc",
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (existingChat) {
      return NextResponse.json({ chat: existingChat });
    }

    // Criar nova conversa
    const newChat = await db.chat.create({
      data: {
        participants: {
          create: [
            { userId: session.user.id },
            { userId: instructorId },
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                role: true,
              },
            },
          },
        },
        messages: true,
      },
    });

    return NextResponse.json({
      message: "Conversa criada com sucesso",
      chat: newChat,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Erro ao criar conversa:", error);
    return NextResponse.json(
      { error: "Erro ao criar conversa" },
      { status: 500 }
    );
  }
}
