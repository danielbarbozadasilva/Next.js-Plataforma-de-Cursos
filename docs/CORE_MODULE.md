# Módulo 4: Infra/Core (Back-end)

Documentação completa do módulo de infraestrutura e back-end da plataforma EAD.

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [AuthN/AuthZ](#authnauthorz)
3. [Pagamentos](#pagamentos)
4. [Tempo Real (Socket.io)](#tempo-real-socketio)
5. [Mídia e Vídeo](#mídia-e-vídeo)
6. [Background Jobs](#background-jobs)
7. [E-mail](#e-mail)
8. [Middlewares de Segurança](#middlewares-de-segurança)
9. [Configuração](#configuração)

---

## Visão Geral

O Módulo Core fornece toda a infraestrutura necessária para a plataforma EAD, incluindo:

- ✅ Autenticação e Autorização (RBAC)
- ✅ Processamento de Pagamentos (Stripe, PayPal, Mercado Pago)
- ✅ Sistema de Tempo Real (Socket.io)
- ✅ Armazenamento de Mídia (AWS S3)
- ✅ Transcoding de Vídeo (Mux HLS)
- ✅ Filas de Background (Redis + BullMQ)
- ✅ E-mail Transacional (SendGrid/Resend)
- ✅ Middlewares de Segurança (Rate Limiting, CORS, Security Headers)

---

## AuthN/AuthZ

### RBAC (Role-Based Access Control)

Sistema completo de controle de acesso baseado em roles: `ADMIN`, `INSTRUCTOR`, `STUDENT`.

**Localização:** `src/lib/core/auth/rbac.ts`

#### Exemplo de Uso:

```typescript
import { requireAuth, requireRole, requirePermission } from "@/lib/core/auth/api-helpers";
import { Resource, Action } from "@/lib/core/auth/rbac";

// Endpoint que requer autenticação
export const GET = async (req: NextRequest) => {
  const session = await requireAuth();
  // Usuário autenticado
};

// Endpoint que requer role específico
export const POST = async (req: NextRequest) => {
  const session = await requireRole(Role.INSTRUCTOR);
  // Apenas instrutores
};

// Endpoint que requer permissão específica
export const DELETE = async (req: NextRequest) => {
  const session = await requirePermission(Resource.COURSES, Action.DELETE);
  // Apenas quem pode deletar cursos
};
```

#### Helpers de API:

```typescript
import {
  withErrorHandler,
  successResponse,
  NotFoundError,
  BadRequestError
} from "@/lib/core/auth/api-helpers";

export const GET = withErrorHandler(async (req) => {
  const session = await requireAuth();

  const data = await db.course.findMany();

  if (!data) {
    throw new NotFoundError("Courses not found");
  }

  return successResponse(data);
});
```

---

## Pagamentos

### Gateways Suportados

1. **Stripe** (Padrão)
2. **PayPal**
3. **Mercado Pago**

Todos os gateways suportam **split de comissão automático** (ex: 20% plataforma, 80% instrutor).

### Stripe

**Localização:** `src/lib/core/payments/stripe.ts`

```typescript
import { createCheckoutSession } from "@/lib/core/payments/stripe";

const { sessionId, url } = await createCheckoutSession(
  userId,
  cartItems,
  "http://localhost:3000/success",
  "http://localhost:3000/cancel"
);

// Redireciona para o checkout do Stripe
redirect(url);
```

### PayPal

**Localização:** `src/lib/core/payments/paypal.ts`

```typescript
import { createPayPalOrder } from "@/lib/core/payments/paypal";

const { orderId, approvalUrl } = await createPayPalOrder(userId, cartItems);

// Redireciona para aprovação no PayPal
redirect(approvalUrl);
```

### Mercado Pago

**Localização:** `src/lib/core/payments/mercadopago.ts`

```typescript
import { createMercadoPagoPreference } from "@/lib/core/payments/mercadopago";

const { preferenceId, initPoint } = await createMercadoPagoPreference(
  userId,
  cartItems
);

// Redireciona para o checkout do Mercado Pago
redirect(initPoint);
```

### Webhooks

Os webhooks estão configurados em:
- `/api/webhooks/stripe`
- `/api/webhooks/paypal`
- `/api/webhooks/mercadopago`

**Importante:** Configure os webhooks nos respectivos painéis dos gateways apontando para essas URLs.

---

## Tempo Real (Socket.io)

### Servidor Socket.io

**Localização:** `src/lib/core/socket/server.ts`

#### Configuração:

```typescript
import { setupSocketIO } from "@/lib/core/socket/server";

const io = setupSocketIO(httpServer);
```

#### Eventos Disponíveis:

**Chat:**
- `join_chat` - Entrar em uma sala de chat
- `leave_chat` - Sair de uma sala de chat
- `send_message` - Enviar mensagem
- `typing` - Usuário digitando
- `stop_typing` - Usuário parou de digitar
- `mark_as_read` - Marcar mensagem como lida

**Notificações:**
- `get_notifications` - Obter notificações não lidas
- `mark_notification_read` - Marcar como lida

**Vídeo Sync (Opcional):**
- `video_play` - Play sincronizado
- `video_pause` - Pause sincronizado
- `video_seek` - Seek sincronizado

#### Enviar Notificações:

```typescript
import { sendNotificationToUser } from "@/lib/core/socket/server";

await sendNotificationToUser(io, userId, {
  type: "course_update",
  title: "Novo conteúdo disponível",
  message: "Uma nova aula foi adicionada ao curso X",
  data: { courseId: "123" }
});
```

---

## Mídia e Vídeo

### Storage (AWS S3)

**Localização:** `src/lib/core/storage/s3.ts`

#### Upload de Arquivo:

```typescript
import { uploadFile, FileType } from "@/lib/core/storage/s3";

const result = await uploadFile(
  fileBuffer,
  FileType.VIDEO,
  "video.mp4",
  "video/mp4",
  userId
);

console.log(result.url); // URL do arquivo
console.log(result.key); // Chave no S3
```

#### Upload Direto (Presigned URL):

```typescript
import { getSignedUploadUrl } from "@/lib/core/storage/s3";

const { uploadUrl, key } = await getSignedUploadUrl(
  FileType.VIDEO,
  "video.mp4",
  "video/mp4",
  userId
);

// Cliente faz upload direto para S3
fetch(uploadUrl, {
  method: "PUT",
  body: file,
  headers: { "Content-Type": "video/mp4" }
});
```

### Transcoding de Vídeo (Mux)

**Localização:** `src/lib/core/video/mux.ts`

#### Upload Direto para Mux:

```typescript
import { createDirectUpload } from "@/lib/core/video/mux";

const { uploadUrl, assetId } = await createDirectUpload(lessonId);

// Cliente faz upload direto para Mux
```

#### Criar Asset a partir de URL:

```typescript
import { createAssetFromUrl } from "@/lib/core/video/mux";

const assetId = await createAssetFromUrl(s3VideoUrl, lessonId);
// Mux vai processar o vídeo automaticamente
```

#### Obter URL de Playback:

```typescript
import { getPlaybackUrl, getThumbnailUrl } from "@/lib/core/video/mux";

const streamUrl = getPlaybackUrl(playbackId); // HLS .m3u8
const thumbnail = getThumbnailUrl(playbackId, { time: 5, width: 1280 });
```

---

## Background Jobs

### Filas (BullMQ + Redis)

**Localização:** `src/lib/core/queue/queues.ts`

#### Adicionar Job de Vídeo:

```typescript
import { addVideoProcessingJob } from "@/lib/core/queue/queues";

await addVideoProcessingJob({
  lessonId: "123",
  videoUrl: "https://s3.../video.mp4",
  instructorId: "456"
});
```

#### Adicionar Job de E-mail:

```typescript
import { addEmailJob } from "@/lib/core/queue/queues";

await addEmailJob({
  to: "user@example.com",
  subject: "Bem-vindo!",
  template: "welcome",
  data: { userName: "João" }
});
```

#### Adicionar Job de Certificado:

```typescript
import { addCertificateJob } from "@/lib/core/queue/queues";

await addCertificateJob({
  userId: "123",
  courseId: "456"
});
```

### Workers

**Localização:** `src/lib/core/queue/workers.ts`

Para rodar os workers em produção:

```bash
# Usando ts-node
npx ts-node src/lib/core/queue/workers.ts

# Ou usando PM2
pm2 start src/lib/core/queue/workers.ts --name workers
```

---

## E-mail

### Serviços Suportados

- **SendGrid** (Recomendado)
- **Resend** (Alternativa moderna)

**Localização:** `src/lib/core/email/index.ts`

#### Enviar E-mail:

```typescript
import { sendEmail } from "@/lib/core/email";

await sendEmail({
  to: "user@example.com",
  subject: "Assunto do E-mail",
  html: "<h1>Olá!</h1><p>Conteúdo do e-mail</p>"
});
```

#### Templates Prontos:

```typescript
import {
  sendWelcomeEmail,
  sendPurchaseConfirmation,
  sendCertificateEmail,
  sendPasswordResetEmail
} from "@/lib/core/email";

// Boas-vindas
await sendWelcomeEmail("user@example.com", "João Silva");

// Confirmação de compra
await sendPurchaseConfirmation(
  "user@example.com",
  "João Silva",
  ["Curso de Next.js", "Curso de React"],
  299.90
);

// Certificado
await sendCertificateEmail(
  "user@example.com",
  "João Silva",
  "Curso de Next.js",
  "cert-123"
);

// Reset de senha
await sendPasswordResetEmail("user@example.com", "reset-token-123");
```

---

## Middlewares de Segurança

### Rate Limiting

**Localização:** `src/lib/core/middleware/rate-limit.ts`

```typescript
import { withRateLimit } from "@/lib/core/middleware/rate-limit";

export const POST = withRateLimit("auth", async (req) => {
  // Máximo 5 requisições a cada 15 minutos
  // ... seu código
});
```

Tipos disponíveis:
- `auth` - 5 req / 15 min (login, signup)
- `api` - 100 req / 15 min (API geral)
- `upload` - 10 req / 1 hora
- `webhook` - 1000 req / 1 hora

### CORS

**Localização:** `src/lib/core/middleware/cors.ts`

```typescript
import { withCors } from "@/lib/core/middleware/cors";

export const GET = withCors(async (req) => {
  // CORS configurado automaticamente
  // ... seu código
});
```

### Security Headers

**Localização:** `src/lib/core/middleware/security.ts`

```typescript
import { withSecurity } from "@/lib/core/middleware/security";

export const GET = withSecurity(async (req) => {
  // Headers de segurança adicionados automaticamente
  // ... seu código
});
```

Headers adicionados:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy`
- `Strict-Transport-Security` (produção)

---

## Configuração

### Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

#### Essenciais:

```bash
# Database
DATABASE_URL="mysql://user:pass@localhost:3306/db"

# Next Auth
NEXTAUTH_SECRET="sua-chave-secreta-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"
```

#### Pagamentos:

```bash
# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# PayPal
PAYPAL_CLIENT_ID="..."
PAYPAL_CLIENT_SECRET="..."
PAYPAL_MODE="sandbox"

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN="..."
MERCADOPAGO_PUBLIC_KEY="..."
```

#### Storage e Vídeo:

```bash
# AWS S3
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="us-east-1"
AWS_BUCKET_NAME="..."

# Mux
MUX_TOKEN_ID="..."
MUX_TOKEN_SECRET="..."
MUX_WEBHOOK_SECRET="..."
```

#### Redis e E-mail:

```bash
# Redis
REDIS_URL="redis://localhost:6379"

# SendGrid
SENDGRID_API_KEY="SG...."
SENDGRID_FROM_EMAIL="noreply@plataforma.com"
```

### Instalação de Dependências

```bash
npm install
```

As principais dependências instaladas:
- `stripe` - Gateway de pagamento
- `@paypal/checkout-server-sdk` - PayPal
- `mercadopago` - Mercado Pago
- `@aws-sdk/client-s3` - Storage S3
- `@mux/mux-node` - Transcoding de vídeo
- `bullmq` - Filas de background
- `ioredis` - Cliente Redis
- `@sendgrid/mail` - E-mail
- `resend` - E-mail alternativo
- `socket.io` - Tempo real

### Executar Workers

Em desenvolvimento:
```bash
npx ts-node src/lib/core/queue/workers.ts
```

Em produção (com PM2):
```bash
pm2 start src/lib/core/queue/workers.ts --name workers
pm2 save
```

---

## Arquitetura

```
src/lib/core/
├── auth/              # Autenticação e RBAC
│   ├── rbac.ts
│   └── api-helpers.ts
├── payments/          # Gateways de pagamento
│   ├── stripe.ts
│   ├── paypal.ts
│   └── mercadopago.ts
├── storage/           # Upload e storage
│   └── s3.ts
├── video/             # Transcoding e streaming
│   └── mux.ts
├── queue/             # Background jobs
│   ├── redis.ts
│   ├── queues.ts
│   └── workers.ts
├── email/             # E-mail transacional
│   ├── sendgrid.ts
│   ├── resend.ts
│   └── index.ts
├── socket/            # Tempo real
│   └── server.ts
└── middleware/        # Middlewares de segurança
    ├── rate-limit.ts
    ├── cors.ts
    └── security.ts
```

---

## Suporte

Para problemas ou dúvidas sobre o módulo Core, consulte:
- Documentação do Stripe: https://stripe.com/docs
- Documentação do Mux: https://docs.mux.com
- Documentação do BullMQ: https://docs.bullmq.io
- Documentação do Socket.io: https://socket.io/docs

---

**Módulo Core - Plataforma EAD**
Versão 1.0.0
