# Especificação Técnica — Plataforma EAD (Udemy-like)

**Versão:** 1.0
**Data:** 2025-11-16
**Arquiteto:** Claude AI
**Stack Principal:** Next.js 15 (App Router), TypeScript, PostgreSQL, Prisma, Socket.io, Redis

---

## Sumário Executivo

Esta especificação define a arquitetura completa de uma plataforma EAD (Ensino a Distância) robusta e escalável, similar à Udemy, suportando:

- **Multi-tenancy:** Administradores, Instrutores e Alunos
- **Gestão de Cursos:** Criação, publicação, versionamento e analytics
- **Pagamentos:** Stripe, PayPal, Mercado Pago (split payments para comissões)
- **Streaming de Vídeo:** Upload, transcoding (HLS), CDN e proteção contra pirataria
- **Chat em Tempo Real:** Socket.io para Q&A, suporte e notificações
- **Marketing:** Cupons, afiliados, email campaigns
- **Governança:** Audit logs, GDPR compliance, analytics avançados

---

## 1. Arquitetura do Sistema

### 1.1 Visão Geral (High-Level Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│                    CAMADA DE FRONTEND                        │
│  Next.js 15 (App Router) + React 19 + TailwindCSS + Shadcn  │
│  - SSR/SSG para SEO                                          │
│  - Client Components para interatividade                     │
│  - Server Actions para mutações seguras                      │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS/WSS
┌────────────────────▼────────────────────────────────────────┐
│                  CAMADA DE API & WEBSOCKET                   │
│  Next.js API Routes (REST) + tRPC (Type-safe)                │
│  Socket.io Server (Node.js separado ou integrado)            │
│  - Autenticação JWT (NextAuth.js v5)                         │
│  - Rate Limiting (Upstash Redis)                             │
│  - Validação (Zod)                                           │
└───┬──────────────────┬──────────────────┬───────────────────┘
    │                  │                  │
    │                  │                  │
┌───▼────┐  ┌─────────▼────────┐  ┌──────▼──────────────────┐
│ Prisma │  │  Redis Cache      │  │  Background Jobs        │
│  ORM   │  │  - Sessions       │  │  (BullMQ + Redis)       │
│        │  │  - Rate Limit     │  │  - Email Queue          │
│        │  │  - Socket rooms   │  │  - Video Processing     │
└───┬────┘  └──────────────────┘  └─────────────────────────┘
    │
┌───▼──────────────────────────────────────────────────────────┐
│              PostgreSQL 16 (Primary Database)                 │
│  - Tabelas: users, courses, lessons, payments, etc.           │
│  - Full-text search (pg_trgm, ts_vector)                      │
│  - Row-level Security (RLS) para multi-tenancy                │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                   SERVIÇOS EXTERNOS                           │
│  - AWS S3 / Cloudflare R2: Armazenamento de vídeos           │
│  - AWS MediaConvert / Mux: Transcoding de vídeo              │
│  - Cloudflare Stream: CDN + HLS delivery                      │
│  - Stripe / PayPal / Mercado Pago: Pagamentos                 │
│  - Resend / SendGrid: Email transacional                      │
│  - Sentry: Error tracking                                     │
│  - Vercel Analytics / Posthog: Product analytics              │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Decisões Arquiteturais (ADRs)

#### ADR-001: Next.js App Router
**Decisão:** Usar Next.js 15 App Router (não Pages Router)
**Razão:**
- Server Components por padrão (melhor performance)
- Server Actions (elimina boilerplate de API routes)
- Streaming SSR e Suspense nativo
- Melhor integração com React 19

#### ADR-002: PostgreSQL + Prisma
**Decisão:** PostgreSQL como banco principal com Prisma ORM
**Razão:**
- Transactions ACID necessárias para pagamentos
- Full-text search nativo
- JSON/JSONB para metadados flexíveis
- Prisma oferece type-safety e migrations robustas

#### ADR-003: Socket.io para Real-time
**Decisão:** Socket.io (não Pusher/Ably)
**Razão:**
- Self-hosted (sem custos por mensagem)
- Suporte a rooms e namespaces
- Fallback automático (WebSocket → polling)
- Integração fácil com Next.js via custom server

#### ADR-004: Video Transcoding (Mux vs AWS)
**Decisão:** Mux para MVP, migração futura para AWS MediaConvert
**Razão:**
- Mux: TTM rápido, pricing simples, SDKs excelentes
- AWS: Maior controle, menor custo em escala, mas maior complexidade

#### ADR-005: Payment Split (Marketplace)
**Decisão:** Stripe Connect (Standard Accounts)
**Razão:**
- Split automático de pagamentos (plataforma + instrutor)
- KYC/compliance gerenciado pelo Stripe
- Suporte a múltiplos países

---

## 2. Stack Tecnológico

### 2.1 Frontend
```typescript
{
  "framework": "Next.js 15.1",
  "language": "TypeScript 5.6",
  "styling": "TailwindCSS 4 + Shadcn UI",
  "forms": "React Hook Form + Zod",
  "state": "Zustand (client) + React Query (server)",
  "charts": "Recharts / Tremor",
  "video-player": "Video.js / Mux Player React"
}
```

### 2.2 Backend
```typescript
{
  "runtime": "Node.js 22 LTS",
  "api": "Next.js API Routes + tRPC v11",
  "websocket": "Socket.io 4.7",
  "orm": "Prisma 6",
  "database": "PostgreSQL 16",
  "cache": "Redis 7 (Upstash ou self-hosted)",
  "queue": "BullMQ 5",
  "auth": "NextAuth.js v5 (Auth.js)",
  "validation": "Zod"
}
```

### 2.3 Infraestrutura
```yaml
hosting:
  frontend: Vercel (Edge Network)
  backend-api: Vercel Serverless Functions
  socket-server: Railway / Fly.io (Node.js dedicado)
  database: Neon / Supabase (PostgreSQL serverless)
  redis: Upstash Redis (serverless)
  storage: Cloudflare R2 / AWS S3
  cdn: Cloudflare CDN
  video: Mux (transcoding + streaming)

devops:
  ci-cd: GitHub Actions
  monitoring: Sentry + Vercel Analytics
  logging: Axiom / Logtail
  analytics: PostHog (product analytics)
```

---

## 3. Modelagem de Dados (Database Schema)

### 3.1 Diagrama ER (Entidades Principais)

