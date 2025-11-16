# 2. Architecture Decision Records (ADRs)

## Índice de Decisões Arquiteturais

Este documento consolida as principais decisões arquiteturais da plataforma EdTech. Cada ADR segue o formato:
- **Contexto:** Problema ou necessidade
- **Decisão:** Solução escolhida
- **Consequências:** Trade-offs e impactos
- **Alternativas:** Opções consideradas e descartadas

---

## ADR-001: Next.js App Router como Framework Frontend

**Status:** ✅ Aceito
**Data:** 2024-11
**Decisores:** Equipe de Arquitetura

### Contexto

Precisamos de um framework full-stack que permita:
- Renderização no servidor (SSR) para SEO e performance
- Geração estática (SSG) para conteúdo que muda pouco
- Co-localização de frontend e backend (reduzir latência)
- TypeScript strict mode para segurança de tipos
- Ecossistema maduro e comunidade ativa

### Decisão

**Adotar Next.js 15 com App Router** como framework principal.

**Configurações-chave:**
```typescript
// next.config.mjs
export default {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverActions: true,
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  images: {
    domains: ['stream.mux.com', 's3.amazonaws.com'],
    formats: ['image/avif', 'image/webp'],
  },
}
```

### Consequências

**Positivas:**
- ✅ SSR nativo para SEO e Web Vitals
- ✅ API Routes integradas (BFF pattern)
- ✅ Compartilhamento de código frontend/backend
- ✅ Vercel hosting otimizado (Edge Functions, ISR)
- ✅ React Server Components reduzem bundle size
- ✅ TypeScript first-class support

**Negativas:**
- ❌ Lock-in moderado com Vercel (mitigado com standalone build)
- ❌ Curva de aprendizado do App Router (novo paradigma)
- ❌ Limitações de timeout em API Routes (60s max na Vercel Pro)

### Alternativas Consideradas

| Framework | Prós | Contras | Motivo da Rejeição |
|-----------|------|---------|-------------------|
| **Remix** | Server-first, nested routes | Menor ecossistema, hospedagem complexa | Comunidade menor, menos tooling |
| **Nuxt 3** | SSR Vue.js, Nitro engine | Ecossistema Vue menor que React | Time mais familiarizado com React |
| **SvelteKit** | Performance superior | Ecossistema imaturo, menos devs disponíveis | Risco de contratar devs Svelte |
| **Astro** | Excelente para conteúdo | Não é full-stack (precisa backend separado) | Necessidade de API Routes integradas |

### Referências
- [Next.js 15 Docs](https://nextjs.org/docs)
- [App Router Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration)

---

## ADR-002: Prisma ORM com PostgreSQL 15+

**Status:** ✅ Aceito
**Data:** 2024-11

### Contexto

Precisamos de:
- ORM type-safe para TypeScript
- Migrations versionadas (git-friendly)
- Suporte a queries complexas (joins, aggregations)
- Compatibility com PostgreSQL (extensões pg_trgm para busca)

### Decisão

**Prisma 6.x** como ORM principal com PostgreSQL 15+.

**Schema base:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearch", "metrics"]
  binaryTargets   = ["native", "rhel-openssl-3.0.x"] // Para AWS Lambda
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  role      Role     @default(STUDENT)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
  @@map("users")
}

enum Role {
  STUDENT
  INSTRUCTOR
  ADMIN
}
```

### Consequências

**Positivas:**
- ✅ Type-safety completa (end-to-end)
- ✅ Migrations automáticas (`prisma migrate dev`)
- ✅ Introspection de schema (`prisma db pull`)
- ✅ Query optimization automática
- ✅ Connection pooling integrado (PgBouncer mode)

**Negativas:**
- ❌ Queries muito complexas requerem raw SQL
- ❌ Overhead leve de performance vs. SQL puro (~5-10%)
- ❌ Schema mapeado 1:1 (dificulta legacy DBs)

### Alternativas Consideradas

| ORM | Prós | Contras | Motivo da Rejeição |
|-----|------|---------|-------------------|
| **Drizzle** | Performance superior, SQL-like | Ecossistema menor, sem migrations maduras | Migrations imaturas |
| **TypeORM** | Maduro, decorators | API verbosa, type-safety fraca | DX inferior |
| **Kysely** | Query builder type-safe | Sem migrations, manual demais | Muito low-level |
| **Sequelize** | Maduro, popular | Sem TypeScript first-class | Type-safety ruim |

---

## ADR-003: Redis para Cache e Filas (BullMQ)

**Status:** ✅ Aceito
**Data:** 2024-11

### Contexto

Necessidades:
- Cache de queries frequentes (curso detalhes, lista de aulas)
- Sessões de usuário (NextAuth.js Redis adapter)
- Filas assíncronas (vídeo transcoding, emails)
- Pub/sub para Socket.io clustering
- Rate limiting distribuído

### Decisão

**Redis 7.x** (AWS ElastiCache) para:
1. **Cache:** TTL-based caching (Curso: 1h, Lição: 6h)
2. **Sessões:** NextAuth.js Redis Adapter
3. **Filas:** BullMQ para jobs assíncronos
4. **Pub/Sub:** Socket.io Redis Adapter
5. **Rate Limiting:** Sliding window algorithm

**Configuração:**
```typescript
// lib/redis.ts
import Redis from 'ioredis'

