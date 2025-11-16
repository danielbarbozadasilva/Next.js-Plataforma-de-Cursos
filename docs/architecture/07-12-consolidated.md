# 7-12. Documentação Consolidada

## 7. Pipeline de Vídeo e CDN

### Fluxo Completo de Upload até Playback

```mermaid
sequenceDiagram
    participant I as Instrutor
    participant API as Next.js API
    participant MUX as Mux API
    participant S3 as AWS S3
    participant Q as BullMQ
    participant W as Video Worker
    participant DB as PostgreSQL
    participant CDN as Mux CDN
    participant A as Aluno

    I->>API: POST /api/upload/video/url
    API->>MUX: Create Direct Upload
    MUX-->>API: Upload URL + Asset ID
    API->>DB: INSERT LessonAsset (status: PENDING)
    API-->>I: Upload URL

    I->>MUX: Upload file (resumable)
    MUX-->>I: Upload complete
    I->>API: POST /api/upload/confirm

    API->>DB: UPDATE LessonAsset (status: UPLOADED)
    API->>Q: Enqueue transcoding job
    API-->>I: 202 Accepted

    loop Every 2 minutes
        W->>Q: Dequeue job
        W->>MUX: GET /video/assets/:id
        MUX-->>W: Asset status

        alt Status: ready
            W->>DB: UPDATE LessonAsset (status: READY, playbackId)
            W->>API: Webhook notification
        else Status: errored
            W->>DB: UPDATE LessonAsset (status: ERROR)
            W->>Q: Move to DLQ
        end
    end

    A->>API: GET /api/lessons/:id
    API->>MUX: Generate signed URL (exp: 4h)
    MUX-->>API: Playback URL
    API-->>A: Lesson + Video URL

    A->>CDN: Request HLS stream
    CDN-->>A: Video segments (.m3u8, .ts)
```

### Configurações de Transcoding

```typescript
// Mux asset settings
{
  "playback_policy": ["signed"],
  "encoding_tier": "smart",
  "max_resolution_tier": "1080p",
  "mp4_support": "standard",
  "normalize_audio": true,
  "master_access": "none",
  "test": false
}
```

**Outputs gerados:**
- 240p, 360p, 480p, 720p, 1080p (HLS adaptativo)
- Thumbnail (estático e animado)
- Storyboard (VTT)
- Audio-only track

### Assinatura de URLs (Anti-Hotlink)

```typescript
import Mux from '@mux/mux-node'
const { JWT } = Mux

export function generateSignedPlaybackUrl(
  playbackId: string,
  options?: { expiresIn?: number }
): string {
  const token = JWT.sign(playbackId, {
    keyId: process.env.MUX_SIGNING_KEY_ID!,
    keySecret: process.env.MUX_SIGNING_KEY_SECRET!,
    expiration: options?.expiresIn || '4h',
    type: 'video',
  })

  return `https://stream.mux.com/${playbackId}.m3u8?token=${token}`
}
```

### DRM (Opcional - Não MVP)

**Widevine / FairPlay:**
```typescript
// Mux suporta nativamente
{
  "playback_policy": ["drm"],
  "drm_configuration": {
    "widevine": true,
    "fairplay": true
  }
}
```

**Custo adicional:** ~$0.005/stream

**Decisão MVP:** Usar apenas signed URLs com expiração de 4h.

### Storage e Lifecycle

| Bucket | Conteúdo | Lifecycle |
|--------|----------|-----------|
| `edtech-videos-raw` | Uploads originais | 7 dias → Glacier |
| `edtech-videos-backup` | HLS processados (backup Mux) | Permanent |
| `edtech-assets` | PDFs, attachments | Permanent |
| `edtech-certificates` | PDFs de certificados | Permanent |

### Custo Estimado de Vídeo

**Cenário:** 100 horas de vídeo + 10k visualizações/mês

| Item | Cálculo | Custo Mensal |
|------|---------|--------------|
| Encoding | 100h × 60min × $0.005/min | $30 |
| Storage | 100h × 2GB/h × $0.023/GB | $4.60 |
| Streaming | 10k views × 5min avg × $0.002/min | $100 |
| **Total** | | **$134.60** |

---

## 8. Pagamentos e Split

### Split Automático com Stripe Connect

```typescript
// Criar checkout com split
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [
    {
      price_data: {
        currency: 'brl',
        product_data: { name: course.title },
        unit_amount: course.price * 100,
      },
      quantity: 1,
    },
  ],
  payment_intent_data: {
    application_fee_amount: Math.floor(course.price * 100 * 0.3), // 30% plataforma
    transfer_data: {
      destination: instructor.stripeAccountId, // 70% instrutor
    },
  },
  metadata: {
    courseId: course.id,
    userId: user.id,
  },
  success_url: `${process.env.NEXT_PUBLIC_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.NEXT_PUBLIC_URL}/checkout/cancel`,
})
```

### Fórmula de Comissão

```typescript
const PLATFORM_FEE = 0.30 // 30%
const STRIPE_FEE = 0.0499 // 4.99%
const STRIPE_FIXED = 0.40 // R$ 0.40