```
User (1) ────< (N) Enrollment >──── (N) Course
  │                                      │
  │                                      │
  ├─ (1:N) Payment                       ├─ (1:N) Module
  ├─ (1:N) Review                        │           │
  ├─ (1:N) ChatMessage                   │           └─ (1:N) Lesson
  ├─ (1:N) Certificate                   │                     │
  └─ (1:N) WatchProgress                 │                     └─ (1:N) Resource
                                          │
                                          ├─ (1:N) Coupon
                                          ├─ (1:N) Review
                                          └─ (N:N) Category
```

### 3.2 Schema Prisma (Completo)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["fullTextSearch", "postgresqlExtensions"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  extensions = [pg_trgm]
}

// ============================================
// USUÁRIOS E AUTENTICAÇÃO
// ============================================

enum UserRole {
  STUDENT
  INSTRUCTOR
  ADMIN
}

enum UserStatus {
  ACTIVE
  SUSPENDED
  BANNED
  PENDING_VERIFICATION
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  name          String?
  image         String?   // Avatar URL
  password      String?   // Hashed (bcrypt)

  role          UserRole  @default(STUDENT)
  status        UserStatus @default(ACTIVE)

  // Perfil
  bio           String?   @db.Text
  headline      String?   // Ex: "Senior Developer"
  website       String?
  twitter       String?
  linkedin      String?

  // Instrutor
  instructorBio String?   @db.Text
  instructorApproved Boolean @default(false)
  instructorAppliedAt DateTime?
  commissionRate Decimal  @default(0.7) @db.Decimal(3, 2) // 70% instrutor, 30% plataforma

  // Timestamps
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastLoginAt   DateTime?

  // Relações
  accounts      Account[]
  sessions      Session[]

  // Como Instrutor
  coursesCreated Course[] @relation("InstructorCourses")
  payoutsReceived Payout[]

  // Como Aluno
  enrollments   Enrollment[]
  reviews       Review[]
  certificates  Certificate[]
  watchProgress WatchProgress[]
  cartItems     CartItem[]

  // Interações
  chatMessages  ChatMessage[]
  notifications Notification[]

  // Financeiro
  paymentsCreated Payment[]

  @@index([email])
  @@index([role, status])
  @@map("users")
}

// NextAuth.js Models
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

// ============================================
// CURSOS E CONTEÚDO
// ============================================

enum CourseLevel {
  BEGINNER
  INTERMEDIATE
  ADVANCED
  ALL_LEVELS
}

enum CourseStatus {
  DRAFT
  PENDING_REVIEW
  PUBLISHED
  ARCHIVED
  REJECTED
}

enum PriceType {
  FREE
  PAID
  SUBSCRIPTION
}

model Course {
  id              String   @id @default(cuid())
  slug            String   @unique

  // Metadados
  title           String
  subtitle        String?
  description     String   @db.Text
  language        String   @default("pt-BR")
  level           CourseLevel @default(BEGINNER)

  // Mídia
  thumbnailUrl    String?
  promoVideoUrl   String?  // Vídeo de preview

  // Pricing
  priceType       PriceType @default(PAID)
  price           Decimal?  @db.Decimal(10, 2)
  comparePrice    Decimal?  @db.Decimal(10, 2) // Preço original (antes de desconto)
  currency        String    @default("BRL")

  // Status e Aprovação
  status          CourseStatus @default(DRAFT)
  publishedAt     DateTime?
  rejectedReason  String?   @db.Text

  // Instructor
  instructorId    String
  instructor      User     @relation("InstructorCourses", fields: [instructorId], references: [id], onDelete: Cascade)

  // SEO
  metaTitle       String?
  metaDescription String?

  // Features
  hasLifetimeAccess Boolean @default(true)
  hasCertificate    Boolean @default(true)
  hasClosedCaptions Boolean @default(false)

  // Estatísticas (cache)
  enrollmentCount Int     @default(0)
  averageRating   Decimal? @db.Decimal(3, 2)
  reviewCount     Int     @default(0)
  totalDuration   Int     @default(0) // Minutos

  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relações
  modules         Module[]
  categories      CategoryOnCourse[]
  tags            TagOnCourse[]
  requirements    CourseRequirement[]
  learningGoals   CourseLearningGoal[]
  targetAudience  CourseTargetAudience[]

  enrollments     Enrollment[]
  reviews         Review[]
  coupons         Coupon[]

  @@index([slug])
  @@index([instructorId, status])
  @@index([status, publishedAt])
  @@map("courses")
}

model Module {
  id          String   @id @default(cuid())
  courseId    String
  course      Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)

  title       String
  description String?  @db.Text
  order       Int      // 0, 1, 2...

  lessons     Lesson[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([courseId, order])
  @@map("modules")
}

enum LessonType {
  VIDEO
  ARTICLE
  QUIZ
  CODING_EXERCISE
  LIVE_SESSION
}

model Lesson {
  id          String     @id @default(cuid())
  moduleId    String
  module      Module     @relation(fields: [moduleId], references: [id], onDelete: Cascade)

  title       String
  description String?    @db.Text
  type        LessonType @default(VIDEO)
  order       Int

  // Conteúdo
  content     String?    @db.Text // HTML/Markdown para ARTICLE

  // Vídeo
  videoUrl    String?    // URL do vídeo original
  videoMuxAssetId String? // Mux Asset ID
  videoMuxPlaybackId String? // Mux Playback ID
  videoDuration Int?     // Segundos

  // Recursos Complementares
  resources   Resource[]

  // Configurações
  isFree      Boolean   @default(false) // Preview grátis
  isPublished Boolean   @default(false)

  // Analytics
  viewCount   Int       @default(0)

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  watchProgress WatchProgress[]

  @@index([moduleId, order])
  @@map("lessons")
}

enum ResourceType {
  PDF
  ZIP
  LINK
  CODE
}

model Resource {
  id        String       @id @default(cuid())
  lessonId  String
  lesson    Lesson       @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  title     String
  type      ResourceType
  url       String       // S3 URL ou link externo
  fileSize  Int?         // Bytes

  createdAt DateTime     @default(now())

  @@map("resources")
}

// ============================================
// CATEGORIAS E TAGS
// ============================================

model Category {
  id          String   @id @default(cuid())
  name        String   @unique
  slug        String   @unique
  description String?
  icon        String?  // Emoji ou URL
  parentId    String?  // Hierarquia (subcategorias)
  parent      Category? @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryHierarchy")

  courses     CategoryOnCourse[]

  @@map("categories")
}

model CategoryOnCourse {
  id         String   @id @default(cuid())
  courseId   String
  categoryId String
  course     Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  category   Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([courseId, categoryId])
  @@map("categories_on_courses")
}

