# 4. RBAC e Segurança

## Modelo de Autorização

### Roles Base

| Role | Descrição | Acesso Base |
|------|-----------|-------------|
| **STUDENT** | Aluno da plataforma | Visualização de cursos matriculados, progresso, certificados |
| **INSTRUCTOR** | Instrutor/criador de cursos | STUDENT + criação/gestão de cursos próprios, analytics |
| **ADMIN** | Administrador | Acesso total + gestão de usuários, aprovações, financeiro |

## Matriz de Permissões

### Recursos de Curso

| Recurso | Ação | STUDENT | INSTRUCTOR | ADMIN |
|---------|------|---------|------------|-------|
| Course | create | ❌ | ✅ (próprio) | ✅ |
| Course | read (published) | ✅ | ✅ | ✅ |
| Course | read (draft) | ❌ | ✅ (próprio) | ✅ |
| Course | update | ❌ | ✅ (próprio) | ✅ |
| Course | delete | ❌ | ✅ (próprio, se sem vendas) | ✅ |
| Course | publish | ❌ | ✅ (próprio) | ✅ |
| Course | unpublish | ❌ | ✅ (próprio) | ✅ |
| Section | create | ❌ | ✅ (curso próprio) | ✅ |
| Section | update | ❌ | ✅ (curso próprio) | ✅ |
| Section | delete | ❌ | ✅ (curso próprio) | ✅ |
| Lesson | create | ❌ | ✅ (curso próprio) | ✅ |
| Lesson | update | ❌ | ✅ (curso próprio) | ✅ |
| Lesson | delete | ❌ | ✅ (curso próprio) | ✅ |
| LessonAsset | upload | ❌ | ✅ (curso próprio) | ✅ |
| LessonAsset | view | ✅ (se matriculado ou preview) | ✅ | ✅ |

### Recursos de Matrícula

| Recurso | Ação | STUDENT | INSTRUCTOR | ADMIN |
|---------|------|---------|------------|-------|
| Enrollment | create | ✅ (via compra) | ❌ | ✅ (manual) |
| Enrollment | read | ✅ (próprias) | ✅ (cursos próprios) | ✅ |
| Enrollment | delete | ❌ | ❌ | ✅ |
| LessonProgress | update | ✅ (próprio) | ❌ | ✅ |
| Certificate | view | ✅ (próprio) | ✅ (cursos próprios) | ✅ |
| Certificate | issue | Auto (100%) | ❌ | ✅ (manual) |

### Recursos de Pagamento

| Recurso | Ação | STUDENT | INSTRUCTOR | ADMIN |
|---------|------|---------|------------|-------|
| Order | create | ✅ | ✅ | ✅ |
| Order | read | ✅ (próprias) | ✅ (vendas de cursos próprios) | ✅ |
| Payment | read | ✅ (próprios) | ✅ (cursos próprios) | ✅ |
| Refund | request | ✅ (próprios, até 30 dias) | ❌ | ✅ |
| Refund | approve | ❌ | ❌ | ✅ |
| Payout | request | ❌ | ✅ (saldo próprio) | ✅ |
| Payout | approve | ❌ | ❌ | ✅ |

### Recursos de Comunidade

| Recurso | Ação | STUDENT | INSTRUCTOR | ADMIN |
|---------|------|---------|------------|-------|
| Review | create | ✅ (cursos matriculados) | ❌ (próprios cursos) | ✅ |
| Review | update | ✅ (próprio) | ❌ | ✅ |
| Review | delete | ✅ (próprio) | ✅ (curso próprio) | ✅ |
| Question | create | ✅ (cursos matriculados) | ✅ | ✅ |
| Question | update | ✅ (próprio) | ✅ | ✅ |
| Question | delete | ✅ (próprio) | ✅ (curso próprio) | ✅ |
| Answer | create | ✅ (cursos matriculados) | ✅ | ✅ |
| Answer | mark_best | ❌ | ✅ (curso próprio) | ✅ |
| Chat | create | ✅ | ✅ | ✅ |
| ChatMessage | send | ✅ (chats participantes) | ✅ | ✅ |