function calculateSplit(grossAmount: number) {
  // Taxas Stripe deduzidas primeiro
  const stripeFee = grossAmount * STRIPE_FEE + STRIPE_FIXED
  const netAmount = grossAmount - stripeFee

  // Split do valor líquido
  const platformShare = netAmount * PLATFORM_FEE
  const instructorShare = netAmount * (1 - PLATFORM_FEE)

  return {
    grossAmount,
    stripeFee: Math.round(stripeFee * 100) / 100,
    netAmount: Math.round(netAmount * 100) / 100,
    platformShare: Math.round(platformShare * 100) / 100,
    instructorShare: Math.round(instructorShare * 100) / 100,
  }
}

// Exemplo: Curso de R$ 100
calculateSplit(100)
// {
//   grossAmount: 100,
//   stripeFee: 5.39,
//   netAmount: 94.61,
//   platformShare: 28.38,
//   instructorShare: 66.23
// }
```

### Processamento de Webhooks (Idempotente)

```typescript
export async function handleStripeWebhook(event: Stripe.Event) {
  // 1. Deduplicação
  const existing = await db.webhookEvent.findUnique({
    where: {
      provider_providerId: {
        provider: 'STRIPE',
        providerId: event.id,
      },
    },
  })

  if (existing?.status === 'PROCESSED') {
    console.log(`Event ${event.id} already processed`)
    return
  }

  // 2. Salvar evento
  await db.webhookEvent.upsert({
    where: {
      provider_providerId: {
        provider: 'STRIPE',
        providerId: event.id,
      },
    },
    create: {
      provider: 'STRIPE',
      eventType: event.type,
      providerId: event.id,
      payload: event,
      status: 'PROCESSING',
    },
    update: {
      attempts: { increment: 1 },
    },
  })

  try {
    // 3. Processar
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge)
        break
    }

    // 4. Marcar como processado
    await db.webhookEvent.update({
      where: {
        provider_providerId: {
          provider: 'STRIPE',
          providerId: event.id,
        },
      },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    })
  } catch (error) {
    // 5. Marcar como erro
    await db.webhookEvent.update({
      where: {
        provider_providerId: {
          provider: 'STRIPE',
          providerId: event.id,
        },
      },
      data: {
        status: 'FAILED',
        errorMessage: error.message,
      },
    })

    throw error
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { userId, courseId } = session.metadata!

  // Criar Order
  const order = await db.order.create({
    data: {
      userId,
      totalAmount: session.amount_total! / 100,
      status: 'PAID',
      gateway: 'STRIPE',
      gatewayTransactionId: session.payment_intent as string,
      items: {
        create: {
          courseId,
          priceAtPurchase: session.amount_total! / 100,
          currency: 'BRL',
        },
      },
    },
  })

  // Criar Payment
  await db.payment.create({
    data: {
      orderId: order.id,
      provider: 'STRIPE',
      providerPaymentId: session.payment_intent as string,
      amount: session.amount_total! / 100,
      currency: 'BRL',
      status: 'SUCCEEDED',
      paidAt: new Date(),
    },
  })

  // Criar Enrollment
  await db.enrollment.create({
    data: {
      userId,
      courseId,
      orderId: order.id,
    },
  })

  // Calcular e criar Payout
  const { instructorShare } = calculateSplit(session.amount_total! / 100)
  const course = await db.course.findUnique({ where: { id: courseId } })

  await db.payout.create({
    data: {
      instructorId: course!.instructorId,
      amount: instructorShare,
      currency: 'BRL',
      method: 'STRIPE_TRANSFER',
      status: 'PENDING',
      scheduledFor: addDays(new Date(), 7), // Payout após 7 dias
    },
  })

  // Incrementar saldo do instrutor
  await db.instructorProfile.update({
    where: { userId: course!.instructorId },
    data: {
      balance: { increment: instructorShare },
      totalEarnings: { increment: instructorShare },
    },
  })

  // Enviar email de confirmação
  await sendEmail({
    to: user.email,
    template: 'purchase-confirmation',
    data: { course, order },
  })
}
```

### Reembolso

```typescript
export async function requestRefund(paymentId: string, reason?: string) {
  const payment = await db.payment.findUnique({ where: { id: paymentId } })

  if (!payment || payment.status !== 'SUCCEEDED') {
    throw new Error('Payment not found or not refundable')
  }

  // Política: 30 dias para reembolso
  const daysSincePurchase = differenceInDays(new Date(), payment.paidAt!)
  if (daysSincePurchase > 30) {
    throw new Error('Refund period expired (30 days)')
  }

  // Criar refund no Stripe
  const stripeRefund = await stripe.refunds.create({
    payment_intent: payment.providerPaymentId,
    reason: 'requested_by_customer',
  })

  // Criar registro de Refund
  const refund = await db.refund.create({
    data: {
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      reason,
      status: 'PENDING',
      providerRefundId: stripeRefund.id,
    },
  })

  // Reverter enrollment
  await db.enrollment.updateMany({
    where: { orderId: payment.orderId },
    data: { deletedAt: new Date() },
  })

  // Reverter payout do instrutor (se ainda não processado)
  await db.payout.updateMany({
    where: {
      instructorId: payment.order.items[0].course.instructorId,
      status: 'PENDING',
    },
    data: {
      status: 'CANCELLED',
    },
  })

  // Decrementar saldo
  await db.instructorProfile.update({
    where: { userId: payment.order.items[0].course.instructorId },
    data: {
      balance: { decrement: payment.amount * 0.7 },
    },
  })

  return refund
}
```

### Reconciliação Financeira

```typescript
// Cron job diário
export async function reconcilePayments() {
  const yesterday = subDays(new Date(), 1)

  // Buscar transações Stripe do dia anterior
  const charges = await stripe.charges.list({
    created: {
      gte: Math.floor(yesterday.getTime() / 1000),
    },
    limit: 100,
  })

  for (const charge of charges.data) {
    const payment = await db.payment.findUnique({
      where: { providerPaymentId: charge.payment_intent as string },
    })

    if (!payment) {
      console.error(`Payment not found for charge ${charge.id}`)
      // Alertar equipe
      continue
    }

    // Verificar consistência
    const expected = Math.round(payment.amount * 100)
    const actual = charge.amount

    if (expected !== actual) {
      console.error(`Amount mismatch: expected ${expected}, got ${actual}`)
      // Alertar equipe
    }
  }
}
```

---

## 9. Busca e Descoberta

### Postgres Full-Text Search (MVP)

```sql
-- Criar índice GIN
CREATE INDEX idx_courses_search ON courses USING GIN (
  to_tsvector('portuguese', title || ' ' || description)
);

