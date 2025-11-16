import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password } = resetPasswordSchema.parse(body);

    // Verificar se o token existe e não expirou
    const verificationToken = await db.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: "Token inválido ou expirado" },
        { status: 400 }
      );
    }

    if (new Date() > verificationToken.expires) {
      // Deletar token expirado
      await db.verificationToken.delete({
        where: { token },
      });

      return NextResponse.json(
        { error: "Token expirado" },
        { status: 400 }
      );
    }

    // Buscar usuário
    const user = await db.user.findUnique({
      where: { email: verificationToken.identifier },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Hash da nova senha
    const passwordHash = await bcrypt.hash(password, 10);

    // Atualizar senha do usuário
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Deletar o token usado
    await db.verificationToken.delete({
      where: { token },
    });

    return NextResponse.json({
      message: "Senha redefinida com sucesso",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Erro ao redefinir senha:", error);
    return NextResponse.json(
      { error: "Erro ao redefinir senha" },
      { status: 500 }
    );
  }
}