### Recursos Administrativos

| Recurso | Ação | STUDENT | INSTRUCTOR | ADMIN |
|---------|------|---------|------------|-------|
| User | list | ❌ | ❌ | ✅ |
| User | update | ✅ (próprio perfil) | ✅ (próprio perfil) | ✅ |
| User | ban/suspend | ❌ | ❌ | ✅ |
| User | delete | ✅ (próprio, LGPD) | ✅ (próprio, LGPD) | ✅ |
| Analytics | view | ❌ | ✅ (cursos próprios) | ✅ (global) |
| Coupon | create | ❌ | ✅ (cursos próprios) | ✅ (global) |
| Category | manage | ❌ | ❌ | ✅ |
| Ticket | create | ✅ | ✅ | ✅ |
| Ticket | assign | ❌ | ❌ | ✅ |

## Autorização Multi-Tenant

### Ownership Rules

```typescript
// lib/auth/permissions.ts

type ResourceOwner = {
  userId: string
  role: Role
}

type Resource = {
  id: string
  ownerId?: string
  courseId?: string
  instructorId?: string
}

export function canAccess(
  user: ResourceOwner,
  resource: Resource,
  action: 'read' | 'write' | 'delete'
): boolean {
  // ADMIN: full access
  if (user.role === 'ADMIN') return true

  // INSTRUCTOR: access to own resources
  if (user.role === 'INSTRUCTOR') {
    if (resource.instructorId === user.userId) return true
    if (resource.ownerId === user.userId) return true
  }

  // STUDENT: access to enrolled courses (read only)
  if (user.role === 'STUDENT' && action === 'read') {
    // Check enrollment via DB
    return checkEnrollment(user.userId, resource.courseId)
  }

  return false
}
```

### Middleware de Autorização

```typescript
// middleware/auth.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth/jwt'

export async function authMiddleware(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await verifyJWT(token)
    req.headers.set('x-user-id', user.id)
    req.headers.set('x-user-role', user.role)
    return NextResponse.next()
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}

// HOC para proteção de API Routes
export function withAuth(
  handler: Function,
  options?: { requiredRole?: Role }
) {
  return async (req: Request) => {
    const user = await getCurrentUser(req)

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (options?.requiredRole && user.role !== options.requiredRole) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    return handler(req, user)
  }
}
```

## Controles de Segurança

### 1. Rate Limiting

```typescript
// lib/rate-limit.ts
import { redis } from '@/lib/redis'
import { Ratelimit } from '@upstash/ratelimit'

const rateLimits = {
  // Autenticado
  authenticated: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 req/min
  }),

  // Público
  public: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 req/min
  }),

  // Endpoints sensíveis
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 tentativas em 15min
  }),

  // Upload de arquivos
  upload: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 uploads/hora
  }),
}

export async function checkRateLimit(
  identifier: string,
  type: keyof typeof rateLimits
) {
  const { success, remaining } = await rateLimits[type].limit(identifier)
  return { allowed: success, remaining }
}
```

**Aplicação:**
- Login/Registro: 5 tentativas em 15min (IP-based)
- APIs autenticadas: 100 req/min (user-based)
- APIs públicas: 20 req/min (IP-based)
- Upload de vídeo: 10 uploads/hora (user-based)

### 2. Proteção contra Enumeração de IDs

```typescript
// Usar UUIDs ao invés de IDs sequenciais
// ✅ Correto
id: UUID (ex: '550e8400-e29b-41d4-a716-446655440000')

// ❌ Evitar
id: Integer (ex: 1, 2, 3, 4...)

// Para slugs públicos, usar hash curto
slug: string (ex: 'intro-react-xk92j')
```