-- Query
SELECT
  id,
  title,
  ts_rank(
    to_tsvector('portuguese', title || ' ' || description),
    to_tsquery('portuguese', 'react & javascript')
  ) AS rank
FROM courses
WHERE to_tsvector('portuguese', title || ' ' || description) @@ to_tsquery('portuguese', 'react & javascript')
ORDER BY rank DESC
LIMIT 20;
```

```typescript
// Prisma raw query
export async function searchCourses(query: string, limit = 20) {
  return await db.$queryRaw`
    SELECT
      id,
      title,
      slug,
      subtitle,
      price,
      image_url,
      average_rating,
      enrollment_count,
      ts_rank(
        to_tsvector('portuguese', title || ' ' || description),
        plainto_tsquery('portuguese', ${query})
      ) AS rank
    FROM courses
    WHERE
      is_published = true
      AND to_tsvector('portuguese', title || ' ' || description) @@ plainto_tsquery('portuguese', ${query})
    ORDER BY rank DESC, enrollment_count DESC
    LIMIT ${limit}
  `
}
```

### Migração para Meilisearch (Quando > 5k cursos)

```typescript
import { MeiliSearch } from 'meilisearch'

const client = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST!,
  apiKey: process.env.MEILISEARCH_API_KEY!,
})

// Indexar cursos
export async function indexCourse(course: Course) {
  const index = client.index('courses')

  await index.addDocuments([
    {
      id: course.id,
      title: course.title,
      description: course.description,
      categoryId: course.categoryId,
      level: course.level,
      price: course.price,
      averageRating: course.averageRating,
      enrollmentCount: course.enrollmentCount,
    },
  ])
}