export const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  enableReadyCheck: true,
  connectTimeout: 10000,
})

// Cache helper
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached)

  const data = await fetcher()
  await redis.setex(key, ttl, JSON.stringify(data))
  return data
}
```

### Consequências

**Positivas:**
- ✅ Redução de ~80% de queries ao banco (cache hit rate)
- ✅ Sessões distribuídas (multi-region support)
- ✅ Filas confiáveis (at-least-once delivery)
- ✅ Rate limiting eficiente (< 1ms latência)

**Negativas:**
- ❌ Custo adicional (~$15-20/mês ElastiCache)
- ❌ Complexidade de invalidação de cache
- ❌ Possibilidade de cache stale (mitigado com TTLs curtos)

### Padrões de Cache

| Recurso | Chave | TTL | Invalidação |
|---------|-------|-----|-------------|
| Curso detalhes | `course:{id}` | 1h | Ao atualizar curso |
| Lista de aulas | `course:{id}:lessons` | 1h | Ao adicionar/editar lição |
| Progresso do aluno | `user:{id}:progress:{courseId}` | 5min | Ao salvar progresso |
| Busca de cursos | `search:{query}:{page}` | 10min | Periódico (background job) |

### Alternativas Consideradas

- **Memcached:** Mais simples, mas sem suporte a filas/pub-sub
- **Upstash Redis:** Serverless, mas custo mais alto em escala
- **DragonflyDB:** Compatible Redis, mais performático, mas menos maduro

---

## ADR-004: Stripe Connect para Split de Pagamentos

**Status:** ✅ Aceito
**Data:** 2024-11

### Contexto

Modelo de negócio:
- Marketplace de cursos (múltiplos instrutores)
- Split automático: 70% instrutor, 30% plataforma
- Conformidade PCI-DSS (não armazenar cartões)
- Suporte a reembolsos parciais
- Relatórios fiscais para instrutores

### Decisão

**Stripe Connect (Express Accounts)** como gateway principal.

**Fluxo de onboarding:**
```typescript
// Criar Stripe Connect account
const account = await stripe.accounts.create({
  type: 'express',
  country: 'BR',
  email: instructor.email,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
})

