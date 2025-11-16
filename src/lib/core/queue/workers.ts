/**
 * Workers para processar jobs das filas
 *
 * Execute este arquivo separadamente: node --loader ts-node/esm workers.ts
 * Ou use um process manager como PM2
 */

import { Worker, Job } from "bullmq";
import { createRedisConnection } from "./redis";
import {
  VideoProcessingJob,
  VideoDeleteJob,
  EmailJob,
  BulkEmailJob,
  NotificationJob,
  CertificateGenerationJob,
} from "./queues";
import { createAssetFromUrl, deleteVideo } from "../video/mux";
import { deleteFile } from "../storage/s3";
import { db } from "@/lib/db";

const connection = createRedisConnection();
const CONCURRENCY = parseInt(process.env.BULLMQ_CONCURRENCY || "5");

/**
 * Worker de processamento de vídeo
 */
export const videoWorker = new Worker<VideoProcessingJob>(
  "video-processing",
  async (job: Job<VideoProcessingJob>) => {
    const { lessonId, videoUrl, instructorId } = job.data;

    console.log(`Processing video for lesson ${lessonId}...`);

    try {
      // Atualiza o progresso
      await job.updateProgress(10);

      // Cria o asset no Mux
      const assetId = await createAssetFromUrl(videoUrl, lessonId);

      await job.updateProgress(50);

      // Salva o asset ID no banco
      await db.videoData.upsert({
        where: { lessonId },
        create: {
          lessonId,
          storageKey: videoUrl,
        },
        update: {
          storageKey: videoUrl,
        },
      });

      await job.updateProgress(100);

      console.log(`✅ Video processed for lesson ${lessonId}`);

      // TODO: Enviar notificação ao instrutor
      return { success: true, assetId };
    } catch (error) {
      console.error(`Error processing video for lesson ${lessonId}:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 2, // Processa 2 vídeos por vez (limitado pelo Mux)
  }
);

/**
 * Worker de exclusão de vídeo
 */
export const videoDeleteWorker = new Worker<VideoDeleteJob>(
  "video-delete",
  async (job: Job<VideoDeleteJob>) => {
    const { assetId, storageKey } = job.data;

    console.log(`Deleting video asset ${assetId}...`);

    try {
      // Deleta do Mux
      if (assetId) {
        await deleteVideo(assetId);
      }

      // Deleta do S3
      if (storageKey) {
        await deleteFile(storageKey);
      }

      console.log(`✅ Video deleted: ${assetId}`);
      return { success: true };
    } catch (error) {
      console.error(`Error deleting video ${assetId}:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: CONCURRENCY,
  }
);

/**
 * Worker de e-mail
 */
export const emailWorker = new Worker<EmailJob>(
  "email",
  async (job: Job<EmailJob>) => {
    const { to, subject, template, data } = job.data;

    console.log(`Sending email to ${to}...`);

    try {
      // TODO: Implementar envio de e-mail usando SendGrid/Resend
      // await sendEmail(to, subject, template, data);

      console.log(`✅ Email sent to ${to}`);
      return { success: true };
    } catch (error) {
      console.error(`Error sending email to ${to}:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: CONCURRENCY,
  }
);

/**
 * Worker de e-mail em massa
 */
export const bulkEmailWorker = new Worker<BulkEmailJob>(
  "bulk-email",
  async (job: Job<BulkEmailJob>) => {
    const { recipients, subject, template, data } = job.data;

    console.log(`Sending bulk email to ${recipients.length} recipients...`);

    try {
      // TODO: Implementar envio de e-mail em massa
      // Pode dividir em batches para não sobrecarregar o serviço

      console.log(`✅ Bulk email sent to ${recipients.length} recipients`);
      return { success: true, sent: recipients.length };
    } catch (error) {
      console.error(`Error sending bulk email:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 1, // Processa um de cada vez
  }
);

/**
 * Worker de notificações
 */
export const notificationWorker = new Worker<NotificationJob>(
  "notification",
  async (job: Job<NotificationJob>) => {
    const { userId, type, title, message, data } = job.data;

    console.log(`Sending notification to user ${userId}...`);

    try {
      // TODO: Implementar sistema de notificações in-app
      // Pode usar Socket.io para enviar notificação em tempo real

      console.log(`✅ Notification sent to user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error(`Error sending notification to user ${userId}:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: CONCURRENCY,
  }
);

/**
 * Worker de geração de certificados
 */
export const certificateWorker = new Worker<CertificateGenerationJob>(
  "certificate",
  async (job: Job<CertificateGenerationJob>) => {
    const { userId, courseId } = job.data;

    console.log(`Generating certificate for user ${userId}, course ${courseId}...`);

    try {
      // Verifica se o aluno completou 100% do curso
      const course = await db.course.findUnique({
        where: { id: courseId },
        include: {
          sections: {
            include: {
              lessons: true,
            },
          },
        },
      });

      if (!course) {
        throw new Error("Course not found");
      }

      // Conta total de aulas
      const totalLessons = course.sections.reduce(
        (sum, section) => sum + section.lessons.length,
        0
      );

      // Conta aulas completadas pelo aluno
      const completedLessons = await db.completedLesson.count({
        where: {
          userId,
          lesson: {
            section: {
              courseId,
            },
          },
        },
      });

      // Verifica se completou 100%
      if (completedLessons < totalLessons) {
        throw new Error(`Course not completed yet (${completedLessons}/${totalLessons})`);
      }

      // Gera código de verificação único
      const verificationCode = `CERT-${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)
        .toUpperCase()}`;

      // Cria o certificado
      const certificate = await db.certificate.create({
        data: {
          userId,
          courseId,
          verificationCode,
        },
      });

      console.log(`✅ Certificate generated: ${certificate.id}`);

      // TODO: Enviar e-mail com o certificado
      // TODO: Gerar PDF do certificado

      return { success: true, certificateId: certificate.id };
    } catch (error) {
      console.error(
        `Error generating certificate for user ${userId}, course ${courseId}:`,
        error
      );
      throw error;
    }
  },
  {
    connection,
    concurrency: CONCURRENCY,
  }
);

/**
 * Event listeners para todos os workers
 */

const workers = [
  { name: "Video", worker: videoWorker },
  { name: "VideoDelete", worker: videoDeleteWorker },
  { name: "Email", worker: emailWorker },
  { name: "BulkEmail", worker: bulkEmailWorker },
  { name: "Notification", worker: notificationWorker },
  { name: "Certificate", worker: certificateWorker },
];

workers.forEach(({ name, worker }) => {
  worker.on("completed", (job) => {
    console.log(`✅ [${name}] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`❌ [${name}] Job ${job?.id} failed:`, err.message);
  });

  worker.on("error", (err) => {
    console.error(`❌ [${name}] Worker error:`, err);
  });
});

console.log("🚀 All workers started");

/**
 * Graceful shutdown
 */
process.on("SIGTERM", async () => {
  console.log("📴 Shutting down workers...");

  await Promise.all(workers.map(({ worker }) => worker.close()));

  console.log("✅ Workers shut down gracefully");
  process.exit(0);
});