model Tag {
  id      String   @id @default(cuid())
  name    String   @unique
  slug    String   @unique
  courses TagOnCourse[]

  @@map("tags")
}

model TagOnCourse {
  id       String @id @default(cuid())
  courseId String
  tagId    String
  course   Course @relation(fields: [courseId], references: [id], onDelete: Cascade)
  tag      Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@unique([courseId, tagId])
  @@map("tags_on_courses")
}

// ============================================
// METADADOS DE CURSO
// ============================================

model CourseRequirement {
  id        String @id @default(cuid())
  courseId  String
  course    Course @relation(fields: [courseId], references: [id], onDelete: Cascade)
  content   String
  order     Int

  @@map("course_requirements")
}

model CourseLearningGoal {
  id        String @id @default(cuid())
  courseId  String
  course    Course @relation(fields: [courseId], references: [id], onDelete: Cascade)
  content   String
  order     Int

  @@map("course_learning_goals")
}

model CourseTargetAudience {
  id        String @id @default(cuid())
  courseId  String
  course    Course @relation(fields: [courseId], references: [id], onDelete: Cascade)
  content   String
  order     Int

  @@map("course_target_audience")
}

// ============================================
// MATRÍCULAS E PROGRESSO
// ============================================

enum EnrollmentStatus {
  ACTIVE
  COMPLETED
  EXPIRED
  REFUNDED
}

model Enrollment {
  id          String           @id @default(cuid())
  userId      String
  courseId    String
  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  course      Course           @relation(fields: [courseId], references: [id], onDelete: Cascade)

  status      EnrollmentStatus @default(ACTIVE)
  progress    Int              @default(0) // 0-100%

  // Financeiro
  paymentId   String?          @unique
  payment     Payment?         @relation(fields: [paymentId], references: [id])
  pricePaid   Decimal?         @db.Decimal(10, 2)

  // Certificado
  certificateId String?        @unique
  certificate   Certificate?

  // Timestamps
  enrolledAt  DateTime         @default(now())
  completedAt DateTime?
  expiresAt   DateTime?        // Para cursos com acesso temporário

  @@unique([userId, courseId])
  @@index([userId, status])
  @@map("enrollments")
}

model WatchProgress {
  id          String   @id @default(cuid())
  userId      String
  lessonId    String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  lesson      Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  progress    Int      @default(0) // 0-100%
  watchedSeconds Int   @default(0)
  completed   Boolean  @default(false)

  lastWatchedAt DateTime @default(now())

  @@unique([userId, lessonId])
  @@index([userId, completed])
  @@map("watch_progress")
}

model Certificate {
  id            String     @id @default(cuid())
  userId        String
  courseId      String
  enrollmentId  String     @unique
  user          User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  enrollment    Enrollment @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)

  certificateNumber String @unique
  pdfUrl        String?    // URL do PDF gerado

  issuedAt      DateTime   @default(now())

  @@index([userId])
  @@map("certificates")
}

// ============================================
// REVIEWS E RATINGS
// ============================================

model Review {
  id        String   @id @default(cuid())
  userId    String
  courseId  String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  course    Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)

  rating    Int      // 1-5
  title     String?
  content   String?  @db.Text

  // Moderação
  isPublished Boolean @default(true)
  isFlagged   Boolean @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, courseId])
  @@index([courseId, isPublished, rating])
  @@map("reviews")
}

// ============================================
// PAGAMENTOS E FINANCEIRO
// ============================================

enum PaymentProvider {
  STRIPE
  PAYPAL
  MERCADO_PAGO
}

enum PaymentStatus {
  PENDING
  PROCESSING
  SUCCEEDED
  FAILED
  REFUNDED
  PARTIALLY_REFUNDED
}

model Payment {
  id            String          @id @default(cuid())
  userId        String
  user          User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Provider
  provider      PaymentProvider
  providerTxId  String          @unique // Stripe Payment Intent ID

  // Valores
  amount        Decimal         @db.Decimal(10, 2)
  currency      String          @default("BRL")
  status        PaymentStatus   @default(PENDING)

  // Split (Marketplace)
  platformFee   Decimal?        @db.Decimal(10, 2)
  instructorAmount Decimal?     @db.Decimal(10, 2)

  // Metadata
  courseId      String?         // Se for compra de curso único
  cartSnapshot  Json?           // Snapshot do carrinho
  couponCode    String?

  // Refund
  refundedAt    DateTime?
  refundReason  String?

  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  enrollment    Enrollment?

  @@index([userId, status])
  @@index([providerTxId])
  @@map("payments")
}

model Payout {
  id            String   @id @default(cuid())
  instructorId  String
  instructor    User     @relation(fields: [instructorId], references: [id], onDelete: Cascade)

  amount        Decimal  @db.Decimal(10, 2)
  currency      String   @default("BRL")

  // Stripe Connect
  stripeTransferId String? @unique

  status        String   // pending, processing, paid, failed

  periodStart   DateTime
  periodEnd     DateTime

  paidAt        DateTime?

  createdAt     DateTime @default(now())

  @@index([instructorId, status])
  @@map("payouts")
}

// ============================================
// CUPONS E MARKETING
// ============================================

enum CouponType {
  PERCENTAGE
  FIXED_AMOUNT
}

model Coupon {
  id            String     @id @default(cuid())
  code          String     @unique

  type          CouponType
  discountValue Decimal    @db.Decimal(10, 2) // 20 (20%) ou 50.00 (R$ 50)

  // Escopo
  isGlobal      Boolean    @default(false)
  courseId      String?
  course        Course?    @relation(fields: [courseId], references: [id], onDelete: Cascade)

  // Limites
  maxUses       Int?       // null = ilimitado
  usedCount     Int        @default(0)

  // Validade
  startsAt      DateTime?
  expiresAt     DateTime?

  isActive      Boolean    @default(true)

  createdAt     DateTime   @default(now())

  @@index([code, isActive])
  @@map("coupons")
}

// ============================================
// CARRINHO DE COMPRAS
// ============================================

model CartItem {
  id        String   @id @default(cuid())
  userId    String
  courseId  String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  addedAt   DateTime @default(now())

  @@unique([userId, courseId])
  @@map("cart_items")
}

// ============================================
// CHAT E TEMPO REAL
// ============================================

enum ChatMessageType {
  TEXT
  IMAGE
  FILE
  SYSTEM
}