// Buscar
export async function searchWithMeilisearch(query: string, filters?: object) {
  const index = client.index('courses')

  const results = await index.search(query, {
    filter: filters,
    facets: ['category', 'level', 'price'],
    attributesToHighlight: ['title', 'description'],
    limit: 20,
  })

  return results
}
```

**Custo Meilisearch (self-hosted):**
- ECS Fargate: t4g.small → ~$15/mês
- Melhor que Algolia ($1/1000 searches)

---

## 10. SEO, i18n e A11y

### Estratégia SSR/SSG/ISR

| Página | Estratégia | Revalidate | Motivo |
|--------|-----------|------------|--------|
| Homepage | ISR | 3600s (1h) | Conteúdo semi-estático |
| Categoria | ISR | 3600s | Listagem de cursos |
| Curso detalhes | ISR | 1800s (30min) | Reviews/enrollment count atualizam |
| Aula (player) | SSR | - | Requer autenticação, dados dinâmicos |
| Dashboard aluno | SSR | - | Dados personalizados |
| Blog post | SSG | - | Conteúdo estático |
| Institucional | SSG | - | Raramente muda |

```typescript
// app/courses/[slug]/page.tsx
export const revalidate = 1800 // 30 minutos

export async function generateStaticParams() {
  const courses = await db.course.findMany({
    where: { isPublished: true },
    take: 100,
    orderBy: { enrollmentCount: 'desc' },
  })

  return courses.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const course = await getCourse(params.slug)

  return {
    title: `${course.title} | EdTech Platform`,
    description: course.subtitle,
    openGraph: {
      title: course.title,
      description: course.subtitle,
      images: [course.imageUrl],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: course.title,
      description: course.subtitle,
      images: [course.imageUrl],
    },
  }
}
```

### JSON-LD Schema

```typescript
export function generateCourseSchema(course: Course) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.description,
    provider: {
      '@type': 'Organization',
      name: 'EdTech Platform',
      sameAs: 'https://edtech.com',
    },
    instructor: {
      '@type': 'Person',
      name: course.instructor.name,
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: course.averageRating,
      reviewCount: course.reviewCount,
    },
    offers: {
      '@type': 'Offer',
      price: course.price,
      priceCurrency: 'BRL',
    },
  }
}

