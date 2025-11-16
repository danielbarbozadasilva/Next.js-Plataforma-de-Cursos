// Configuração básica do Socket.io para mensagens em tempo real
// Para uso em produção, você precisará configurar um servidor Socket.io separado

import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";

export const setupSocketIO = (httpServer: HTTPServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Cliente conectado:", socket.id);

    // Entrar em uma sala de chat
    socket.on("join_chat", (chatId: string) => {
      socket.join(chatId);
      console.log(`Socket ${socket.id} entrou no chat ${chatId}`);
    });

    // Enviar mensagem
    socket.on("send_message", (data: { chatId: string; message: any }) => {
      io.to(data.chatId).emit("new_message", data.message);
    });

    // Notificar que está digitando
    socket.on("typing", (data: { chatId: string; userId: string }) => {
      socket.to(data.chatId).emit("user_typing", data.userId);
    });

    // Parar de digitar
    socket.on("stop_typing", (data: { chatId: string; userId: string }) => {
      socket.to(data.chatId).emit("user_stop_typing", data.userId);
    });

    // Desconectar
    socket.on("disconnect", () => {
      console.log("Cliente desconectado:", socket.id);
    });
  });

  return io;
};

// Hook para uso no cliente (React)
export const useSocket = () => {
  // TODO: Implementar hook React para conectar ao Socket.io
  // Exemplo usando socket.io-client
  /*
  import { io } from 'socket.io-client';

  const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000');

  return socket;
  */
};