model ChatMessage {
  id          String          @id @default(cuid())
  roomId      String          // course:{courseId} ou support:{userId}

  senderId    String
  sender      User            @relation(fields: [senderId], references: [id], onDelete: Cascade)

  type        ChatMessageType @default(TEXT)
  content     String          @db.Text
  fileUrl     String?

  isEdited    Boolean         @default(false)
  isDeleted   Boolean         @default(false)

  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@index([roomId, createdAt])
  @@map("chat_messages")
}

// ============================================
// NOTIFICAÇÕES
// ============================================

enum NotificationType {
  COURSE_PUBLISHED
  COURSE_UPDATED
  NEW_ENROLLMENT
  NEW_REVIEW
  PAYMENT_RECEIVED
  PAYOUT_PROCESSED
  MESSAGE_RECEIVED
  CERTIFICATE_ISSUED
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  type      NotificationType
  title     String
  message   String           @db.Text

  // Metadata
  actionUrl String?
  metadata  Json?

  isRead    Boolean          @default(false)

  createdAt DateTime         @default(now())

  @@index([userId, isRead, createdAt])
  @@map("notifications")
}

// ============================================
// ADMIN E GOVERNANÇA
// ============================================

model AuditLog {
  id          String   @id @default(cuid())
  userId      String?  // null se ação do sistema

  action      String   // "course.create", "user.ban", etc.
  entityType  String   // "Course", "User", etc.
  entityId    String

  changes     Json?    // Snapshot do before/after
  ipAddress   String?
  userAgent   String?

  createdAt   DateTime @default(now())

  @@index([entityType, entityId])
  @@index([userId, createdAt])
  @@map("audit_logs")
}

// ============================================
// CMS (Blog/Páginas Estáticas)
// ============================================

model Page {
  id          String   @id @default(cuid())
  slug        String   @unique
  title       String
  content     String   @db.Text

  isPublished Boolean  @default(false)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("pages")
}

model BlogPost {
  id          String   @id @default(cuid())
  slug        String   @unique
  title       String
  excerpt     String?
  content     String   @db.Text
  coverImage  String?

  authorId    String

  isPublished Boolean  @default(false)
  publishedAt DateTime?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([slug])
  @@index([isPublished, publishedAt])
  @@map("blog_posts")
}
```

---

## 4. API Design (Endpoints)

### 4.1 Estrutura de Diretórios (App Router)

```
app/
├── (auth)/
│   ├── login/
│   ├── register/
│   └── forgot-password/
├── (marketing)/
│   ├── page.tsx              # Homepage
│   ├── courses/
│   │   ├── page.tsx          # Catálogo
│   │   └── [slug]/
│   │       └── page.tsx      # Detalhe do curso
│   └── categories/
│       └── [slug]/page.tsx
├── (student)/
│   ├── dashboard/
│   ├── my-courses/
│   ├── learning/
│   │   └── [courseId]/
│   │       └── [lessonId]/   # Player de vídeo
│   └── certificates/
├── (instructor)/
│   ├── dashboard/
│   ├── courses/
│   │   ├── create/
│   │   └── [id]/
│   │       ├── edit/
│   │       ├── curriculum/
│   │       ├── pricing/
│   │       └── settings/
│   ├── analytics/
│   └── payouts/
├── (admin)/
│   ├── dashboard/
│   ├── users/
│   ├── courses/
│   ├── payments/
│   ├── coupons/
│   └── settings/
└── api/
    ├── auth/
    │   └── [...nextauth]/
    ├── courses/
    │   ├── [id]/
    │   │   ├── enroll/
    │   │   ├── reviews/
    │   │   └── progress/
    │   └── upload-video/
    ├── payments/
    │   ├── create-intent/
    │   ├── webhook/          # Stripe/PayPal webhooks
    │   └── checkout/
    ├── chat/
    │   └── messages/
    ├── admin/
    │   └── approve-course/
    └── webhooks/
        ├── mux/              # Video transcoding
        └── stripe/
```

### 4.2 Principais Endpoints (REST API)

#### Autenticação
```typescript
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/me
```

#### Cursos (Público)
```typescript
GET    /api/courses                    # Listagem paginada
GET    /api/courses/[slug]             # Detalhe
GET    /api/courses/[id]/reviews       # Reviews
GET    /api/courses/search?q=react     # Busca
GET    /api/categories                 # Categorias
```

#### Cursos (Instrutor)
```typescript
POST   /api/instructor/courses         # Criar curso
PUT    /api/instructor/courses/[id]    # Atualizar
DELETE /api/instructor/courses/[id]
POST   /api/instructor/courses/[id]/modules
POST   /api/instructor/courses/[id]/modules/[moduleId]/lessons
POST   /api/instructor/upload-video    # Multipart upload → Mux
GET    /api/instructor/analytics       # Métricas
```

#### Matrículas (Aluno)
```typescript
POST   /api/enrollments                # Matricular (pós-pagamento)
GET    /api/enrollments/my-courses
POST   /api/enrollments/[id]/progress  # Atualizar progresso
GET    /api/enrollments/[id]/certificate
```

#### Pagamentos
```typescript
POST   /api/payments/create-intent     # Stripe Payment Intent
POST   /api/payments/checkout          # Finalizar compra
POST   /api/payments/webhook           # Stripe webhook
GET    /api/payments/history
POST   /api/payments/refund/[id]       # Admin
```

#### Chat (WebSocket via Socket.io)
```typescript
// Events
socket.emit('join_room', { roomId: 'course:123' })
socket.emit('send_message', { roomId, content })
socket.on('new_message', (message) => {})
socket.on('user_typing', (data) => {})
```

#### Admin
```typescript
GET    /api/admin/dashboard            # Métricas gerais
GET    /api/admin/courses/pending      # Cursos para aprovar
PUT    /api/admin/courses/[id]/approve
PUT    /api/admin/courses/[id]/reject
GET    /api/admin/users
PUT    /api/admin/users/[id]/ban
GET    /api/admin/payments
POST   /api/admin/coupons
```

### 4.3 tRPC Routers (Type-safe API)

```typescript
// server/routers/_app.ts
import { router } from '../trpc'
import { courseRouter } from './course'
import { userRouter } from './user'
import { paymentRouter } from './payment'

export const appRouter = router({
  course: courseRouter,
  user: userRouter,
  payment: paymentRouter,
  admin: adminRouter,
})

export type AppRouter = typeof appRouter

// server/routers/course.ts
import { z } from 'zod'
import { publicProcedure, protectedProcedure, router } from '../trpc'

