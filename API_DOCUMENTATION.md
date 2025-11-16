# API Documentation - EAD Platform

## Base URL
- **Development:** `http://localhost:3000/api`
- **Production:** `https://ead-platform.com/api`

## Autenticação

Todas as rotas protegidas requerem autenticação via **JWT** (gerenciado pelo NextAuth.js).

### Headers
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Obter Token
```typescript
// Cliente: usar useSession do next-auth/react
import { useSession } from 'next-auth/react'

const { data: session } = useSession()
const token = session?.accessToken
```

---

## 1. Autenticação

### POST /api/auth/register
Registrar novo usuário.

**Request:**
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "senha123",
  "role": "STUDENT" // STUDENT | INSTRUCTOR
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": "clxxx123",
    "name": "João Silva",
    "email": "joao@example.com",
    "role": "STUDENT"
  },
  "message": "Usuário criado. Verifique seu email."
}
```

**Errors:**
- `400` - Email já cadastrado
- `422` - Validação falhou

---

### POST /api/auth/login
Login (via NextAuth Credentials Provider).

**Request:**
```json
{
  "email": "joao@example.com",
  "password": "senha123"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "clxxx123",
    "email": "joao@example.com",
    "name": "João Silva",
    "role": "STUDENT"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### POST /api/auth/forgot-password
Solicitar reset de senha.

**Request:**
```json
{
  "email": "joao@example.com"
}
```

**Response:** `200 OK`
```json
{
  "message": "Email de recuperação enviado."
}
```

---

### POST /api/auth/reset-password
Redefinir senha com token.

**Request:**
```json
{
  "token": "reset_token_xyz",
  "password": "novaSenha123"
}
```

**Response:** `200 OK`
```json
{
  "message": "Senha redefinida com sucesso."
}
```

---

## 2. Cursos (Público)

### GET /api/courses
Listar cursos publicados (com paginação e filtros).

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `category` - Slug da categoria
- `level` - BEGINNER | INTERMEDIATE | ADVANCED
- `priceMin` - Preço mínimo
- `priceMax` - Preço máximo
- `search` - Busca full-text
- `sort` - popularity | rating | newest | price_asc | price_desc

**Request:**
```http
GET /api/courses?page=1&limit=12&category=desenvolvimento-web&level=INTERMEDIATE&sort=rating
```

**Response:** `200 OK`
```json
{
  "courses": [
    {
      "id": "course_123",
      "slug": "react-avancado",
      "title": "React Avançado",
      "subtitle": "Hooks, Context, Performance",
      "thumbnailUrl": "https://cdn.example.com/thumb.jpg",
      "price": 199.90,
      "comparePrice": 299.90,
      "currency": "BRL",
      "level": "INTERMEDIATE",
      "averageRating": 4.8,
      "enrollmentCount": 1234,
      "totalDuration": 720,
      "instructor": {
        "id": "user_789",
        "name": "Maria Santos",
        "image": "https://cdn.example.com/avatar.jpg"
      },
      "categories": [
        { "id": "cat_1", "name": "Desenvolvimento Web", "slug": "desenvolvimento-web" }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 45,
    "totalPages": 4
  }
}
```

---

### GET /api/courses/[slug]
Detalhes do curso.

**Response:** `200 OK`
```json
{
  "id": "course_123",
  "slug": "react-avancado",
  "title": "React Avançado",
  "description": "Aprenda React em profundidade...",
  "thumbnailUrl": "https://...",
  "promoVideoUrl": "https://stream.mux.com/xxx.m3u8",
  "price": 199.90,
  "level": "INTERMEDIATE",
  "language": "pt-BR",
  "instructor": {
    "id": "user_789",
    "name": "Maria Santos",
    "bio": "Desenvolvedora há 10 anos...",
    "image": "https://..."
  },
  "modules": [
    {
      "id": "module_1",
      "title": "Introdução",
      "order": 0,
      "lessons": [
        {
          "id": "lesson_1",
          "title": "Bem-vindo ao curso",
          "type": "VIDEO",
          "duration": 300,
          "isFree": true
        }
      ]
    }
  ],
  "requirements": [
    "JavaScript ES6+",
    "HTML e CSS básico"
  ],
  "learningGoals": [
    "Dominar React Hooks",
    "Otimizar performance"
  ],
  "targetAudience": [
    "Desenvolvedores com conhecimento básico de React"
  ],
  "stats": {
    "enrollmentCount": 1234,
    "averageRating": 4.8,
    "reviewCount": 456,
    "totalDuration": 720
  }
}
```

**Errors:**
- `404` - Curso não encontrado

---

### GET /api/courses/[id]/reviews
Reviews do curso.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)
- `rating` - Filtrar por nota (1-5)