// Link de onboarding
const link = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: 'https://app.com/instructor/onboarding',
  return_url: 'https://app.com/instructor/dashboard',
  type: 'account_onboarding',
})
```

**Split de pagamento:**
```typescript
// Checkout com Transfer
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [
    {
      price_data: {
        currency: 'brl',
        product_data: { name: course.title },
        unit_amount: course.price * 100, // R$ 100.00 → 10000
      },
      quantity: 1,
    },
  ],
  payment_intent_data: {
    application_fee_amount: Math.floor(course.price * 100 * 0.3), // 30%
    transfer_data: {
      destination: instructor.stripeAccountId, // 70%
    },
  },
  success_url: 'https://app.com/checkout/success',
  cancel_url: 'https://app.com/checkout/cancel',
})
```

### Consequências

**Positivas:**
- ✅ Compliance PCI-DSS (Stripe gerencia)
- ✅ Split automático (transfers)
- ✅ Suporte a reembolsos (reversal de transfers)
- ✅ Relatórios fiscais (1099-K no US, similar no BR)
- ✅ Webhooks confiáveis (retry automático)

**Negativas:**
- ❌ Taxas altas: 4.99% + R$ 0.40 (Brasil)
- ❌ Onboarding de instrutor requer validação (KYC/AML)
- ❌ Lock-in moderado (migrar é complexo)

### Alternativas Consideradas

- **PayPal Commerce Platform:** Taxas similares, menos features
- **Mercado Pago Split:** Apenas Brasil, integração menos madura
- **Pagarme/Iugu:** Nacionais, mas menos confiáveis

**Decisão:** Stripe primário, Mercado Pago secundário (Pix/Boleto).

---

## ADR-005: Mux para Transcoding e Streaming de Vídeo

**Status:** ✅ Aceito
**Data:** 2024-11

### Contexto

Requisitos de vídeo:
- Upload de vídeos até 2h (1080p)
- Transcoding para HLS adaptativo (240p-1080p)
- Streaming global com baixa latência
- Proteção anti-hotlink (signed URLs)
- Analytics de visualização
- Thumbnails automáticos

### Decisão

**Mux Video API** para toda pipeline de vídeo.

**Fluxo de upload:**
```typescript
// 1. Criar Direct Upload
const upload = await mux.video.uploads.create({
  new_asset_settings: {
    playback_policy: ['signed'],
    mp4_support: 'standard',
    max_resolution_tier: '1080p',
  },
  cors_origin: 'https://app.com',
})

// 2. Upload direto do browser
const file = await fileInput.files[0]
await uploadToMux(upload.url, file)

// 3. Webhook de conclusão
app.post('/api/webhooks/mux', async (req) => {
  const event = req.body

  if (event.type === 'video.asset.ready') {
    const asset = event.data
    await db.mediaAsset.update({
      where: { muxAssetId: asset.id },
      data: {
        status: 'ready',
        playbackId: asset.playback_ids[0].id,
        duration: asset.duration,
      },
    })
  }
})
```

**Playback com signed URLs:**
```typescript
import Mux from '@mux/mux-node'
const { JWT } = Mux

const token = JWT.sign(playbackId, {
  keyId: process.env.MUX_SIGNING_KEY_ID,
  keySecret: process.env.MUX_SIGNING_KEY_SECRET,
  expiration: '4h',
})

const playbackUrl = `https://stream.mux.com/${playbackId}.m3u8?token=${token}`
```

### Consequências

**Positivas:**
- ✅ Zero infra para gerenciar
- ✅ Transcoding rápido (1min vídeo = ~30s processamento)
- ✅ CDN global incluído
- ✅ Analytics integrado (view counts, engagement)
- ✅ Thumbnails automáticos (animated + static)

**Negativas:**
- ❌ Custo: $0.005/min encoding + $0.002/min streaming
  - Exemplo: 100h encoding + 10k views (5min avg) = $130/mês
- ❌ Lock-in forte (migrar é difícil)
- ❌ Sem DRM nativo (apenas signed URLs)

### Alternativas Consideradas

| Opção | Prós | Contras | Decisão |
|-------|------|---------|---------|
| **AWS MediaConvert** | Controle total, custo menor | Complexo de setup, sem CDN integrado | Descartado (DX ruim) |
| **Cloudflare Stream** | Preço fixo ($1/1000min) | Sem direct upload, analytics básico | Considerar em escala |
| **Bunny Stream** | Muito barato ($0.005/GB) | Menor confiabilidade, suporte fraco | Descartado (risco) |

**Decisão:** Mux no MVP, reavaliar Cloudflare Stream se custo > $500/mês.

---

## ADR-006: Socket.io para Comunicação Realtime

**Status:** ✅ Aceito
**Data:** 2024-11

### Contexto

Features realtime:
- Chat de Q&A (aluno ↔ instrutor)
- Notificações push (nova aula, resposta)
- Presença online (quem está assistindo)
- Progress sync (múltiplos dispositivos)

### Decisão

**Socket.io 4.7** rodando em ECS Fargate (servidor dedicado).

**Arquitetura:**
```
Browser ↔ ALB (sticky sessions) ↔ Socket.io Server (2 instâncias) ↔ Redis Adapter
```

**Configuração:**
```typescript
// server/socket.ts
import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { redis } from './lib/redis'

const io = new Server(httpServer, {
  cors: { origin: 'https://app.com', credentials: true },
  transports: ['websocket', 'polling'],
})

// Redis adapter para clustering
io.adapter(createAdapter(redis, redis.duplicate()))

