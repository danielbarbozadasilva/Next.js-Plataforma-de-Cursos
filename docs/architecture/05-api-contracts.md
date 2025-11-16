# 5. APIs HTTP (REST) e Contratos

## Convenções Gerais

### URL Pattern
```
/api/v1/{resource}/{id?}/{action?}
```

### HTTP Methods
- **GET:** Leitura (idempotente, cacheable)
- **POST:** Criação
- **PUT:** Substituição completa
- **PATCH:** Atualização parcial
- **DELETE:** Exclusão

### Response Format
```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2024-11-16T10:30:00Z",
    "requestId": "req_abc123"
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "hasMore": true
  }
}
```

### Error Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-11-16T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

## Endpoints por Módulo

### Autenticação

| Método | Endpoint | Autenticação | Descrição |
|--------|----------|--------------|-----------|
| POST | `/api/v1/auth/register` | Não | Registro de novo usuário |
| POST | `/api/v1/auth/login` | Não | Login (email + senha) |
| POST | `/api/v1/auth/logout` | JWT | Logout |
| POST | `/api/v1/auth/refresh` | Refresh Token | Renovar access token |
| POST | `/api/v1/auth/forgot-password` | Não | Solicitar reset de senha |
| POST | `/api/v1/auth/reset-password` | Token | Resetar senha |
| POST | `/api/v1/auth/verify-email` | Token | Verificar email |
| GET | `/api/v1/auth/me` | JWT | Dados do usuário logado |

**Exemplo:** POST `/api/v1/auth/register`

**Request:**
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "Senha@123",
  "role": "STUDENT",
  "privacyConsent": true
}
```

**Response:** 201 Created
```json
{
  "data": {
    "user": {
      "id": "usr_abc123",
      "name": "João Silva",
      "email": "joao@example.com",
      "role": "STUDENT"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": 3600
    }
  }
}
```

### Cursos

| Método | Endpoint | Auth | RBAC | Descrição |
|--------|----------|------|------|-----------|
| GET | `/api/v1/courses` | Não | - | Listar cursos publicados |
| GET | `/api/v1/courses/:id` | Não | - | Detalhes do curso |
| POST | `/api/v1/courses` | JWT | INSTRUCTOR, ADMIN | Criar curso |
| PATCH | `/api/v1/courses/:id` | JWT | INSTRUCTOR (owner), ADMIN | Atualizar curso |
| DELETE | `/api/v1/courses/:id` | JWT | INSTRUCTOR (owner), ADMIN | Deletar curso |
| POST | `/api/v1/courses/:id/publish` | JWT | INSTRUCTOR (owner), ADMIN | Publicar curso |
| GET | `/api/v1/courses/:id/curriculum` | Não | - | Grade curricular |
| GET | `/api/v1/courses/:id/reviews` | Não | - | Avaliações |

**Exemplo:** GET `/api/v1/courses?category=dev&level=BEGINNER&page=1&limit=20`

**Query Params:**
- `category` (string): Slug da categoria
- `level` (enum): BEGINNER | INTERMEDIATE | ADVANCED | ALL_LEVELS
- `price_min` (number): Preço mínimo
- `price_max` (number): Preço máximo
- `rating_min` (number): Avaliação mínima (1-5)
- `search` (string): Busca textual (título, descrição)
- `sort` (string): `popular`, `newest`, `price_asc`, `price_desc`, `rating`
- `page` (number): Página (default: 1)
- `limit` (number): Itens por página (default: 20, max: 100)

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "crs_abc123",
      "title": "Introdução ao React",
      "slug": "intro-react-xk92j",
      "subtitle": "Aprenda React do zero",
      "price": 99.90,
      "originalPrice": 199.90,
      "level": "BEGINNER",
      "imageUrl": "https://cdn.example.com/courses/intro-react.jpg",
      "averageRating": 4.7,
      "reviewCount": 1250,
      "enrollmentCount": 5420,
      "totalDuration": 18000,
      "totalLessons": 85,
      "instructor": {
        "id": "usr_xyz789",
        "name": "Maria Santos",
        "image": "https://cdn.example.com/users/maria.jpg"
      },
      "category": {
        "id": "cat_dev",
        "name": "Desenvolvimento",
        "slug": "desenvolvimento"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "hasMore": true
  }
}
```

### Matrículas (Enrollments)

| Método | Endpoint | Auth | RBAC | Descrição |
|--------|----------|------|------|-----------|
| GET | `/api/v1/enrollments` | JWT | STUDENT (own) | Meus cursos |
| GET | `/api/v1/enrollments/:id` | JWT | STUDENT (own) | Detalhes da matrícula |
| POST | `/api/v1/enrollments` | JWT | ADMIN | Matrícula manual (admin) |
| GET | `/api/v1/enrollments/:id/progress` | JWT | STUDENT (own) | Progresso detalhado |

