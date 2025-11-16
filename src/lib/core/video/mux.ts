/**
 * Serviço de Vídeo - Mux
 *
 * Gerencia upload, transcoding e streaming de vídeos com HLS
 * Suporta múltiplas qualidades e DRM opcional
 */

import Mux from "@mux/mux-node";
import { db } from "@/lib/db";
import { VideoProcessingStatus } from "@prisma/client";

// Inicializa o cliente Mux
const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

/**
 * Interface para resposta de upload
 */
export interface VideoUploadResponse {
  uploadUrl: string;
  assetId: string;
}

/**
 * Interface para informações de vídeo
 */
export interface VideoInfo {
  playbackId: string;
  duration: number;
  status: string;
  aspectRatio: string;
  maxStoredResolution: string;
  maxStoredFrameRate: number;
}

/**
 * Cria um upload direto para Mux
 * Retorna URL para upload do vídeo do cliente
 */
export async function createDirectUpload(
  lessonId: string,
  corsOrigin?: string
): Promise<VideoUploadResponse> {
  try {
    // Cria o upload direto no Mux
    const upload = await mux.video.uploads.create({
      cors_origin: corsOrigin || process.env.APP_URL || "http://localhost:3000",
      new_asset_settings: {
        playback_policy: ["public"], // ou "signed" para vídeos privados com DRM
        mp4_support: "standard", // Permite download de MP4 para qualidade padrão
        // Configurações de qualidade
        encoding_tier: "smart", // Otimiza automaticamente baseado no conteúdo
        // Normaliza áudio
        normalize_audio: true,
        // Gera thumbnails automaticamente
        master_access: "temporary",
        passthrough: lessonId, // ID da aula para referência
      },
    });

    return {
      uploadUrl: upload.url,
      assetId: upload.asset_id || "",
    };
  } catch (error) {
    console.error("Error creating Mux direct upload:", error);
    throw new Error("Failed to create video upload");
  }
}

/**
 * Cria um asset a partir de uma URL (vídeo já hospedado em S3, por exemplo)
 */
export async function createAssetFromUrl(
  videoUrl: string,
  lessonId: string
): Promise<string> {
  try {
    const asset = await mux.video.assets.create({
      input: [{ url: videoUrl }],
      playback_policy: ["public"],
      mp4_support: "standard",
      encoding_tier: "smart",
      normalize_audio: true,
      passthrough: lessonId,
    });

    // Atualiza o banco de dados
    await db.videoData.upsert({
      where: { lessonId },
      create: {
        lessonId,
        processingStatus: VideoProcessingStatus.PROCESSING,
      },
      update: {
        processingStatus: VideoProcessingStatus.PROCESSING,
      },
    });

    return asset.id;
  } catch (error) {
    console.error("Error creating Mux asset from URL:", error);
    throw new Error("Failed to create video asset");
  }
}

/**
 * Obtém informações do vídeo
 */
export async function getVideoInfo(assetId: string): Promise<VideoInfo | null> {
  try {
    const asset = await mux.video.assets.retrieve(assetId);

    if (!asset.playback_ids || asset.playback_ids.length === 0) {
      return null;
    }

    return {
      playbackId: asset.playback_ids[0].id,
      duration: asset.duration || 0,
      status: asset.status || "unknown",
      aspectRatio: asset.aspect_ratio || "16:9",
      maxStoredResolution: asset.max_stored_resolution || "HD",
      maxStoredFrameRate: asset.max_stored_frame_rate || 30,
    };
  } catch (error) {
    console.error("Error getting video info from Mux:", error);
    return null;
  }
}

/**
 * Processa webhook do Mux
 * Atualiza status de processamento do vídeo
 */