// Autenticação
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token
  try {
    const user = await verifyJWT(token)
    socket.data.user = user
    next()
  } catch {
    next(new Error('Authentication error'))
  }
})

// Rooms por curso
io.on('connection', (socket) => {
  socket.on('join:course', async (courseId) => {
    const enrolled = await checkEnrollment(socket.data.user.id, courseId)
    if (!enrolled) return socket.emit('error', 'Not enrolled')

    socket.join(`course:${courseId}`)
    socket.to(`course:${courseId}`).emit('user:joined', socket.data.user)
  })

  socket.on('chat:message', async (data) => {
    // Validar, salvar no DB, emitir
    const message = await saveMessage(data)
    io.to(`course:${data.courseId}`).emit('chat:message', message)
  })
})
```

### Consequências

**Positivas:**
- ✅ Protocolo maduro e confiável
- ✅ Fallback automático (WebSocket → polling)
- ✅ Redis Adapter para horizontal scaling
- ✅ Rooms para isolamento de mensagens
- ✅ Biblioteca cliente robusta

**Negativas:**
- ❌ Custo de servidor dedicado (~$50/mês)
- ❌ Complexidade de deploy (vs. serverless)
- ❌ Não funciona na Vercel (precisa ECS/Railway)

### Alternativas Consideradas

- **Pusher:** SaaS, fácil, mas caro ($49/mês para 500 conexões)
- **Ably:** Similar ao Pusher, preço parecido
- **Supabase Realtime:** Grátis, mas limited features
- **Partykit:** Serverless WebSockets, mas muito novo (2023)

**Decisão:** Socket.io self-hosted (custo-benefício).

---

## ADR-007: BullMQ para Processamento Assíncrono

**Status:** ✅ Aceito
**Data:** 2024-11

### Contexto

Jobs assíncronos necessários:
- Transcoding de vídeo (10-60min)
- Envio de emails (batch de 1000s)
- Processamento de webhooks (retry logic)
- Geração de certificados (PDF)
- Cálculo de analytics (agregações)

### Decisão

**BullMQ 5.x** (sucessor do Bull) com Redis.

**Exemplo de worker:**
```typescript
// workers/video-transcode.worker.ts
import { Worker, Queue } from 'bullmq'
import { redis } from '../lib/redis'

const videoQueue = new Queue('video-transcoding', { connection: redis })

const worker = new Worker(
  'video-transcoding',
  async (job) => {
    const { mediaAssetId, muxAssetId } = job.data

    // Polling de status do Mux
    let asset
    do {
      asset = await mux.video.assets.retrieve(muxAssetId)
      await job.updateProgress(asset.status)

      if (asset.status === 'errored') {
        throw new Error(asset.errors.messages.join(', '))
      }

      if (asset.status !== 'ready') {
        await sleep(10000) // 10s
      }
    } while (asset.status !== 'ready')

    // Atualizar DB
    await db.mediaAsset.update({
      where: { id: mediaAssetId },
      data: {
        status: 'ready',
        playbackId: asset.playback_ids[0].id,
        duration: asset.duration,
      },
    })

    return { playbackId: asset.playback_ids[0].id }
  },
  {
    connection: redis,
    concurrency: 5,
    limiter: { max: 10, duration: 1000 }, // 10 jobs/s
  }
)

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err)
  // Enviar para Sentry
})
```

### Consequências

**Positivas:**
- ✅ Retry automático com backoff exponencial
- ✅ Priorização de jobs (priority queue)
- ✅ Rate limiting built-in
- ✅ Dashboard UI (Bull Board)
- ✅ Dead Letter Queue (DLQ) para falhas permanentes

**Negativas:**
- ❌ Requer worker separado (não roda em Vercel Functions)
- ❌ Redis como single point of failure (mitigado com replicação)

### Filas Planejadas

| Fila | Concorrência | Timeout | Retry | DLQ |
|------|--------------|---------|-------|-----|
| `video-transcoding` | 5 | 30min | 3x | ✅ |
| `email-sending` | 10 | 30s | 5x | ✅ |
| `webhook-processing` | 20 | 10s | 5x | ✅ |
| `certificate-generation` | 3 | 60s | 3x | ✅ |
| `analytics-aggregation` | 2 | 5min | 3x | ❌ |

### Alternativas Consideradas

- **AWS SQS + Lambda:** Serverless, mas menos features (sem priorização)
- **Celery:** Python-based, incompatível com stack Node.js
- **Inngest:** Serverless jobs, mas custo alto ($20+/mês)

---

## ADR-008: Estratégia de Cache Multi-Layer

**Status:** ✅ Aceito
**Data:** 2024-11

### Contexto

Necessidade de otimizar performance para:
- Páginas SSR (catálogo, curso detalhes)
- API endpoints (lista de aulas, progresso)
- Assets estáticos (imagens, vídeos)

### Decisão

**Estratégia multi-layer:**

```
Browser Cache → Vercel Edge Cache → Redis → PostgreSQL
```

#### Layer 1: Browser Cache
- Headers `Cache-Control` para assets estáticos
- Service Worker para offline-first (opcional)

```typescript
// next.config.mjs
export default {
  async headers() {
    return [
      {
        source: '/assets/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/api/courses/:id',
        headers: [
          { key: 'Cache-Control', value: 'private, max-age=60, stale-while-revalidate=300' },
        ],
      },
    ]
  },
}
```

#### Layer 2: Vercel Edge Cache (CDN)
- ISR para páginas de curso (revalidate: 3600s)
- Edge Functions para personalização

```typescript
// app/courses/[id]/page.tsx
export const revalidate = 3600 // 1h