### Progresso de Aulas

| Método | Endpoint | Auth | RBAC | Descrição |
|--------|----------|------|------|-----------|
| GET | `/api/v1/lessons/:id` | JWT | STUDENT (enrolled) | Detalhes da aula |
| POST | `/api/v1/lessons/:id/progress` | JWT | STUDENT (enrolled) | Atualizar progresso |
| POST | `/api/v1/lessons/:id/complete` | JWT | STUDENT (enrolled) | Marcar como completa |

**Exemplo:** POST `/api/v1/lessons/:id/progress`

**Request:**
```json
{
  "watchedDuration": 450,
  "totalDuration": 600
}
```

**Response:** 200 OK
```json
{
  "data": {
    "lessonId": "lsn_abc123",
    "watchedDuration": 450,
    "progress": 75,
    "isCompleted": false
  }
}
```

### Pagamentos e Checkout

| Método | Endpoint | Auth | RBAC | Descrição |
|--------|----------|------|------|-----------|
| POST | `/api/v1/checkout/create-session` | JWT | STUDENT | Iniciar checkout (Stripe) |
| POST | `/api/v1/webhooks/stripe` | Não | - | Webhook Stripe |
| POST | `/api/v1/webhooks/mercadopago` | Não | - | Webhook Mercado Pago |
| GET | `/api/v1/orders` | JWT | STUDENT (own) | Meus pedidos |
| GET | `/api/v1/orders/:id` | JWT | STUDENT (own) | Detalhes do pedido |
| POST | `/api/v1/refunds/:paymentId` | JWT | STUDENT (own), ADMIN | Solicitar reembolso |

**Exemplo:** POST `/api/v1/checkout/create-session`

**Request:**
```json
{
  "items": [
    { "courseId": "crs_abc123" },
    { "courseId": "crs_def456" }
  ],
  "couponCode": "BLACKFRIDAY2024",
  "successUrl": "https://app.com/checkout/success",
  "cancelUrl": "https://app.com/checkout/cancel"
}
```

**Response:** 200 OK
```json
{
  "data": {
    "sessionId": "cs_abc123",
    "url": "https://checkout.stripe.com/c/pay/cs_abc123",
    "orderId": "ord_xyz789",
    "subtotal": 199.80,
    "discountAmount": 39.96,
    "total": 159.84
  }
}
```

### Upload de Vídeo

| Método | Endpoint | Auth | RBAC | Descrição |
|--------|----------|------|------|-----------|
| POST | `/api/v1/upload/video/url` | JWT | INSTRUCTOR | Obter URL de upload (Mux) |
| POST | `/api/v1/upload/video/confirm` | JWT | INSTRUCTOR | Confirmar upload concluído |
| GET | `/api/v1/assets/:id/status` | JWT | INSTRUCTOR (owner) | Status do processamento |
| POST | `/api/v1/webhooks/mux` | Não | - | Webhook Mux |

**Exemplo:** POST `/api/v1/upload/video/url`

**Request:**
```json
{
  "lessonId": "lsn_abc123",
  "fileName": "aula-01-introducao.mp4",
  "fileSize": 524288000
}
```

**Response:** 200 OK
```json
{
  "data": {
    "uploadUrl": "https://storage.mux.com/abc123?signature=...",
    "assetId": "ast_abc123",
    "uploadId": "upd_xyz789",
    "expiresAt": "2024-11-16T12:00:00Z"
  }
}
```

