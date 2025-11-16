import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const coupons = await db.coupon.findMany({
      where: {
        instructorId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        course: {
          select: {
            title: true,
          },
        },
      },
    });

    return NextResponse.json(coupons);
  } catch (error) {
    console.error("Erro ao buscar cupons:", error);
    return NextResponse.json(
      { error: "Erro ao buscar cupons" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await req.json();
    const { code, discountType, value, expiresAt, maxUses, courseId } = body;

    if (!code || !discountType || !value) {
      return NextResponse.json(
        { error: "Campos obrigatórios: code, discountType, value" },
        { status: 400 }
      );
    }

    // Verificar se o código já existe
    const existingCoupon = await db.coupon.findUnique({
      where: { code },
    });

    if (existingCoupon) {
      return NextResponse.json(
        { error: "Código de cupom já existe" },
        { status: 400 }
      );
    }

    const coupon = await db.coupon.create({
      data: {
        code: code.toUpperCase(),
        discountType,
        value: parseFloat(value),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxUses: maxUses ? parseInt(maxUses) : null,
        instructorId: session.user.id,
        courseId: courseId || null,
      },
    });

    return NextResponse.json(coupon, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar cupom:", error);
    return NextResponse.json(
      { error: "Erro ao criar cupom" },
      { status: 500 }
    );
  }
}