export const courseRouter = router({
  list: publicProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().max(100).default(20),
      category: z.string().optional(),
      level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const courses = await ctx.prisma.course.findMany({
        where: {
          status: 'PUBLISHED',
          categories: input.category ? {
            some: { category: { slug: input.category } }
          } : undefined,
          level: input.level,
        },
        take: input.limit,
        skip: (input.page - 1) * input.limit,
        include: {
          instructor: {
            select: { id: true, name: true, image: true }
          },
          _count: { select: { enrollments: true } }
        },
        orderBy: { createdAt: 'desc' }
      })

      return { courses, total: courses.length }
    }),

  create: protectedProcedure
    .input(z.object({
      title: z.string().min(10).max(200),
      description: z.string().min(100),
      level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
      price: z.number().positive().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'INSTRUCTOR' && ctx.user.role !== 'ADMIN') {
        throw new Error('Unauthorized')
      }

      return await ctx.prisma.course.create({
        data: {
          ...input,
          instructorId: ctx.user.id,
          slug: slugify(input.title),
        }
      })
    }),
})
```

---

## 5. Módulos Funcionais Detalhados

### 5.1 Módulo de Administrador

#### Dashboard Admin
**Funcionalidades:**
- **Métricas em Tempo Real:**
  - Total de receita (filtros: hoje, semana, mês, ano)
  - Novos usuários (gráfico de linha)
  - Cursos pendentes de aprovação (badge de notificação)
  - Tickets de suporte abertos
  - Taxa de conversão (visitantes → compras)

**Queries SQL (via Prisma):**
```typescript
// server/services/admin-dashboard.ts
export async function getAdminDashboardMetrics(period: 'today' | 'week' | 'month') {
  const startDate = getStartDate(period)

  const [revenue, newUsers, pendingCourses, openTickets] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        status: 'SUCCEEDED',
        createdAt: { gte: startDate }
      },
      _sum: { amount: true }
    }),
    prisma.user.count({
      where: { createdAt: { gte: startDate } }
    }),
    prisma.course.count({
      where: { status: 'PENDING_REVIEW' }
    }),
    prisma.chatMessage.count({
      where: {
        roomId: { startsWith: 'support:' },
        createdAt: { gte: startDate }
      }
    })
  ])

  return {
    revenue: revenue._sum.amount ?? 0,
    newUsers,
    pendingCourses,
    openTickets
  }
}
```

#### Gestão de Usuários
```typescript
// app/api/admin/users/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page')) || 1
  const search = searchParams.get('search') || ''

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          enrollments: true,
          coursesCreated: true,
          paymentsCreated: true
        }
      }
    },
    take: 50,
    skip: (page - 1) * 50,
    orderBy: { createdAt: 'desc' }
  })

  return Response.json({ users })
}

// Banir usuário
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { action, reason } = await req.json()

  await prisma.$transaction([
    prisma.user.update({
      where: { id: params.id },
      data: { status: action === 'ban' ? 'BANNED' : 'ACTIVE' }
    }),
    prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: `user.${action}`,
        entityType: 'User',
        entityId: params.id,
        changes: { reason }
      }
    })
  ])

  return Response.json({ success: true })
}
```

#### Aprovação de Cursos
**Workflow:**
1. Instrutor submete curso (status: `PENDING_REVIEW`)
2. Admin recebe notificação
3. Admin revisa: conteúdo, qualidade, compliance
4. Ações:
   - **Aprovar:** status → `PUBLISHED`, notifica instrutor
   - **Rejeitar:** status → `REJECTED`, envia feedback

```typescript
// app/api/admin/courses/[id]/approve/route.ts
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const course = await prisma.course.update({
    where: { id: params.id },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date()
    },
    include: { instructor: true }
  })

  // Notificar instrutor
  await createNotification({
    userId: course.instructorId,
    type: 'COURSE_PUBLISHED',
    title: 'Curso aprovado!',
    message: `Seu curso "${course.title}" foi aprovado e está publicado.`,
    actionUrl: `/instructor/courses/${course.id}`
  })

  // Enviar email
  await sendEmail({
    to: course.instructor.email,
    template: 'course-approved',
    data: { courseName: course.title }
  })

  return Response.json({ course })
}
```

### 5.2 Módulo de Instrutor

#### Criação de Curso (Wizard Multi-Step)
**Steps:**
1. **Info Básica:** Título, subtítulo, categoria, nível
2. **Currículo:** Módulos + Aulas (drag-and-drop)
3. **Mídia:** Thumbnail, vídeo promocional
4. **Pricing:** Preço, tipo (grátis/pago)
5. **Publicação:** Submit para revisão

```typescript
// app/(instructor)/courses/create/page.tsx
'use client'

export default function CreateCoursePage() {
  const [step, setStep] = useState(1)
  const [courseData, setCourseData] = useState({})

  const steps = [
    { title: 'Informações Básicas', component: BasicInfoStep },
    { title: 'Currículo', component: CurriculumStep },
    { title: 'Mídia', component: MediaStep },
    { title: 'Precificação', component: PricingStep },
    { title: 'Publicar', component: PublishStep }
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <Stepper steps={steps} currentStep={step} />
      <CurrentStepComponent
        data={courseData}
        onNext={(data) => {
          setCourseData({ ...courseData, ...data })
          setStep(step + 1)
        }}
      />
    </div>
  )
}
```

#### Upload de Vídeo (Mux Integration)
```typescript
// app/api/instructor/upload-video/route.ts
import Mux from '@mux/mux-node'

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
})

export async function POST(req: Request) {
  const { lessonId } = await req.json()

  // Criar Direct Upload URL
  const upload = await mux.video.uploads.create({
    cors_origin: process.env.NEXT_PUBLIC_APP_URL,
    new_asset_settings: {
      playback_policy: ['signed'], // DRM
      encoding_tier: 'smart',
      mp4_support: 'standard'
    }
  })

  // Salvar no banco (webhook do Mux atualizará depois)
  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      videoMuxAssetId: upload.asset_id,
      videoUrl: upload.url
    }
  })

  return Response.json({ uploadUrl: upload.url })
}