**Response:** `200 OK`
```json
{
  "reviews": [
    {
      "id": "review_1",
      "rating": 5,
      "title": "Excelente curso!",
      "content": "Aprendi muito sobre React Hooks...",
      "user": {
        "name": "Pedro Costa",
        "image": "https://..."
      },
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ],
  "stats": {
    "averageRating": 4.8,
    "totalReviews": 456,
    "distribution": {
      "5": 320,
      "4": 100,
      "3": 20,
      "2": 10,
      "1": 6
    }
  }
}
```

---

## 3. Cursos (Instrutor)

### POST /api/instructor/courses
Criar novo curso (rascunho).

**Auth:** Requer role `INSTRUCTOR` ou `ADMIN`

**Request:**
```json
{
  "title": "Node.js para Iniciantes",
  "subtitle": "Do zero ao deploy",
  "description": "Aprenda Node.js...",
  "level": "BEGINNER",
  "categoryIds": ["cat_1", "cat_2"],
  "language": "pt-BR"
}
```

**Response:** `201 Created`
```json
{
  "course": {
    "id": "course_new",
    "slug": "nodejs-para-iniciantes",
    "title": "Node.js para Iniciantes",
    "status": "DRAFT",
    "createdAt": "2025-01-16T..."
  }
}
```

---

### PUT /api/instructor/courses/[id]
Atualizar curso.

**Request:**
```json
{
  "title": "Node.js Completo",
  "price": 149.90,
  "comparePrice": 249.90
}
```

**Response:** `200 OK`

---

### DELETE /api/instructor/courses/[id]
Deletar curso (apenas se não tiver matrículas).

**Response:** `204 No Content`

**Errors:**
- `403` - Curso possui matrículas ativas
- `404` - Curso não encontrado

---

### POST /api/instructor/courses/[id]/modules
Criar módulo no curso.

**Request:**
```json
{
  "title": "Fundamentos do Node.js",
  "description": "Aprenda os conceitos básicos",
  "order": 0
}
```

**Response:** `201 Created`

---

### POST /api/instructor/courses/[courseId]/modules/[moduleId]/lessons
Criar aula no módulo.

**Request:**
```json
{
  "title": "O que é Node.js?",
  "type": "VIDEO",
  "description": "Introdução ao Node.js",
  "order": 0,
  "isFree": true
}
```

**Response:** `201 Created`

---

### POST /api/instructor/upload-video
Upload de vídeo para Mux (direct upload).

**Request:**
```json
{
  "lessonId": "lesson_123"
}
```

**Response:** `200 OK`
```json
{
  "uploadUrl": "https://storage.mux.com/xxx?token=yyy",
  "assetId": "mux_asset_abc"
}
```

**Uso:**
```typescript
// Cliente: fazer PUT direto para uploadUrl
const file = document.querySelector('input[type="file"]').files[0]

await fetch(uploadUrl, {
  method: 'PUT',
  body: file,
  headers: {
    'Content-Type': file.type
  }
})

// Mux processa e notifica via webhook
```

---

### PUT /api/instructor/courses/[id]/publish
Submeter curso para revisão.

**Response:** `200 OK`
```json
{
  "course": {
    "id": "course_123",
    "status": "PENDING_REVIEW"
  },
  "message": "Curso enviado para aprovação."
}
```

**Errors:**
- `400` - Curso não possui módulos/aulas
- `400` - Preço não definido

---

### GET /api/instructor/analytics
Analytics do instrutor.

**Query Parameters:**
- `period` - 7d | 30d | 90d | all (default: 30d)

**Response:** `200 OK`
```json
{
  "summary": {
    "totalRevenue": 15430.50,
    "totalStudents": 234,
    "totalCourses": 5,
    "averageRating": 4.7
  },
  "revenueByDay": [
    { "date": "2025-01-10", "amount": 450.00 },
    { "date": "2025-01-11", "amount": 680.00 }
  ],
  "topCourses": [
    {
      "id": "course_1",
      "title": "React Avançado",
      "revenue": 8900.00,
      "students": 120,
      "rating": 4.8
    }
  ],
  "enrollmentsTrend": [
    { "date": "2025-01-10", "count": 5 },
    { "date": "2025-01-11", "count": 8 }
  ]
}
```

---

## 4. Matrículas (Aluno)

### GET /api/enrollments/my-courses
Cursos do aluno.

**Auth:** Requer autenticação