### Busca

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/api/v1/search/courses` | Não | Busca global de cursos |
| GET | `/api/v1/search/suggest` | Não | Sugestões de busca |

**Exemplo:** GET `/api/v1/search/courses?q=javascript+react&filters[level]=BEGINNER`

**Response:** 200 OK
```json
{
  "data": {
    "results": [
      {
        "id": "crs_abc123",
        "title": "JavaScript Moderno e React",
        "snippet": "Aprenda <mark>JavaScript</mark> ES6+ e <mark>React</mark>...",
        "score": 0.95
      }
    ],
    "facets": {
      "category": {
        "Desenvolvimento": 45,
        "Frontend": 32
      },
      "level": {
        "BEGINNER": 28,
        "INTERMEDIATE": 15
      },
      "price": {
        "0-50": 10,
        "50-100": 20,
        "100+": 15
      }
    },
    "total": 45,
    "took": 12
  }
}
```

### Analytics (Instrutor)

| Método | Endpoint | Auth | RBAC | Descrição |
|--------|----------|------|------|-----------|
| GET | `/api/v1/analytics/courses/:id/overview` | JWT | INSTRUCTOR (owner), ADMIN | Overview do curso |
| GET | `/api/v1/analytics/courses/:id/students` | JWT | INSTRUCTOR (owner), ADMIN | Lista de alunos |
| GET | `/api/v1/analytics/courses/:id/revenue` | JWT | INSTRUCTOR (owner), ADMIN | Receita e comissões |
| GET | `/api/v1/analytics/instructor/dashboard` | JWT | INSTRUCTOR | Dashboard geral |

**Exemplo:** GET `/api/v1/analytics/courses/:id/overview?period=30d`

**Response:** 200 OK
```json
{
  "data": {
    "enrollments": {
      "total": 1250,
      "change": "+15.2%"
    },
    "revenue": {
      "total": 87450.00,
      "instructorShare": 61215.00,
      "change": "+22.8%"
    },
    "completion": {
      "rate": 68.5,
      "avgProgress": 52.3
    },
    "engagement": {
      "avgWatchTime": 42.5,
      "activeStudents": 720
    },
    "reviews": {
      "avgRating": 4.7,
      "total": 450
    }
  }
}
```

## Paginação

### Cursor-based (recomendado para feeds)
```
GET /api/v1/courses?cursor=eyJpZCI6ImNyc19hYmMxMjMifQ&limit=20
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "nextCursor": "eyJpZCI6ImNyc19kZWY0NTYifQ",
    "hasMore": true
  }
}
```

### Offset-based (padrão)
```
GET /api/v1/courses?page=2&limit=20
```

## Ordenação

```
GET /api/v1/courses?sort=price:asc,rating:desc
```

## Filtros

```
GET /api/v1/courses?filters[level]=BEGINNER&filters[price][gte]=50&filters[price][lte]=150
```

## Idempotência

Endpoints de criação/modificação aceitam header:
```
Idempotency-Key: {uuid}
```

Armazenamento em Redis (24h TTL):
```typescript
const key = `idempotency:${idempotencyKey}`
const cached = await redis.get(key)

if (cached) {
  return JSON.parse(cached) // Retorna resposta anterior
}

const response = await processRequest()
await redis.setex(key, 86400, JSON.stringify(response))
return response
```

## Webhooks

### Stripe

**URL:** `https://api.yourdomain.com/api/v1/webhooks/stripe`

**Events:**
- `checkout.session.completed` → Criar Order + Enrollment
- `payment_intent.succeeded` → Atualizar Payment status
- `payment_intent.payment_failed` → Atualizar Payment status
- `charge.refunded` → Criar Refund
- `account.updated` → Atualizar InstructorProfile

**Verificação:**
```typescript
import Stripe from 'stripe'

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  const event = stripe.webhooks.constructEvent(
    body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET!
  )

  // Idempotência
  const existing = await db.webhookEvent.findUnique({
    where: {
      provider_providerId: {
        provider: 'STRIPE',
        providerId: event.id,
      },
    },
  })

  if (existing) {
    return Response.json({ received: true })
  }

  // Processar evento
  await handleStripeEvent(event)

  return Response.json({ received: true })
}
```

### Mercado Pago

**URL:** `https://api.yourdomain.com/api/v1/webhooks/mercadopago`

**Events:**
- `payment.created`
- `payment.updated`

**Verificação:**
```typescript
const signature = req.headers.get('x-signature')
const requestId = req.headers.get('x-request-id')

// Verificar HMAC
const hmac = crypto
  .createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET!)
  .update(`${requestId}${JSON.stringify(body)}`)
  .digest('hex')

if (hmac !== signature) {
  return Response.json({ error: 'Invalid signature' }, { status: 401 })
}
```

### Mux

**URL:** `https://api.yourdomain.com/api/v1/webhooks/mux`

**Events:**
- `video.asset.created`
- `video.asset.ready`
- `video.asset.errored`
- `video.upload.asset_created`
- `video.upload.cancelled`
- `video.upload.errored`

**Verificação:**
```typescript
import Mux from '@mux/mux-node'

const { Webhooks } = Mux

const isValid = Webhooks.verifyHeader(
  await req.text(),
  req.headers.get('mux-signature')!,
  process.env.MUX_WEBHOOK_SECRET!
)

if (!isValid) {
  return Response.json({ error: 'Invalid signature' }, { status: 401 })
}
```

## Rate Limits

| Endpoint Pattern | Limite | Janela |
|------------------|--------|--------|
| `/api/v1/auth/login` | 5 | 15min (IP) |
| `/api/v1/auth/register` | 3 | 1h (IP) |
| `/api/v1/upload/*` | 10 | 1h (user) |
| `/api/v1/*` (autenticado) | 100 | 1min (user) |
| `/api/v1/*` (público) | 20 | 1min (IP) |

**Headers de resposta:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1700140800
```

## Versionamento

**Estratégia:** URL-based (`/api/v1/`, `/api/v2/`)

**Deprecation:** Headers customizados
```
Deprecation: true
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Link: </api/v2/courses>; rel="successor-version"
```

---

**Próximo Documento:** Realtime (Socket.io)
