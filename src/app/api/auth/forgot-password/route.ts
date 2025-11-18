import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import crypto from "crypto";

const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = forgotPasswordSchema.parse(body);

    // Verificar se o usuário existe
    const user = await db.user.findUnique({
      where: { email },
    });

    // Por segurança, sempre retornar sucesso mesmo que o email não exista
    if (!user) {
      return NextResponse.json({
        message: "Se o email existir, um link de recuperação será enviado",
      });
    }

    // Gerar token de recuperação
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 hora

    // Salvar token no banco
    await db.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    // TODO: Enviar email com o link de recuperação
    // Link: /auth/reset-password?token=${token}
    // Por enquanto, vamos apenas logar o token (em produção, enviar email)
    console.log(`Token de recuperação para ${email}: ${token}`);

    return NextResponse.json({
      message: "Se o email existir, um link de recuperação será enviado",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Email inválido", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Erro ao processar recuperação de senha:", error);
    return NextResponse.json(
      { error: "Erro ao processar solicitação" },
      { status: 500 }
    );
  }
}
