import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ certificateId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { certificateId } = await params;

    const certificate = await db.certificate.findUnique({
      where: {
        id: certificateId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            instructor: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificado não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se o certificado pertence ao usuário autenticado
    if (certificate.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Você não tem permissão para acessar este certificado" },
        { status: 403 }
      );
    }

    return NextResponse.json({ certificate });
  } catch (error) {
    console.error("Erro ao buscar certificado:", error);
    return NextResponse.json(
      { error: "Erro ao buscar certificado" },
      { status: 500 }
    );
  }
}

// GET PDF - Gerar PDF do certificado
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ certificateId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { certificateId } = await params;

    const certificate = await db.certificate.findUnique({
      where: {
        id: certificateId,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        course: {
          select: {
            title: true,
            instructor: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificado não encontrado" },
        { status: 404 }
      );
    }

    if (certificate.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Você não tem permissão para acessar este certificado" },
        { status: 403 }
      );
    }

    // TODO: Implementar geração de PDF real
    // Por enquanto, retornar dados do certificado para geração no front-end
    const certificateData = {
      studentName: certificate.user.name,
      courseName: certificate.course.title,
      instructorName: certificate.course.instructor.name,
      issuedDate: certificate.issuedAt,
      verificationCode: certificate.verificationCode,
    };

    return NextResponse.json({
      message: "Dados do certificado",
      certificate: certificateData,
      downloadUrl: `/api/student/certificates/${certificateId}/download`, // Implementar endpoint de download
    });
  } catch (error) {
    console.error("Erro ao gerar certificado:", error);
    return NextResponse.json(
      { error: "Erro ao gerar certificado" },
      { status: 500 }
    );
  }
}