// Webhook do Mux (quando transcoding termina)
export async function POST(req: Request) {
  const event = await req.json()

  if (event.type === 'video.asset.ready') {
    const asset = event.data

    await prisma.lesson.update({
      where: { videoMuxAssetId: asset.id },
      data: {
        videoMuxPlaybackId: asset.playback_ids[0].id,
        videoDuration: asset.duration,
        isPublished: true
      }
    })
  }

  return Response.json({ received: true })
}
```

#### Analytics do Instrutor
```typescript
// app/api/instructor/analytics/route.ts
export async function GET(req: Request) {
  const instructorId = req.user.id

  const [courses, totalRevenue, enrollments] = await Promise.all([
    prisma.course.findMany({
      where: { instructorId },
      select: {
        id: true,
        title: true,
        enrollmentCount: true,
        averageRating: true,
        _count: { select: { reviews: true } }
      }
    }),
    prisma.payment.aggregate({
      where: {
        status: 'SUCCEEDED',
        enrollment: {
          course: { instructorId }
        }
      },
      _sum: { instructorAmount: true }
    }),
    prisma.enrollment.groupBy({
      by: ['courseId'],
      where: {
        course: { instructorId },
        enrolledAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 dias
        }
      },
      _count: true
    })
  ])

  return Response.json({
    totalRevenue: totalRevenue._sum.instructorAmount ?? 0,
    courses,
    enrollmentsTrend: enrollments
  })
}
```

### 5.3 Módulo de Aluno

#### Player de Vídeo (HLS + DRM)
```typescript
// app/(student)/learning/[courseId]/[lessonId]/page.tsx
'use client'

import MuxPlayer from '@mux/mux-player-react'

export default function LessonPlayerPage({ params }) {
  const { lesson } = useLessonData(params.lessonId)
  const { updateProgress } = useWatchProgress()

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Player */}
      <div className="col-span-2">
        <MuxPlayer
          playbackId={lesson.videoMuxPlaybackId}
          metadata={{
            video_title: lesson.title,
            viewer_user_id: session.user.id
          }}
          onTimeUpdate={(e) => {
            const progress = (e.target.currentTime / e.target.duration) * 100
            updateProgress.mutate({ lessonId: lesson.id, progress })
          }}
          onEnded={() => {
            markAsComplete.mutate({ lessonId: lesson.id })
          }}
        />

        {/* Tabs: Overview, Resources, Q&A */}
        <Tabs>
          <TabPanel label="Visão Geral">
            <div dangerouslySetInnerHTML={{ __html: lesson.description }} />
          </TabPanel>
          <TabPanel label="Recursos">
            <ResourceList resources={lesson.resources} />
          </TabPanel>
          <TabPanel label="Q&A">
            <ChatRoom roomId={`course:${params.courseId}`} />
          </TabPanel>
        </Tabs>
      </div>

      {/* Sidebar: Currículo */}
      <div className="col-span-1">
        <CourseCurriculum courseId={params.courseId} currentLessonId={lesson.id} />
      </div>
    </div>
  )
}
```

### 5.4 Módulo de Pagamentos

#### Checkout Flow (Stripe)
```typescript
// app/api/payments/create-intent/route.ts
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
})

export async function POST(req: Request) {
  const { courseId, couponCode } = await req.json()
  const userId = req.user.id

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { instructor: true }
  })

  let finalPrice = course.price

  // Aplicar cupom
  if (couponCode) {
    const coupon = await validateCoupon(couponCode, courseId)
    finalPrice = applyCouponDiscount(finalPrice, coupon)
  }

  // Calcular split (marketplace)
  const platformFee = finalPrice * (1 - course.instructor.commissionRate)
  const instructorAmount = finalPrice * course.instructor.commissionRate

  // Criar Payment Intent com Stripe Connect
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(finalPrice * 100), // Centavos
    currency: course.currency.toLowerCase(),
    metadata: {
      courseId: course.id,
      userId,
      instructorId: course.instructorId
    },
    transfer_data: {
      destination: course.instructor.stripeAccountId, // Conta Connect
      amount: Math.round(instructorAmount * 100)
    }
  })

  // Salvar payment pendente
  await prisma.payment.create({
    data: {
      userId,
      provider: 'STRIPE',
      providerTxId: paymentIntent.id,
      amount: finalPrice,
      platformFee,
      instructorAmount,
      status: 'PENDING',
      cartSnapshot: { courseId, couponCode }
    }
  })

  return Response.json({
    clientSecret: paymentIntent.client_secret
  })
}
```

#### Webhook Handler (Stripe)
```typescript
// app/api/payments/webhook/route.ts
import { headers } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object

    await prisma.$transaction(async (tx) => {
      // Atualizar payment
      const payment = await tx.payment.update({
        where: { providerTxId: paymentIntent.id },
        data: { status: 'SUCCEEDED' }
      })

      // Criar enrollment
      const enrollment = await tx.enrollment.create({
        data: {
          userId: paymentIntent.metadata.userId,
          courseId: paymentIntent.metadata.courseId,
          paymentId: payment.id,
          pricePaid: payment.amount,
          status: 'ACTIVE'
        }
      })

      // Atualizar contadores
      await tx.course.update({
        where: { id: paymentIntent.metadata.courseId },
        data: { enrollmentCount: { increment: 1 } }
      })

      // Notificar usuário
      await createNotification({
        userId: paymentIntent.metadata.userId,
        type: 'NEW_ENROLLMENT',
        title: 'Matrícula confirmada!',
        message: 'Você já pode começar a estudar.'
      })

      // Notificar instrutor
      await createNotification({
        userId: paymentIntent.metadata.instructorId,
        type: 'PAYMENT_RECEIVED',
        title: 'Nova venda!',
        message: `Você recebeu R$ ${payment.instructorAmount}`
      })
    })
  }

  if (event.type === 'payment_intent.payment_failed') {
    await prisma.payment.update({
      where: { providerTxId: event.data.object.id },
      data: { status: 'FAILED' }
    })
  }

  return Response.json({ received: true })
}
```

### 5.5 Módulo de Chat (Socket.io)

#### Socket.io Server Setup
```typescript
// server/socket.ts
import { createServer } from 'http'
import { Server } from 'socket.io'
import { verify } from 'jsonwebtoken'

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL,
    credentials: true
  }
})

// Middleware de autenticação
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token

  try {
    const decoded = verify(token, process.env.JWT_SECRET!)
    socket.data.userId = decoded.sub
    next()
  } catch (err) {
    next(new Error('Authentication error'))
  }
})