export async function handleMuxWebhook(
  eventType: string,
  data: any
): Promise<void> {
  try {
    console.log(`Processing Mux webhook: ${eventType}`);

    switch (eventType) {
      case "video.asset.ready": {
        // Vídeo pronto para reprodução
        const assetId = data.id;
        const passthrough = data.passthrough; // lessonId

        if (!passthrough) {
          console.error("No passthrough (lessonId) found in webhook");
          return;
        }

        // Busca informações do vídeo
        const videoInfo = await getVideoInfo(assetId);

        if (!videoInfo) {
          throw new Error("Failed to get video info");
        }

        // Atualiza o banco de dados
        await db.videoData.upsert({
          where: { lessonId: passthrough },
          create: {
            lessonId: passthrough,
            playbackId: videoInfo.playbackId,
            duration: videoInfo.duration,
            processingStatus: VideoProcessingStatus.SUCCESS,
          },
          update: {
            playbackId: videoInfo.playbackId,
            duration: videoInfo.duration,
            processingStatus: VideoProcessingStatus.SUCCESS,
          },
        });

        console.log(`Video processed successfully for lesson ${passthrough}`);
        break;
      }

      case "video.asset.errored": {
        // Erro no processamento
        const passthrough = data.passthrough;

        if (passthrough) {
          await db.videoData.update({
            where: { lessonId: passthrough },
            data: {
              processingStatus: VideoProcessingStatus.FAILED,
            },
          });

          console.error(`Video processing failed for lesson ${passthrough}`);
        }
        break;
      }

      case "video.asset.created":
      case "video.asset.updated": {
        // Asset criado ou atualizado
        console.log(`Asset ${data.id} ${eventType}`);
        break;
      }

      default:
        console.log(`Unhandled Mux event: ${eventType}`);
    }
  } catch (error) {
    console.error("Error handling Mux webhook:", error);
    throw error;
  }
}

/**
 * Deleta um vídeo do Mux
 */
export async function deleteVideo(assetId: string): Promise<void> {
  try {
    await mux.video.assets.delete(assetId);
    console.log(`Video asset deleted from Mux: ${assetId}`);
  } catch (error) {
    console.error("Error deleting video from Mux:", error);
    throw new Error("Failed to delete video");
  }
}

/**
 * Gera URL de playback (streaming HLS)
 */
export function getPlaybackUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

/**
 * Gera URL de thumbnail
 */
export function getThumbnailUrl(
  playbackId: string,
  options?: {
    time?: number; // Tempo em segundos para capturar o thumbnail
    width?: number;
    height?: number;
    fitMode?: "preserve" | "crop" | "smartcrop" | "pad";
  }
): string {
  const params = new URLSearchParams();

  if (options?.time !== undefined) {
    params.append("time", options.time.toString());
  }
  if (options?.width) {
    params.append("width", options.width.toString());
  }
  if (options?.height) {
    params.append("height", options.height.toString());
  }
  if (options?.fitMode) {
    params.append("fit_mode", options.fitMode);
  }

  const queryString = params.toString();
  return `https://image.mux.com/${playbackId}/thumbnail.jpg${
    queryString ? `?${queryString}` : ""
  }`;
}

/**
 * Gera URL assinada para vídeos privados (DRM)
 * Requer playback policy "signed"
 */
export async function getSignedPlaybackUrl(
  playbackId: string,
  expiresIn = 3600
): Promise<string> {
  try {
    // Importa o SDK de assinatura do Mux
    const jwt = require("jsonwebtoken");

    if (!process.env.MUX_TOKEN_SECRET) {
      throw new Error("MUX_TOKEN_SECRET not configured");
    }

    // Cria o token JWT
    const token = jwt.sign(
      {
        sub: playbackId,
        aud: "v", // audience: video
        exp: Math.floor(Date.now() / 1000) + expiresIn,
      },
      Buffer.from(process.env.MUX_TOKEN_SECRET, "base64")
    );

    return `https://stream.mux.com/${playbackId}.m3u8?token=${token}`;
  } catch (error) {
    console.error("Error generating signed playback URL:", error);
    throw new Error("Failed to generate signed playback URL");
  }
}

/**
 * Obtém estatísticas de visualização de um vídeo
 */
export async function getVideoAnalytics(playbackId: string) {
  try {
    // Mux Data API para analytics
    const views = await mux.data.metrics.breakdown("views", {
      filters: [`playback_id:${playbackId}`],
      timeframe: ["7:days"],
    });

    return views;
  } catch (error) {
    console.error("Error getting video analytics:", error);
    return null;
  }
}