export async function generateStaticParams() {
  const courses = await db.course.findMany({ take: 100, orderBy: { enrollments: 'desc' } })
  return courses.map((c) => ({ id: c.id }))
}
```

#### Layer 3: Redis (Application Cache)
- Cache de queries frequentes
- TTLs curtos (5-60min)

```typescript
// Padrão Cache-Aside
async function getCourse(id: string) {
  const key = `course:${id}`

  // Try cache
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached)

  // Cache miss → DB
  const course = await db.course.findUnique({ where: { id } })

  // Set cache (1h TTL)
  await redis.setex(key, 3600, JSON.stringify(course))

  return course
}
```

#### Layer 4: PostgreSQL (Source of Truth)
- Índices otimizados
- Materialized views para analytics

### Consequências

**Positivas:**
- ✅ TTFB < 200ms (Edge Cache)
- ✅ Redução de ~90% de queries ao banco
- ✅ Custos de DB reduzidos (menos RCUs)

**Negativas:**
- ❌ Complexidade de invalidação
- ❌ Possibilidade de dados stale

### Política de Invalidação

| Evento | Invalidação |
|--------|-------------|
| Curso atualizado | `course:{id}`, purge Edge (`revalidatePath`) |
| Aula adicionada | `course:{id}:lessons`, `course:{id}` |
| Progresso salvo | `user:{id}:progress:{courseId}` |
| Matrícula criada | `course:{id}:enrollments` |

```typescript
// Invalidação explícita
import { revalidatePath, revalidateTag } from 'next/cache'

export async function updateCourse(id: string, data: any) {
  await db.course.update({ where: { id }, data })

  // Invalidar Redis
  await redis.del(`course:${id}`)

  // Invalidar Edge Cache
  revalidatePath(`/courses/${id}`)
  revalidateTag('courses')
}
```

---

## ADR-009: Internacionalização (i18n) com next-intl

**Status:** ✅ Aceito
**Data:** 2024-11

### Contexto

Requisitos:
- Suporte inicial: **pt-BR** (baseline)
- Expansão futura: en-US, es-ES
- Tradução de UI, emails, conteúdo de curso (opcional)
- Formatação de moeda (BRL, USD) e datas

### Decisão

**next-intl 3.x** para i18n.

**Configuração:**
```typescript
// middleware.ts
import createMiddleware from 'next-intl/middleware'

export default createMiddleware({
  locales: ['pt-BR', 'en-US', 'es-ES'],
  defaultLocale: 'pt-BR',
  localeDetection: true,
  localePrefix: 'as-needed', // /cursos (pt-BR), /en-US/courses
})

// messages/pt-BR.json
{
  "common": {
    "login": "Entrar",
    "signup": "Cadastrar",
    "logout": "Sair"
  },
  "course": {
    "enroll": "Matricular",
    "price": "{price, number, currency}",
    "duration": "{hours} horas"
  }
}

// Uso
import { useTranslations } from 'next-intl'

