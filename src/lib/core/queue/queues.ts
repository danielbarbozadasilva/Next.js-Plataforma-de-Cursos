/**
 * Filas de Background Jobs com BullMQ
 *
 * Define filas para processamento assíncrono de tarefas
 */

import { Queue, QueueEvents } from "bullmq";
import { createRedisConnection } from "./redis";

// Configuração de conexão para BullMQ
const connection = createRedisConnection();

// Concorrência padrão dos workers
const CONCURRENCY = parseInt(process.env.BULLMQ_CONCURRENCY || "5");

/**
 * Tipos de jobs disponíveis
 */

// Jobs de vídeo
export interface VideoProcessingJob {
  lessonId: string;
  videoUrl: string;
  instructorId: string;
}

export interface VideoDeleteJob {
  assetId: string;
  storageKey?: string;
}

// Jobs de e-mail
export interface EmailJob {
  to: string | string[];
  subject: string;
  template: string;
  data: Record<string, any>;
}

export interface BulkEmailJob {
  recipients: string[];
  subject: string;
  template: string;
  data: Record<string, any>;
}

// Jobs de notificação
export interface NotificationJob {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}

// Jobs de certificados
export interface CertificateGenerationJob {
  userId: string;
  courseId: string;
}

/**
 * Filas
 */

// Fila de processamento de vídeo
export const videoQueue = new Queue<VideoProcessingJob>("video-processing", {
  connection,
  defaultJobOptions: {
    attempts: 3, // Tenta 3 vezes em caso de falha
    backoff: {
      type: "exponential",
      delay: 5000, // Espera 5s, 10s, 20s
    },
    removeOnComplete: {
      age: 3600, // Remove jobs completados após 1 hora
      count: 100, // Mantém no máximo 100 jobs completados
    },
    removeOnFail: {
      age: 86400, // Remove jobs falhados após 24 horas
    },
  },
});

// Fila de exclusão de vídeo
export const videoDeleteQueue = new Queue<VideoDeleteJob>("video-delete", {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "fixed",
      delay: 10000,
    },
  },
});

// Fila de e-mails individuais
export const emailQueue = new Queue<EmailJob>("email", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600,
      count: 1000,
    },
  },
});

// Fila de e-mails em massa
export const bulkEmailQueue = new Queue<BulkEmailJob>("bulk-email", {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "fixed",
      delay: 30000,
    },
  },
});

// Fila de notificações
export const notificationQueue = new Queue<NotificationJob>("notification", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: {
      age: 1800,
      count: 500,
    },
  },
});

// Fila de geração de certificados
export const certificateQueue = new Queue<CertificateGenerationJob>(
  "certificate",
  {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    },
  }
);

/**
 * Queue Events para monitoramento
 */

const videoQueueEvents = new QueueEvents("video-processing", { connection });
const emailQueueEvents = new QueueEvents("email", { connection });

// Listeners de eventos (opcional, para debug)
videoQueueEvents.on("completed", ({ jobId }) => {
  console.log(`✅ Video processing job ${jobId} completed`);
});

videoQueueEvents.on("failed", ({ jobId, failedReason }) => {
  console.error(`❌ Video processing job ${jobId} failed: ${failedReason}`);
});

emailQueueEvents.on("completed", ({ jobId }) => {
  console.log(`✅ Email job ${jobId} sent`);
});

emailQueueEvents.on("failed", ({ jobId, failedReason }) => {
  console.error(`❌ Email job ${jobId} failed: ${failedReason}`);
});

/**
 * Helpers para adicionar jobs às filas
 */

/**
 * Adiciona job de processamento de vídeo
 */
export async function addVideoProcessingJob(
  data: VideoProcessingJob,
  priority?: number
) {
  return await videoQueue.add("process-video", data, {
    priority: priority || 1,
  });
}

/**
 * Adiciona job de exclusão de vídeo
 */
export async function addVideoDeleteJob(data: VideoDeleteJob) {
  return await videoDeleteQueue.add("delete-video", data);
}

/**
 * Adiciona job de envio de e-mail
 */
export async function addEmailJob(data: EmailJob, delay?: number) {
  return await emailQueue.add("send-email", data, {
    delay: delay || 0,
  });
}

/**
 * Adiciona job de envio de e-mail em massa
 */
export async function addBulkEmailJob(data: BulkEmailJob) {
  return await bulkEmailQueue.add("send-bulk-email", data);
}

/**
 * Adiciona job de notificação
 */
export async function addNotificationJob(data: NotificationJob) {
  return await notificationQueue.add("send-notification", data);
}

/**
 * Adiciona job de geração de certificado
 */
export async function addCertificateJob(data: CertificateGenerationJob) {
  return await certificateQueue.add("generate-certificate", data);
}

/**
 * Obtém estatísticas de uma fila
 */
export async function getQueueStats(queueName: string) {
  let queue;

  switch (queueName) {
    case "video":
      queue = videoQueue;
      break;
    case "email":
      queue = emailQueue;
      break;
    case "notification":
      queue = notificationQueue;
      break;
    case "certificate":
      queue = certificateQueue;
      break;
    default:
      throw new Error(`Unknown queue: ${queueName}`);
  }

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Limpa jobs completados de todas as filas
 */
export async function cleanCompletedJobs() {
  await Promise.all([
    videoQueue.clean(3600000, 100, "completed"), // 1 hora
    emailQueue.clean(3600000, 1000, "completed"),
    notificationQueue.clean(1800000, 500, "completed"), // 30 min
    certificateQueue.clean(7200000, 100, "completed"), // 2 horas
  ]);

  console.log("✅ Completed jobs cleaned");
}

/**
 * Pausa todas as filas (útil para manutenção)
 */
export async function pauseAllQueues() {
  await Promise.all([
    videoQueue.pause(),
    emailQueue.pause(),
    bulkEmailQueue.pause(),
    notificationQueue.pause(),
    certificateQueue.pause(),
  ]);

  console.log("⏸️  All queues paused");
}

/**
 * Resume todas as filas
 */
export async function resumeAllQueues() {
  await Promise.all([
    videoQueue.resume(),
    emailQueue.resume(),
    bulkEmailQueue.resume(),
    notificationQueue.resume(),
    certificateQueue.resume(),
  ]);

  console.log("▶️  All queues resumed");
}