// Renderizar no <head>
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(generateCourseSchema(course)) }}
/>
```

### Sitemap e Robots

```typescript
// app/sitemap.ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const courses = await db.course.findMany({
    where: { isPublished: true },
    select: { slug: true, updatedAt: true },
  })

  return [
    {
      url: 'https://edtech.com',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...courses.map((c) => ({
      url: `https://edtech.com/courses/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}

// app/robots.ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/dashboard/'],
    },
    sitemap: 'https://edtech.com/sitemap.xml',
  }
}
```

### Internacionalização (i18n)

```typescript
// middleware.ts
import createMiddleware from 'next-intl/middleware'

export default createMiddleware({
  locales: ['pt-BR', 'en-US', 'es-ES'],
  defaultLocale: 'pt-BR',
  localePrefix: 'as-needed',
})

// messages/pt-BR.json
{
  "common": {
    "login": "Entrar",
    "signup": "Cadastrar",
    "courses": "Cursos"
  },
  "course": {
    "enroll": "Matricular",
    "price": "{price, number, ::currency/BRL}",
    "students": "{count, plural, =1 {# aluno} other {# alunos}}"
  }
}

// Uso
import { useTranslations } from 'next-intl'

function CourseCard({ course }) {
  const t = useTranslations('course')

  return (
    <div>
      <p>{t('price', { price: course.price })}</p>
      <p>{t('students', { count: course.enrollmentCount })}</p>
      <button>{t('enroll')}</button>
    </div>
  )
}
```

### Acessibilidade (WCAG 2.2 AA)

```typescript
// Player de vídeo acessível
<MuxPlayer
  playbackId={playbackId}
  streamType="on-demand"
  metadata={{
    video_title: lesson.title,
    video_id: lesson.id,
  }}
  accentColor="#0070f3"
  primaryColor="#ffffff"
  // Controles acessíveis via teclado
  hotkeys={{
    'Space': 'togglePlay',
    'ArrowLeft': 'seekBackward',
    'ArrowRight': 'seekForward',
    'ArrowUp': 'volumeUp',
    'ArrowDown': 'volumeDown',
  }}
>
  {/* Legendas */}
  <track
    kind="subtitles"
    src={`/api/subtitles/${lesson.id}/pt-BR.vtt`}
    srcLang="pt-BR"
    label="Português (Brasil)"
    default
  />
</MuxPlayer>
```

**Checklist:**
- [ ] Contraste de cores 4.5:1 mínimo
- [ ] Navegação por teclado (Tab, Enter, Esc)
- [ ] Focus indicators visíveis
- [ ] ARIA labels em ícones/botões sem texto
- [ ] Headings hierárquicos (h1 → h2 → h3)
- [ ] Formulários com labels associados
- [ ] Mensagens de erro descritivas
- [ ] Skip links (pular para conteúdo)

---

## 11. Observabilidade, SRE e Resiliência

### Métricas-Chave (Golden Signals)

```typescript
// lib/metrics.ts
import { Counter, Histogram, Gauge } from 'prom-client'

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 1, 3, 5],
})

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
})

export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
})

export const activeEnrollments = new Gauge({
  name: 'active_enrollments_total',
  help: 'Total number of active enrollments',
})

export const videoTranscodingDuration = new Histogram({
  name: 'video_transcoding_duration_seconds',
  help: 'Duration of video transcoding',
  buckets: [60, 300, 600, 1800, 3600],
})
```

### Health Checks

```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    mux: await checkMux(),
    stripe: await checkStripe(),
  }

  const healthy = Object.values(checks).every((c) => c.healthy)

  return Response.json(
    {
      status: healthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
      uptime: process.uptime(),
    },
    { status: healthy ? 200 : 503 }
  )
}

async function checkDatabase() {
  try {
    await db.$queryRaw`SELECT 1`
    return { healthy: true, latency: 5 }
  } catch (error) {
    return { healthy: false, error: error.message }
  }
}
```

### Circuit Breaker

```typescript
import CircuitBreaker from 'opossum'

const options = {
  timeout: 3000, // 3s
  errorThresholdPercentage: 50, // 50% de erros
  resetTimeout: 30000, // 30s para tentar novamente
}

const muxBreaker = new CircuitBreaker(async (assetId: string) => {
  return await mux.video.assets.retrieve(assetId)
}, options)

muxBreaker.on('open', () => {
  console.error('Circuit breaker opened for Mux')
  // Alertar equipe
})

// Uso
const asset = await muxBreaker.fire(assetId)
```

### SLOs

| Métrica | Target MVP | Target Escala |
|---------|------------|---------------|
| Uptime API | 99.9% (43min/mês) | 99.95% |
| Latência API p95 | < 300ms | < 200ms |
| Latência SSR p95 | < 800ms | < 500ms |
| Video Start Time p95 | < 3s | < 2s |
| Transcoding SLA | < 15min (95%) | < 10min |
| Webhook Processing | < 30s (95%) | < 10s |

---

## 12. DevEx, CI/CD e Ambientes

### Estrutura de Monorepo

```
edtech-platform/
├── apps/
│   └── web/                # Next.js app
├── packages/
│   ├── database/           # Prisma schema, seeds, migrations
│   ├── ui/                 # Shared React components
│   ├── utils/              # Shared utilities
│   ├── config/             # Shared configs (ESLint, TS, etc.)
│   └── types/              # Shared TypeScript types
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── deploy-staging.yml
│       └── deploy-prod.yml
└── package.json
```

### Pipeline CI/CD

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test -- --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e

  deploy-preview:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

### Ambientes

| Ambiente | Branch | Deploy | Database | URL |
|----------|--------|--------|----------|-----|
| **Development** | feature/* | Manual (local) | Local/Docker | localhost:3000 |
| **Preview** | PR | Auto (Vercel) | Staging DB | pr-123-edtech.vercel.app |
| **Staging** | develop | Auto | Staging DB | staging.edtech.com |
| **Production** | main | Manual (aprovação) | Prod DB | edtech.com |

### Variáveis de Ambiente

```bash
# .env.example
DATABASE_URL="postgresql://user:pass@localhost:5432/edtech"
REDIS_URL="redis://localhost:6379"

NEXTAUTH_SECRET="xxx"
NEXTAUTH_URL="http://localhost:3000"

STRIPE_PUBLIC_KEY="pk_test_xxx"
STRIPE_SECRET_KEY="sk_test_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"

MUX_TOKEN_ID="xxx"
MUX_TOKEN_SECRET="xxx"
MUX_SIGNING_KEY_ID="xxx"
MUX_SIGNING_KEY_SECRET="xxx"

AWS_ACCESS_KEY_ID="xxx"
AWS_SECRET_ACCESS_KEY="xxx"
AWS_REGION="us-east-1"
S3_BUCKET_NAME="edtech-videos"

RESEND_API_KEY="re_xxx"

SENTRY_DSN="https://xxx@sentry.io/xxx"
```

### Migrations

```bash
# Desenvolvimento
npx prisma migrate dev --name add_lesson_progress

# Staging/Produção
npx prisma migrate deploy

# Rollback (manual)
npx prisma migrate resolve --rolled-back 20241116_add_lesson_progress
```

### Seed de Dados

```typescript
// prisma/seed.ts
async function main() {
  // Admin user
  await db.user.upsert({
    where: { email: 'admin@edtech.com' },
    update: {},
    create: {
      email: 'admin@edtech.com',
      name: 'Admin',
      role: 'ADMIN',
      passwordHash: await hashPassword('Admin@123'),
    },
  })

  // Categorias
  const categories = ['Desenvolvimento', 'Design', 'Marketing', 'Negócios']
  for (const name of categories) {
    await db.category.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { name, slug: slugify(name) },
    })
  }

  console.log('✅ Seed completed')
}

main()
```

### Geração de Tipos

```bash
# Gerar tipos do Prisma
npx prisma generate

# Gerar tipos de API (OpenAPI → TS)
npx openapi-typescript ./openapi.yaml -o ./types/api.ts
```

---

**Próximo Documento:** Backlog e Roadmap