### 3. Proteção CSRF

```typescript
// Usar Next.js built-in CSRF protection
// app/api/auth/[...nextauth]/route.ts
export const authOptions: NextAuthOptions = {
  // ...
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
}
```

### 4. Proteção XSS

```typescript
// 1. Sanitização de input
import DOMPurify from 'isomorphic-dompurify'

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href'],
  })
}

// 2. Content Security Policy
// next.config.mjs
export default {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com;
              style-src 'self' 'unsafe-inline';
              img-src 'self' data: https://image.mux.com https://s3.amazonaws.com;
              media-src 'self' https://stream.mux.com;
              connect-src 'self' https://api.stripe.com;
              frame-src https://js.stripe.com;
            `.replace(/\s{2,}/g, ' ').trim(),
          },
        ],
      },
    ]
  },
}
```

### 5. Proteção SSRF

```typescript
// Validar URLs de webhooks
const ALLOWED_WEBHOOK_HOSTS = [
  'api.stripe.com',
  'api.mercadopago.com',
  'api.mux.com',
]

export function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ALLOWED_WEBHOOK_HOSTS.includes(parsed.hostname)
  } catch {
    return false
  }
}
```

### 6. Política de Senhas

```typescript
// lib/auth/password.ts
import bcrypt from 'bcryptjs'

const PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false, // Opcional no MVP
}

export function validatePassword(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < PASSWORD_RULES.minLength) {
    errors.push(`Senha deve ter no mínimo ${PASSWORD_RULES.minLength} caracteres`)
  }

  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Senha deve conter ao menos uma letra maiúscula')
  }

  if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Senha deve conter ao menos uma letra minúscula')
  }

  if (PASSWORD_RULES.requireNumbers && !/\d/.test(password)) {
    errors.push('Senha deve conter ao menos um número')
  }

  return { valid: errors.length === 0, errors }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12) // 12 rounds
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
```

### 7. Autenticação de Dois Fatores (2FA) - Opcional MVP

```typescript
// lib/auth/2fa.ts
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'

export async function generate2FASecret(userEmail: string) {
  const secret = speakeasy.generateSecret({
    name: `EdTech Platform (${userEmail})`,
    issuer: 'EdTech',
  })

  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!)

  return {
    secret: secret.base32,
    qrCode: qrCodeUrl,
  }
}

export function verify2FAToken(token: string, secret: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2, // Allow 2 time steps (±1 minute)
  })
}
```

## Compliance LGPD

### Base Legal e Consentimento

```typescript
// Checkbox obrigatório no cadastro
<form>
  <input type="checkbox" required name="privacy_consent" />
  <label>
    Li e aceito a{' '}
    <a href="/privacy-policy" target="_blank">
      Política de Privacidade
    </a>{' '}
    e os{' '}
    <a href="/terms" target="_blank">
      Termos de Uso
    </a>
    .
  </label>
</form>