**Response:** `200 OK`
```json
{
  "enrollments": [
    {
      "id": "enroll_1",
      "status": "ACTIVE",
      "progress": 45,
      "course": {
        "id": "course_123",
        "title": "React Avançado",
        "thumbnailUrl": "https://...",
        "totalDuration": 720
      },
      "enrolledAt": "2025-01-10T...",
      "lastWatchedLesson": {
        "id": "lesson_5",
        "title": "useState Hook"
      }
    }
  ]
}
```

---

### POST /api/enrollments/[enrollmentId]/progress
Atualizar progresso da aula.

**Request:**
```json
{
  "lessonId": "lesson_5",
  "progress": 75,
  "watchedSeconds": 225,
  "completed": false
}
```

**Response:** `200 OK`

---

### POST /api/enrollments/[enrollmentId]/complete-lesson
Marcar aula como completa.

**Request:**
```json
{
  "lessonId": "lesson_5"
}
```

**Response:** `200 OK`
```json
{
  "watchProgress": {
    "lessonId": "lesson_5",
    "completed": true,
    "completedAt": "2025-01-16T..."
  },
  "courseProgress": 50
}
```

---

### GET /api/enrollments/[enrollmentId]/certificate
Obter certificado (se curso completo).

**Response:** `200 OK`
```json
{
  "certificate": {
    "id": "cert_123",
    "certificateNumber": "EAD-2025-001234",
    "pdfUrl": "https://cdn.example.com/certificates/cert_123.pdf",
    "issuedAt": "2025-01-16T..."
  }
}
```

**Errors:**
- `400` - Curso ainda não completo

---

## 5. Pagamentos

### POST /api/payments/create-intent
Criar Payment Intent (Stripe).

**Request:**
```json
{
  "courseId": "course_123",
  "couponCode": "PROMO20"
}
```

**Response:** `200 OK`
```json
{
  "paymentIntent": {
    "id": "pi_xxx",
    "clientSecret": "pi_xxx_secret_yyy",
    "amount": 15990,
    "currency": "brl"
  },
  "discount": {
    "original": 199.90,
    "final": 159.90,
    "saved": 40.00
  }
}
```

---

### POST /api/payments/checkout
Finalizar compra (após pagamento confirmado).

**Request:**
```json
{
  "paymentIntentId": "pi_xxx"
}
```

**Response:** `200 OK`
```json
{
  "enrollment": {
    "id": "enroll_new",
    "courseId": "course_123",
    "status": "ACTIVE"
  },
  "message": "Matrícula confirmada!"
}
```

---

### POST /api/payments/webhook
Webhook do Stripe (processar eventos).

**Headers:**
```http
stripe-signature: t=xxx,v1=yyy
```

**Request Body:** Raw event from Stripe

**Eventos Processados:**
- `payment_intent.succeeded` → Criar enrollment
- `payment_intent.payment_failed` → Notificar falha
- `charge.refunded` → Cancelar enrollment

**Response:** `200 OK`

---

### GET /api/payments/history
Histórico de pagamentos do usuário.

**Response:** `200 OK`
```json
{
  "payments": [
    {
      "id": "pay_1",
      "amount": 199.90,
      "currency": "BRL",
      "status": "SUCCEEDED",
      "course": {
        "title": "React Avançado"
      },
      "createdAt": "2025-01-10T..."
    }
  ]
}
```

---

## 6. Reviews

### POST /api/courses/[courseId]/reviews
Criar review (apenas se matriculado).

**Request:**
```json
{
  "rating": 5,
  "title": "Curso excelente!",
  "content": "Aprendi muito com este curso..."
}
```

**Response:** `201 Created`

---

### PUT /api/reviews/[id]
Editar review.

**Request:**
```json
{
  "rating": 4,
  "content": "Atualização: ainda muito bom!"
}
```

**Response:** `200 OK`

---

### DELETE /api/reviews/[id]
Deletar review.

**Response:** `204 No Content`

---

## 7. Chat (via Socket.io)

**URL:** `ws://localhost:3001` ou `wss://socket.ead-platform.com`

### Events (Client → Server)

#### join_room
Entrar em sala de chat do curso.

```typescript
socket.emit('join_room', {
  roomId: 'course:course_123'
})
```

---

#### send_message
Enviar mensagem.

```typescript
socket.emit('send_message', {
  roomId: 'course:course_123',
  content: 'Olá, tenho uma dúvida...'
})
```

---

#### typing_start
Indicar que está digitando.

```typescript
socket.emit('typing_start', {
  roomId: 'course:course_123'
})
```

---

