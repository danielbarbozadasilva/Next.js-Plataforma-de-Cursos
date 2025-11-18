import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ couponId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { couponId } = await params;

    const coupon = await db.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      return NextResponse.json({ error: "Cupom não encontrado" }, { status: 404 });
    }

    // Verificar se o cupom pertence ao instrutor
    if (coupon.instructorId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await req.json();
    const { code, discountType, value, expiresAt, maxUses, isActive } = body;

    // Se estiver mudando o código, verificar se não existe outro com o mesmo código
    if (code && code !== coupon.code) {
      const existingCoupon = await db.coupon.findUnique({
        where: { code: code.toUpperCase() },
      });

      if (existingCoupon) {
        return NextResponse.json(
          { error: "Código de cupom já existe" },
          { status: 400 }
        );
      }
    }

    const updatedCoupon = await db.coupon.update({
      where: { id: couponId },
      data: {
        ...(code !== undefined && { code: code.toUpperCase() }),
        ...(discountType !== undefined && { discountType }),
        ...(value !== undefined && { value: parseFloat(value) }),
        ...(expiresAt !== undefined && {
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        }),
        ...(maxUses !== undefined && {
          maxUses: maxUses ? parseInt(maxUses) : null,
        }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(updatedCoupon);
  } catch (error) {
    console.error("Erro ao atualizar cupom:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar cupom" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ couponId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { couponId } = await params;

    const coupon = await db.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      return NextResponse.json({ error: "Cupom não encontrado" }, { status: 404 });
    }

    // Verificar se o cupom pertence ao instrutor
    if (coupon.instructorId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    await db.coupon.delete({
      where: { id: couponId },
    });

    return NextResponse.json({ message: "Cupom deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar cupom:", error);
    return NextResponse.json(
      { error: "Erro ao deletar cupom" },
      { status: 500 }
    );
  }
}
