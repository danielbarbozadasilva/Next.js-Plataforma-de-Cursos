import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Esta é uma implementação básica de upload
// Para produção, você deve integrar com serviços como AWS S3, Cloudinary, etc.

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    // Validações
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Arquivo muito grande (máximo 500MB)" },
        { status: 400 }
      );
    }

    // Tipos de arquivo permitidos
    const allowedTypes = [
      "video/mp4",
      "video/webm",
      "application/pdf",
      "application/zip",
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de arquivo não permitido" },
        { status: 400 }
      );
    }

    // TODO: Implementar upload real para S3, Cloudinary, etc.
    // Por enquanto, retorna uma URL de placeholder

    const fileName = `${Date.now()}_${file.name}`;
    const fileUrl = `https://storage.example.com/uploads/${fileName}`;

    // Se for vídeo, criar registro de processamento
    if (file.type.startsWith("video/")) {
      // TODO: Criar registro VideoData e iniciar processamento em background
      // Pode usar services como Mux, AWS MediaConvert, etc.
    }

    return NextResponse.json({
      url: fileUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      message:
        "Upload simulado com sucesso. Integre com serviço de storage real para produção.",
    });
  } catch (error) {
    console.error("Erro ao fazer upload:", error);
    return NextResponse.json(
      { error: "Erro ao fazer upload" },
      { status: 500 }
    );
  }
}