#### typing_stop
Parar indicador de digitação.

```typescript
socket.emit('typing_stop', {
  roomId: 'course:course_123'
})
```

---

### Events (Server → Client)

#### room_history
Mensagens históricas ao entrar na sala.

```typescript
socket.on('room_history', (messages) => {
  console.log(messages) // Array de mensagens
})
```

---

#### new_message
Nova mensagem na sala.

```typescript
socket.on('new_message', (message) => {
  console.log(message)
  /*
  {
    id: 'msg_123',
    roomId: 'course:course_123',
    sender: {
      id: 'user_789',
      name: 'João Silva',
      image: 'https://...'
    },
    content: 'Olá!',
    createdAt: '2025-01-16T...'
  }
  */
})
```

---

#### user_typing
Outro usuário está digitando.

```typescript
socket.on('user_typing', (data) => {
  console.log(`${data.userName} está digitando...`)
})
```

---

#### notification
Notificação em tempo real.

```typescript
socket.on('notification', (notification) => {
  console.log(notification)
  /*
  {
    type: 'NEW_REVIEW',
    title: 'Nova avaliação!',
    message: 'João Silva avaliou seu curso.',
    actionUrl: '/instructor/courses/123/reviews'
  }
  */
})
```

---

## 8. Admin

### GET /api/admin/dashboard
Dashboard administrativo.

**Auth:** Requer role `ADMIN`

**Response:** `200 OK`
```json
{
  "metrics": {
    "totalRevenue": 125430.50,
    "platformFee": 37629.15,
    "totalUsers": 5432,
    "totalCourses": 234,
    "pendingCourses": 12,
    "activeCourses": 198
  },
  "recentTransactions": [...],
  "topInstructors": [...]
}
```

---

### GET /api/admin/courses/pending
Cursos aguardando aprovação.

**Response:** `200 OK`
```json
{
  "courses": [
    {
      "id": "course_pending",
      "title": "Python Avançado",
      "instructor": {
        "name": "Carlos Souza"
      },
      "submittedAt": "2025-01-15T..."
    }
  ]
}
```

---

### PUT /api/admin/courses/[id]/approve
Aprovar curso.

**Response:** `200 OK`

---

### PUT /api/admin/courses/[id]/reject
Rejeitar curso.

**Request:**
```json
{
  "reason": "Conteúdo inadequado ou de baixa qualidade."
}
```

**Response:** `200 OK`

---

### GET /api/admin/users
Listar usuários.

**Query Parameters:**
- `page`, `limit`, `search`, `role`, `status`

**Response:** `200 OK`

---

### PUT /api/admin/users/[id]/ban
Banir usuário.

**Request:**
```json
{
  "reason": "Violação dos termos de uso."
}
```

**Response:** `200 OK`

---

### POST /api/admin/coupons
Criar cupom.

**Request:**
```json
{
  "code": "BLACKFRIDAY",
  "type": "PERCENTAGE",
  "discountValue": 50,
  "isGlobal": true,
  "maxUses": 100,
  "startsAt": "2025-11-20T00:00:00Z",
  "expiresAt": "2025-11-30T23:59:59Z"
}
```

**Response:** `201 Created`

---

## 9. Webhooks

### POST /api/webhooks/mux
Webhook do Mux (processamento de vídeo).

**Headers:**
```http
mux-signature: xxx
```

**Eventos:**
- `video.asset.ready` → Atualizar lesson com playbackId
- `video.asset.errored` → Marcar como erro

**Response:** `200 OK`

---

### POST /api/webhooks/stripe
Webhook do Stripe.

**Headers:**
```http
stripe-signature: t=xxx,v1=yyy
```

**Eventos:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

**Response:** `200 OK`

---

## Error Responses

Todas as rotas seguem o padrão:

### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Email inválido"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Token inválido ou expirado"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Você não tem permissão para acessar este recurso"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Recurso não encontrado"
}
```

### 429 Too Many Requests
```json
{
  "error": "Too Many Requests",
  "message": "Limite de requisições excedido. Tente novamente em 60 segundos."
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "Erro inesperado. Por favor, tente novamente.",
  "requestId": "req_xyz"
}
```

---

## Rate Limiting

**Limites:**
- **Autenticado:** 100 req/min
- **Não autenticado:** 20 req/min
- **Admin:** 200 req/min

**Headers de Rate Limit:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642348800
```

---

## Postman Collection

Baixe a collection completa:
```bash
curl -O https://ead-platform.com/api/postman-collection.json
```

Importe no Postman para testar todos os endpoints.

---

**Fim da API Documentation**