// Salvar consentimento no banco
await db.user.create({
  data: {
    email,
    passwordHash,
    privacyConsentAt: new Date(),
    privacyConsentIp: req.ip,
  },
})
```

### Direitos do Titular (DSR - Data Subject Rights)

#### 1. Direito de Acesso

```typescript
// GET /api/user/data-export
export async function exportUserData(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      enrollments: { include: { course: true } },
      orders: { include: { items: true } },
      reviews: true,
      certificates: true,
      // ... todos os dados relacionados
    },
  })

  return {
    personal_data: {
      name: user.name,
      email: user.email,
      created_at: user.createdAt,
    },
    enrollments: user.enrollments,
    orders: user.orders,
    // ...
  }
}
```

#### 2. Direito de Exclusão

```typescript
// DELETE /api/user/delete-account
export async function deleteUserAccount(userId: string) {
  // Soft delete (preserva dados por obrigação legal - 5 anos para dados fiscais)
  await db.user.update({
    where: { id: userId },
    data: {
      deletedAt: new Date(),
      email: `deleted_${userId}@deleted.local`, // Anonimiza email
      name: 'Usuário Removido',
      image: null,
      passwordHash: null,
    },
  })

  // Agendar exclusão permanente após período de retenção
  await scheduleHardDelete(userId, { after: '90 days' })
}
```

#### 3. Direito de Portabilidade

```typescript
// Exportação em formato estruturado (JSON)
export async function exportPortableData(userId: string) {
  const data = await exportUserData(userId)
  return JSON.stringify(data, null, 2)
}
```

### Retenção de Dados

| Tipo de Dado | Período de Retenção | Base Legal |
|--------------|---------------------|------------|
| Dados cadastrais | Até exclusão + 90 dias | Consentimento |
| Dados de pagamento | 5 anos | Obrigação fiscal (Receita Federal) |
| Logs de acesso | 6 meses | Segurança da informação |
| Certificados emitidos | Indefinido (arquivo) | Obrigação legal |
| Mensagens de chat | Até exclusão | Execução de contrato |

### Criptografia

#### Em Trânsito (TLS 1.3)

```nginx
# nginx.conf
ssl_protocols TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
ssl_prefer_server_ciphers off;

# HSTS
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

#### Em Repouso (AES-256)

```typescript
// RDS: Encryption at rest habilitado
resource "aws_db_instance" "postgres" {
  storage_encrypted = true
  kms_key_id        = aws_kms_key.rds.arn
}

// S3: Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "videos" {
  bucket = aws_s3_bucket.videos.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
  }
}
```

#### Campos Sensíveis (Application-Level)

```typescript
// Para CPF, dados bancários
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY! // 32 bytes
const ALGORITHM = 'aes-256-gcm'

export function encrypt(text: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decrypt(encrypted: string): string {
  const [ivHex, authTagHex, encryptedHex] = encrypted.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
```

## Auditoria e Logging

### Audit Logs

```typescript
// model AuditLog
{
  id: UUID
  userId: UUID
  action: string // 'user.created', 'course.published', 'payment.refunded'
  resourceType: string // 'User', 'Course', 'Payment'
  resourceId: UUID
  changes: JSONB // Diff do before/after
  ipAddress: INET
  userAgent: string
  timestamp: TIMESTAMP
}

// Middleware de audit
export async function logAudit(
  userId: string,
  action: string,
  resource: { type: string; id: string },
  changes?: object,
  req?: Request
) {
  await db.auditLog.create({
    data: {
      userId,
      action,
      resourceType: resource.type,
      resourceId: resource.id,
      changes,
      ipAddress: req?.headers.get('x-forwarded-for') || req?.headers.get('x-real-ip'),
      userAgent: req?.headers.get('user-agent'),
    },
  })
}
```

## Checklist de Segurança Pré-Deploy

- [ ] TLS 1.3 configurado em produção
- [ ] HSTS headers habilitados
- [ ] CSP (Content Security Policy) configurado
- [ ] Rate limiting em todos os endpoints
- [ ] CSRF protection habilitado
- [ ] XSS sanitization em inputs de usuário
- [ ] SQL Injection prevenido (Prisma parameterized queries)
- [ ] Secrets em AWS Secrets Manager (não em .env)
- [ ] RDS/Redis em VPC privada (sem IP público)
- [ ] Security Groups restritivos (least privilege)
- [ ] Backups automáticos habilitados
- [ ] Monitoring de segurança (Sentry, CloudWatch)
- [ ] Rotação de secrets (90 dias)
- [ ] Audit logs habilitados
- [ ] LGPD compliance: Política de Privacidade publicada
- [ ] LGPD compliance: Consentimento explícito no cadastro
- [ ] LGPD compliance: Endpoints de DSR implementados
- [ ] Penetration testing básico realizado

---

**Próximo Documento:** APIs HTTP (REST) e Contratos