io.on('connection', (socket) => {
  console.log('User connected:', socket.data.userId)

  // Entrar em sala de curso
  socket.on('join_room', async ({ roomId }) => {
    // Verificar se usuário tem acesso ao curso
    const hasAccess = await checkCourseAccess(socket.data.userId, roomId)

    if (hasAccess) {
      socket.join(roomId)

      // Carregar mensagens históricas
      const messages = await prisma.chatMessage.findMany({
        where: { roomId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          sender: {
            select: { id: true, name: true, image: true }
          }
        }
      })

      socket.emit('room_history', messages.reverse())
    }
  })

  // Enviar mensagem
  socket.on('send_message', async ({ roomId, content }) => {
    const message = await prisma.chatMessage.create({
      data: {
        roomId,
        senderId: socket.data.userId,
        content,
        type: 'TEXT'
      },
      include: {
        sender: {
          select: { id: true, name: true, image: true }
        }
      }
    })

    // Broadcast para sala
    io.to(roomId).emit('new_message', message)

    // Notificar instrutor se for Q&A
    if (roomId.startsWith('course:')) {
      const courseId = roomId.split(':')[1]
      await notifyInstructor(courseId, message)
    }
  })

  // Typing indicator
  socket.on('typing_start', ({ roomId }) => {
    socket.to(roomId).emit('user_typing', {
      userId: socket.data.userId,
      typing: true
    })
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.data.userId)
  })
})

httpServer.listen(3001, () => {
  console.log('Socket.io server running on port 3001')
})
```

#### Client Integration (React)
```typescript
// hooks/useSocket.ts
import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSession } from 'next-auth/react'

export function useSocket() {
  const { data: session } = useSession()
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    if (!session?.user) return

    const socketInstance = io('http://localhost:3001', {
      auth: {
        token: session.accessToken
      }
    })

    socketInstance.on('connect', () => {
      console.log('Connected to Socket.io')
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [session])

  return socket
}

// components/ChatRoom.tsx
export function ChatRoom({ roomId }: { roomId: string }) {
  const socket = useSocket()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')

  useEffect(() => {
    if (!socket) return

    socket.emit('join_room', { roomId })

    socket.on('room_history', (msgs) => {
      setMessages(msgs)
    })

    socket.on('new_message', (msg) => {
      setMessages((prev) => [...prev, msg])
    })

    return () => {
      socket.off('room_history')
      socket.off('new_message')
    }
  }, [socket, roomId])

  const sendMessage = () => {
    if (!socket || !input.trim()) return

    socket.emit('send_message', {
      roomId,
      content: input
    })

    setInput('')
  }

  return (
    <div className="flex flex-col h-96">
      <div className="flex-1 overflow-y-auto">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
      </div>

      <div className="flex gap-2 p-4 border-t">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Digite sua mensagem..."
          className="flex-1"
        />
        <button onClick={sendMessage}>Enviar</button>
      </div>
    </div>
  )
}
```

---

## 6. Segurança e Autenticação

### 6.1 NextAuth.js v5 Setup
```typescript
// auth.config.ts
import { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export default {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      authorize: async (credentials) => {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        })

        if (!user || !user.password) return null

        const isValid = await compare(
          credentials.password as string,
          user.password
        )

        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    })
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    session: async ({ session, token }) => {
      session.user.id = token.id as string
      session.user.role = token.role as string
      return session
    }
  },
  pages: {
    signIn: '/login',
    error: '/auth/error'
  }
} satisfies NextAuthConfig
```

### 6.2 Authorization Middleware
```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: Request) {
  const token = await getToken({ req })
  const { pathname } = new URL(req.url)

  // Rotas públicas
  if (pathname.startsWith('/api/auth') || pathname === '/login') {
    return NextResponse.next()
  }

  // Proteger rotas de admin
  if (pathname.startsWith('/admin')) {
    if (token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
  }

  // Proteger rotas de instrutor
  if (pathname.startsWith('/instructor')) {
    if (token?.role !== 'INSTRUCTOR' && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
  }

  // Verificar rate limit (Redis)
  const rateLimitKey = `rate_limit:${token?.sub}:${pathname}`
  const requests = await redis.incr(rateLimitKey)

  if (requests === 1) {
    await redis.expire(rateLimitKey, 60) // 1 minuto
  }

  if (requests > 100) { // 100 req/min
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/instructor/:path*', '/api/:path*']
}
```

### 6.3 Proteção de Conteúdo (DRM)
```typescript
// Signed URLs para vídeos (Mux)
import Mux from '@mux/mux-node'

const mux = new Mux()

export async function getSignedPlaybackUrl(playbackId: string, userId: string) {
  // Verificar se usuário está matriculado
  const hasAccess = await checkEnrollment(userId, playbackId)

  if (!hasAccess) {
    throw new Error('Unauthorized')
  }

  // Gerar token JWT para playback
  const token = mux.jwt.signPlaybackId(playbackId, {
    type: 'video',
    expiration: '1h',
    params: {
      viewer_user_id: userId
    }
  })

  return `https://stream.mux.com/${playbackId}.m3u8?token=${token}`
}
```

---

## 7. Performance e Escalabilidade

### 7.1 Caching Strategy (Redis)
```typescript
// lib/cache.ts
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
})

export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600 // 1 hora
): Promise<T> {
  // Tentar cache primeiro
  const cached = await redis.get<T>(key)

  if (cached) {
    return cached
  }

  // Buscar dados frescos
  const fresh = await fetcher()

  // Salvar no cache
  await redis.set(key, fresh, { ex: ttl })

  return fresh
}

// Uso:
export async function getCourseDetails(slug: string) {
  return getCachedData(
    `course:${slug}`,
    async () => {
      return await prisma.course.findUnique({
        where: { slug },
        include: {
          instructor: true,
          modules: {
            include: { lessons: true }
          }
        }
      })
    },
    3600 // Cache por 1 hora
  )
}
```

### 7.2 Database Indexing
```sql
-- Adicionar índices críticos
CREATE INDEX idx_courses_status_published ON courses(status, published_at DESC);
CREATE INDEX idx_enrollments_user_status ON enrollments(user_id, status);
CREATE INDEX idx_payments_user_status ON payments(user_id, status, created_at DESC);
CREATE INDEX idx_watch_progress_user_lesson ON watch_progress(user_id, lesson_id);

-- Full-text search
CREATE INDEX idx_courses_search ON courses USING GIN(to_tsvector('portuguese', title || ' ' || description));
```

### 7.3 Image Optimization
```typescript
// next.config.js
module.exports = {
  images: {
    domains: ['cloudflare-r2.com', 'mux.com'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256]
  }
}

// Uso:
import Image from 'next/image'

<Image
  src={course.thumbnailUrl}
  alt={course.title}
  width={400}
  height={225}
  placeholder="blur"
  blurDataURL={course.thumbnailBlurHash}
/>
```

---

## 8. Infraestrutura e Deploy

### 8.1 Variáveis de Ambiente
```bash
# .env.example

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/ead_platform"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# OAuth Providers
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Mux (Video)
MUX_TOKEN_ID=""
MUX_TOKEN_SECRET=""
MUX_WEBHOOK_SECRET=""

