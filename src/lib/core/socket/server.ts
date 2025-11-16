/**
 * Servidor Socket.io com Autenticação e Rooms
 *
 * Gerencia comunicação em tempo real para chat e notificações
 */

import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { db } from "@/lib/db";
import { redis } from "../queue/redis";

// Interface para socket autenticado
interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

/**
 * Configura e retorna o servidor Socket.io
 */
export function setupSocketIO(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ALLOWED_ORIGINS?.split(",") || [
        "http://localhost:3000",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: process.env.SOCKET_IO_PATH || "/socket.io",
  });

  // Middleware de autenticação
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const userId = socket.handshake.auth.userId;
      const token = socket.handshake.auth.token; // JWT token opcional

      if (!userId) {
        return next(new Error("Authentication required"));
      }

      // Verifica se o usuário existe
      const user = await db.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return next(new Error("User not found"));
      }

      // Anexa informações do usuário ao socket
      socket.userId = user.id;
      socket.userRole = user.role;

      // Armazena o socket ID do usuário no Redis (para enviar notificações)
      await redis.set(`socket:${user.id}`, socket.id, "EX", 86400); // 24h

      next();
    } catch (error) {
      console.error("Socket authentication error:", error);
      next(new Error("Authentication failed"));
    }
  });

  // Evento de conexão
  io.on("connection", (socket: AuthenticatedSocket) => {
    console.log(`✅ User ${socket.userId} connected (${socket.id})`);

    // Entra automaticamente na room do próprio usuário (para notificações)
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // ==========================================
    // CHAT EVENTS
    // ==========================================

    /**
     * Entrar em uma sala de chat
     * Room format: chat:{chatId}
     */
    socket.on("join_chat", async (chatId: string) => {
      try {
        // Verifica se o usuário é participante deste chat
        const participant = await db.chatParticipant.findFirst({
          where: {
            chatId,
            userId: socket.userId,
          },
        });

        if (!participant) {
          socket.emit("error", { message: "Not a participant of this chat" });
          return;
        }

        socket.join(`chat:${chatId}`);
        console.log(`User ${socket.userId} joined chat ${chatId}`);

        socket.emit("chat_joined", { chatId });
      } catch (error) {
        console.error("Error joining chat:", error);
        socket.emit("error", { message: "Failed to join chat" });
      }
    });

    /**
     * Sair de uma sala de chat
     */
    socket.on("leave_chat", (chatId: string) => {
      socket.leave(`chat:${chatId}`);
      console.log(`User ${socket.userId} left chat ${chatId}`);
    });

    /**
     * Enviar mensagem no chat
     */
    socket.on("send_message", async (data: {
      chatId: string;
      content: string;
    }) => {
      try {
        // Cria a mensagem no banco
        const message = await db.chatMessage.create({
          data: {
            chatId: data.chatId,
            senderId: socket.userId!,
            content: data.content,
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
        });

        // Atualiza timestamp do chat
        await db.chat.update({
          where: { id: data.chatId },
          data: { updatedAt: new Date() },
        });

        // Emite para todos na sala do chat
        io.to(`chat:${data.chatId}`).emit("new_message", message);

        console.log(`Message sent in chat ${data.chatId} by ${socket.userId}`);
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    /**
     * Usuário está digitando
     */
    socket.on("typing", (data: { chatId: string }) => {
      socket.to(`chat:${data.chatId}`).emit("user_typing", {
        userId: socket.userId,
        chatId: data.chatId,
      });
    });

    /**
     * Usuário parou de digitar
     */
    socket.on("stop_typing", (data: { chatId: string }) => {
      socket.to(`chat:${data.chatId}`).emit("user_stop_typing", {
        userId: socket.userId,
        chatId: data.chatId,
      });
    });

    /**
     * Marcar mensagem como lida
     */
    socket.on("mark_as_read", async (data: { messageId: string }) => {
      try {
        await db.chatMessage.update({
          where: { id: data.messageId },
          data: { readAt: new Date() },
        });

        socket.emit("message_read", { messageId: data.messageId });
      } catch (error) {
        console.error("Error marking message as read:", error);
      }
    });

    // ==========================================
    // NOTIFICATION EVENTS
    // ==========================================

    /**
     * Cliente solicita todas as notificações não lidas
     */
    socket.on("get_notifications", async () => {
      try {
        // TODO: Implementar sistema de notificações no banco
        // Por enquanto, retorna array vazio
        socket.emit("notifications", []);
      } catch (error) {
        console.error("Error getting notifications:", error);
      }
    });

    /**
     * Marcar notificação como lida
     */
    socket.on("mark_notification_read", async (notificationId: string) => {
      try {
        // TODO: Implementar marcação de notificação como lida
        socket.emit("notification_read", { notificationId });
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    });

    // ==========================================
    // VIDEO EVENTS (Opcional - Watch Party)
    // ==========================================

    /**
     * Sincronizar reprodução de vídeo entre usuários
     * Útil para aulas ao vivo ou watch parties
     */
    socket.on("video_play", (data: { lessonId: string; timestamp: number }) => {
      socket.to(`lesson:${data.lessonId}`).emit("video_play", data);
    });

    socket.on("video_pause", (data: { lessonId: string; timestamp: number }) => {
      socket.to(`lesson:${data.lessonId}`).emit("video_pause", data);
    });

    socket.on("video_seek", (data: { lessonId: string; timestamp: number }) => {
      socket.to(`lesson:${data.lessonId}`).emit("video_seek", data);
    });

    // ==========================================
    // DISCONNECT
    // ==========================================

    socket.on("disconnect", async () => {
      console.log(`❌ User ${socket.userId} disconnected (${socket.id})`);

      // Remove socket ID do Redis
      if (socket.userId) {
        await redis.del(`socket:${socket.userId}`);
      }
    });

    // Tratamento de erros
    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  });

  return io;
}

/**
 * Helpers para enviar notificações
 */

/**
 * Envia notificação para um usuário específico
 */
export async function sendNotificationToUser(
  io: SocketIOServer,
  userId: string,
  notification: {
    type: string;
    title: string;
    message: string;
    data?: any;
  }
): Promise<void> {
  io.to(`user:${userId}`).emit("notification", {
    ...notification,
    timestamp: new Date().toISOString(),
  });

  console.log(`Notification sent to user ${userId}`);
}

/**
 * Envia notificação para múltiplos usuários
 */
export async function sendNotificationToUsers(
  io: SocketIOServer,
  userIds: string[],
  notification: {
    type: string;
    title: string;
    message: string;
    data?: any;
  }
): Promise<void> {
  userIds.forEach((userId) => {
    io.to(`user:${userId}`).emit("notification", {
      ...notification,
      timestamp: new Date().toISOString(),
    });
  });

  console.log(`Notification sent to ${userIds.length} users`);
}

/**
 * Envia broadcast para todos os usuários conectados
 */
export async function sendBroadcast(
  io: SocketIOServer,
  notification: {
    type: string;
    title: string;
    message: string;
    data?: any;
  }
): Promise<void> {
  io.emit("notification", {
    ...notification,
    timestamp: new Date().toISOString(),
  });

  console.log("Broadcast notification sent to all users");
}