function CourseCard({ course }) {
  const t = useTranslations('course')

  return (
    <div>
      <h3>{course.title}</h3>
      <p>{t('price', { price: course.price })}</p>
      <button>{t('enroll')}</button>
    </div>
  )
}
```

### Consequências

**Positivas:**
- ✅ Roteamento automático por locale
- ✅ Formatação automática (moeda, data, hora)
- ✅ Type-safe translations (TypeScript)
- ✅ SSR + SSG friendly

**Negativas:**
- ❌ Bundle size aumenta (~10-20KB por locale)
- ❌ Tradução de conteúdo de curso requer UGC (User Generated Content) - não coberto

**Escopo MVP:** Apenas UI em pt-BR, conteúdo de curso sempre no idioma original do instrutor.

---

## ADR-010: Política de Acessibilidade (WCAG 2.2 AA)

**Status:** ✅ Aceito
**Data:** 2024-11

### Contexto

Requisitos legais e éticos:
- Lei Brasileira de Inclusão (LBI 13.146/2015)
- WCAG 2.2 nível AA
- Suporte a leitores de tela (NVDA, JAWS, VoiceOver)
- Navegação por teclado

### Decisão

**Compliance WCAG 2.2 AA** com:
- Semântica HTML adequada
- ARIA labels onde necessário
- Contraste mínimo 4.5:1 (texto normal)
- Focus indicators visíveis
- Legendas/transcrições de vídeo (opcional no MVP)

**Checklist de implementação:**

| Critério | Implementação |
|----------|---------------|
| **1.1 Texto Alternativo** | `alt` em imagens, ARIA labels em ícones |
| **1.3 Adaptável** | Headings hierárquicos (h1-h6), landmarks |
| **1.4 Distinguível** | Contraste 4.5:1, texto redimensionável |
| **2.1 Teclado** | Tab navigation, skip links, focus traps |
| **2.4 Navegável** | Breadcrumbs, sitemap, títulos descritivos |
| **3.1 Legível** | `lang="pt-BR"`, linguagem clara |
| **3.2 Previsível** | Navegação consistente, sem surpresas |
| **3.3 Assistência de Input** | Validação clara, mensagens de erro |
| **4.1 Compatível** | HTML válido, ARIA válido |

**Ferramentas:**
- **Lighthouse:** Automated audits
- **axe DevTools:** Browser extension
- **NVDA/VoiceOver:** Manual testing

**Player de vídeo acessível:**
```typescript
// Mux Player com acessibilidade
<MuxPlayer
  playbackId={playbackId}
  streamType="on-demand"
  metadata={{
    video_title: lesson.title,
    video_id: lesson.id,
  }}
  // Acessibilidade
  accentColor="#0070f3"
  primaryColor="#ffffff"
  secondaryColor="#000000"
/>

// Adicionar legendas (WebVTT)
<track
  kind="subtitles"
  src={`/api/subtitles/${lesson.id}/pt-BR.vtt`}
  srcLang="pt-BR"
  label="Português (Brasil)"
  default
/>
```

### Consequências

**Positivas:**
- ✅ Inclusão de ~10% da população (PcD)
- ✅ SEO melhorado (semântica HTML)
- ✅ Conformidade legal

**Negativas:**
- ❌ Overhead de desenvolvimento (~10-15%)
- ❌ Necessidade de testes manuais

**Escopo MVP:** Compliance AA, legendas opcionais (geradas por IA posteriormente).

---

## ADR-011: Estratégia de Testes (Cobertura 80%+)

**Status:** ✅ Aceito
**Data:** 2024-11

### Contexto

Requisitos de qualidade:
- Cobertura mínima de 80% (unit + integration)
- Testes E2E para fluxos críticos
- CI/CD com gates de qualidade

### Decisão

**Stack de testes:**
- **Unit:** Vitest (3x mais rápido que Jest)
- **Integration:** Vitest + MSW (mock de APIs)
- **E2E:** Playwright (cross-browser)
- **Coverage:** v8 (built-in Vitest)

**Estrutura:**
```
__tests__/
├── unit/
│   ├── lib/
│   │   ├── cache.test.ts
│   │   └── auth.test.ts
│   └── components/
│       └── CourseCard.test.tsx
├── integration/
│   ├── api/
│   │   ├── courses.test.ts
│   │   └── payments.test.ts
│   └── services/
│       └── enrollment.test.ts
└── e2e/
    ├── auth.spec.ts
    ├── checkout.spec.ts
    └── video-playback.spec.ts