# Redis (Upstash)
UPSTASH_REDIS_URL=""
UPSTASH_REDIS_TOKEN=""

# Storage (AWS S3 / Cloudflare R2)
S3_BUCKET=""
S3_ACCESS_KEY=""
S3_SECRET_KEY=""
S3_REGION="auto"

# Email (Resend)
RESEND_API_KEY=""

# Monitoring
SENTRY_DSN=""
SENTRY_ORG=""
SENTRY_PROJECT=""

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=""
NEXT_PUBLIC_POSTHOG_HOST=""
```

### 8.2 Docker Setup
```dockerfile
# Dockerfile
FROM node:22-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ead_user
      POSTGRES_PASSWORD: ead_pass
      POSTGRES_DB: ead_platform
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://ead_user:ead_pass@postgres:5432/ead_platform
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

  socket-server:
    build:
      context: .
      dockerfile: Dockerfile.socket
    ports:
      - "3001:3001"
    environment:
      REDIS_URL: redis://redis:6379
    depends_on:
      - redis

volumes:
  postgres_data:
```

### 8.3 CI/CD (GitHub Actions)
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm prisma generate
      - run: pnpm test
      - run: pnpm build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 9. Testing Strategy

### 9.1 Unit Tests (Vitest)
```typescript
// __tests__/services/course.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createCourse, publishCourse } from '@/services/course'

describe('Course Service', () => {
  beforeEach(async () => {
    await prisma.course.deleteMany()
  })

  it('should create a draft course', async () => {
    const course = await createCourse({
      title: 'Test Course',
      description: 'Test Description',
      instructorId: 'user-123'
    })

    expect(course.status).toBe('DRAFT')
    expect(course.slug).toBe('test-course')
  })

  it('should not publish course without modules', async () => {
    const course = await createCourse({ /* ... */ })

    await expect(publishCourse(course.id)).rejects.toThrow(
      'Course must have at least one module'
    )
  })
})
```

### 9.2 E2E Tests (Playwright)
```typescript
// e2e/course-purchase.spec.ts
import { test, expect } from '@playwright/test'

test('should complete course purchase flow', async ({ page }) => {
  // Login
  await page.goto('/login')
  await page.fill('[name=email]', 'student@test.com')
  await page.fill('[name=password]', 'password123')
  await page.click('button[type=submit]')

  // Navegar para curso
  await page.goto('/courses/intro-to-react')
  await expect(page.locator('h1')).toContainText('Intro to React')

  // Adicionar ao carrinho
  await page.click('button:has-text("Comprar Agora")')

  // Checkout
  await page.fill('[data-testid=card-number]', '4242424242424242')
  await page.fill('[data-testid=card-expiry]', '12/25')
  await page.fill('[data-testid=card-cvc]', '123')
  await page.click('button:has-text("Finalizar Compra")')

  // Verificar matrícula
  await expect(page).toHaveURL('/my-courses')
  await expect(page.locator('text=Intro to React')).toBeVisible()
})
```

---

## 10. Roadmap de Implementação

### Fase 1: MVP (4-6 semanas)
- [ ] Setup do projeto (Next.js + Prisma + PostgreSQL)
- [ ] Autenticação (NextAuth.js)
- [ ] CRUD de Cursos (Instrutor)
- [ ] Player de vídeo básico (Mux)
- [ ] Sistema de pagamentos (Stripe)
- [ ] Matrícula e acesso a cursos
- [ ] Deploy em Vercel

### Fase 2: Features Core (4 semanas)
- [ ] Chat em tempo real (Socket.io)
- [ ] Sistema de reviews
- [ ] Certificados (geração PDF)
- [ ] Cupons de desconto
- [ ] Dashboard de analytics (Instrutor)
- [ ] Painel Admin (aprovação de cursos)

### Fase 3: Otimização (3 semanas)
- [ ] Cache com Redis
- [ ] CDN para vídeos
- [ ] Otimização de queries (N+1)
- [ ] Full-text search (Algolia ou PostgreSQL)
- [ ] SEO avançado (metadata, sitemap)
- [ ] Email marketing (Resend + React Email)

### Fase 4: Avançado (4 semanas)
- [ ] Sistema de afiliados
- [ ] Gamificação (badges, pontos)
- [ ] Quizzes e avaliações
- [ ] Live streaming (Agora.io)
- [ ] Mobile app (React Native)
- [ ] Internacionalização (i18n)

---

## 11. Métricas de Sucesso

### KPIs Técnicos
- **Performance:**
  - Lighthouse Score > 90
  - TTFB < 200ms
  - LCP < 2.5s
  - CLS < 0.1

- **Disponibilidade:**
  - Uptime > 99.9%
  - Error rate < 0.1%

- **Escalabilidade:**
  - Suporte a 10k usuários simultâneos
  - 1M+ vídeos armazenados

### KPIs de Negócio
- **Conversão:**
  - Taxa de conversão visitante → compra > 2%
  - Taxa de abandono de carrinho < 70%

- **Engajamento:**
  - Taxa de conclusão de cursos > 30%
  - NPS > 50

- **Receita:**
  - MRR growth > 20% m/m
  - Churn rate < 5%

---

## 12. Considerações Finais

### Compliance e Legalidade
- **LGPD/GDPR:** Consentimento explícito, direito ao esquecimento
- **PCI-DSS:** Nunca armazenar dados de cartão (Stripe cuida)
- **Termos de Uso:** Política de reembolso, propriedade intelectual
- **Acessibilidade:** WCAG 2.1 Level AA

### Custos Estimados (MVP - 1000 alunos)
- **Vercel Pro:** $20/mês
- **Neon PostgreSQL:** $19/mês
- **Upstash Redis:** $10/mês
- **Mux:** ~$0.015/min de vídeo + $0.001/min entregue
- **Stripe:** 2.9% + $0.30 por transação
- **Total:** ~$100-200/mês + transaction fees

### Próximos Passos
1. **Validação:** Revisar spec com stakeholders
2. **Setup:** Criar repositório, configurar infra
3. **Sprint Planning:** Quebrar em tasks (Jira/Linear)
4. **Desenvolvimento:** Seguir roadmap por fases
5. **Launch:** Beta privado → Public launch

---

**Fim da Especificação Técnica**

_Para dúvidas ou ajustes, consulte a documentação oficial:_
- Next.js: https://nextjs.org/docs
- Prisma: https://www.prisma.io/docs
- Stripe Connect: https://stripe.com/docs/connect
- Mux: https://docs.mux.com