```

**Configuração Vitest:**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

**Testes críticos (E2E):**
1. Fluxo de cadastro e login
2. Compra de curso (checkout + webhook)
3. Visualização de vídeo (playback + progresso)
4. Upload de vídeo (instrutor)
5. Chat em tempo real

**Playwright config:**
```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
})
```

### Consequências

**Positivas:**
- ✅ Confiança em deploys (CI gates)
- ✅ Refactoring seguro
- ✅ Documentação viva (testes como specs)

**Negativas:**
- ❌ Overhead inicial de escrita (~20-30% de tempo)
- ❌ Manutenção de testes (podem quebrar com UI changes)

**Gates de CI:**
- ❌ Bloquear PR se coverage < 80%
- ❌ Bloquear PR se testes E2E falharem
- ⚠️ Warning se TypeScript errors

---

## ADR-012: Observabilidade com OpenTelemetry

**Status:** ✅ Aceito
**Data:** 2024-11

### Contexto

Necessidade de:
- Distributed tracing (API → DB → Mux → Stripe)
- Métricas de performance (latência, throughput)
- Logs estruturados (JSON)
- Alerting proativo

### Decisão

**OpenTelemetry (OTEL)** como padrão de instrumentação.

**Stack:**
- **Tracing:** Jaeger (self-hosted) ou Honeycomb (SaaS)
- **Metrics:** Prometheus + Grafana
- **Logs:** CloudWatch Logs (AWS) + Vercel Logs
- **Alerts:** PagerDuty ou Opsgenie

**Instrumentação:**
```typescript
// lib/telemetry.ts
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
})

sdk.start()

// Custom spans
import { trace } from '@opentelemetry/api'

const tracer = trace.getTracer('edtech-api')

async function getCourseWithTracking(id: string) {
  return tracer.startActiveSpan('getCourse', async (span) => {
    span.setAttribute('course.id', id)

    try {
      const course = await db.course.findUnique({ where: { id } })
      span.setAttribute('course.found', !!course)
      return course
    } catch (error) {
      span.recordException(error)
      span.setStatus({ code: SpanStatusCode.ERROR })
      throw error
    } finally {
      span.end()
    }
  })
}
```

**Dashboards:**
1. **API Performance:** Latência p50/p95/p99 por endpoint
2. **Database:** Query time, connection pool usage
3. **Workers:** Job throughput, failure rate
4. **External Services:** Mux, Stripe latency
5. **Business Metrics:** Enrollments/hour, revenue/day

### Consequências

**Positivas:**
- ✅ Visibilidade end-to-end de requests
- ✅ Root cause analysis rápida
- ✅ SLO tracking automático

**Negativas:**
- ❌ Overhead de performance (~1-2%)
- ❌ Complexidade de configuração
- ❌ Custo de SaaS (Honeycomb: $50+/mês)

**Decisão:** OTEL no MVP com Jaeger self-hosted (~$20/mês), migrar para Honeycomb em escala.

---

## Resumo das Decisões

| ADR | Decisão | Alternativa | Status |
|-----|---------|-------------|--------|
| 001 | Next.js 15 App Router | Remix, Nuxt, SvelteKit | ✅ |
| 002 | Prisma + PostgreSQL | Drizzle, TypeORM | ✅ |
| 003 | Redis + BullMQ | Upstash, Memcached | ✅ |
| 004 | Stripe Connect | PayPal, Mercado Pago | ✅ |
| 005 | Mux | AWS MediaConvert, Cloudflare Stream | ✅ |
| 006 | Socket.io | Pusher, Ably, Partykit | ✅ |
| 007 | BullMQ | AWS SQS, Inngest | ✅ |
| 008 | Cache Multi-Layer | Single-layer | ✅ |
| 009 | next-intl | next-i18next, react-intl | ✅ |
| 010 | WCAG 2.2 AA | WCAG 2.1 AA | ✅ |
| 011 | Vitest + Playwright | Jest + Cypress | ✅ |
| 012 | OpenTelemetry + Jaeger | Sentry APM, Datadog | ✅ |

---

**Próximos Passos:**
1. Revisão e aprovação dos ADRs com time técnico
2. PoCs de componentes críticos (Socket.io, Mux, Stripe)
3. Configuração de ambientes (dev, staging, prod)
4. Criação de templates de código baseados nas decisões
