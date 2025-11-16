# Setup Guide - EAD Platform

## Pré-requisitos

### Software Necessário
- **Node.js:** 22.x LTS ou superior
- **pnpm:** 9.x (gerenciador de pacotes)
- **PostgreSQL:** 16.x
- **Redis:** 7.x (opcional para desenvolvimento local)
- **Git:** Última versão

### Contas de Serviços Externos (Para Produção)
- **Stripe Account:** Para pagamentos
- **Mux Account:** Para streaming de vídeo
- **AWS Account:** S3 para armazenamento de arquivos
- **Resend Account:** Para envio de emails
- **Sentry Account:** Para monitoramento de erros

---

## 1. Instalação Local

### 1.1 Clonar o Repositório
```bash
git clone https://github.com/seu-usuario/ead-platform.git
cd ead-platform
```

### 1.2 Instalar Dependências
```bash
# Instalar pnpm globalmente (se ainda não tiver)
npm install -g pnpm

# Instalar dependências do projeto
pnpm install
```

### 1.3 Configurar Banco de Dados PostgreSQL

#### Opção A: Local (com Docker)
```bash
# Criar container PostgreSQL
docker run --name ead-postgres \
  -e POSTGRES_USER=ead_user \
  -e POSTGRES_PASSWORD=ead_pass \
  -e POSTGRES_DB=ead_platform \
  -p 5432:5432 \
  -d postgres:16-alpine

# Verificar se está rodando
docker ps
```

#### Opção B: Cloud (Neon/Supabase)
```bash
# Criar projeto em https://neon.tech ou https://supabase.com
# Copiar a DATABASE_URL fornecida
```

### 1.4 Configurar Redis (Opcional para Dev)

```bash
# Com Docker
docker run --name ead-redis \
  -p 6379:6379 \
  -d redis:7-alpine

# Ou usar Upstash Redis (serverless)
# https://upstash.com
```

### 1.5 Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env com suas credenciais
nano .env
```

**.env (Desenvolvimento)**
```bash
# Database
DATABASE_URL="postgresql://ead_user:ead_pass@localhost:5432/ead_platform"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="gerar-com-openssl-rand-base64-32"

# OAuth (Opcional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Stripe (Chaves de teste)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Mux (Credenciais de teste)
MUX_TOKEN_ID=""
MUX_TOKEN_SECRET=""
MUX_WEBHOOK_SECRET=""

# Redis (Local)
REDIS_URL="redis://localhost:6379"

# Storage (Usar MinIO localmente)
S3_ENDPOINT="http://localhost:9000"
S3_BUCKET="ead-uploads"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_REGION="us-east-1"

# Email (Usar Resend em dev)
RESEND_API_KEY="re_..."

# Socket.io
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
```

### 1.6 Executar Migrations

```bash
# Gerar Prisma Client
pnpm prisma generate

# Criar schema no banco
pnpm prisma db push

# Ou usar migrations
pnpm prisma migrate dev

# Seed (dados iniciais)
pnpm prisma db seed
```

### 1.7 Iniciar Servidores

#### Terminal 1: Next.js (App)
```bash
pnpm dev
# Acesse http://localhost:3000
```

#### Terminal 2: Socket.io Server
```bash
pnpm dev:socket
# Rodando em http://localhost:3001
```

#### Terminal 3: BullMQ Worker (Background Jobs)
```bash
pnpm dev:worker
```

---

## 2. Estrutura do Projeto

```
ead-platform/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Grupo de rotas de autenticação
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── (marketing)/              # Homepage e páginas públicas
│   │   ├── page.tsx
│   │   ├── courses/
│   │   └── categories/
│   ├── (student)/                # Área do aluno
│   │   ├── dashboard/
│   │   ├── my-courses/
│   │   └── learning/[courseId]/[lessonId]/
│   ├── (instructor)/             # Área do instrutor
│   │   ├── dashboard/
│   │   ├── courses/
│   │   └── analytics/
│   ├── (admin)/                  # Painel administrativo
│   │   ├── dashboard/
│   │   ├── users/
│   │   └── courses/
│   ├── api/                      # API Routes
│   │   ├── auth/
│   │   ├── courses/
│   │   ├── payments/
│   │   └── webhooks/
│   └── layout.tsx
│
├── components/                   # Componentes reutilizáveis
│   ├── ui/                       # Shadcn UI components
│   ├── course/
│   │   ├── CourseCard.tsx
│   │   ├── CoursePlayer.tsx
│   │   └── CourseCurriculum.tsx
│   ├── chat/
│   │   └── ChatRoom.tsx
│   └── layouts/
│
├── lib/                          # Utilitários
│   ├── prisma.ts                 # Prisma Client singleton
│   ├── auth.ts                   # NextAuth config
│   ├── stripe.ts                 # Stripe client
│   ├── mux.ts                    # Mux client
│   ├── redis.ts                  # Redis client
│   └── utils.ts
│
├── server/                       # Backend logic
│   ├── routers/                  # tRPC routers
│   │   ├── course.ts
│   │   ├── user.ts
│   │   └── payment.ts
│   ├── services/                 # Business logic
│   │   ├── courseService.ts
│   │   ├── paymentService.ts
│   │   └── emailService.ts
│   ├── socket.ts                 # Socket.io server
│   └── workers/                  # Background jobs
│       ├── emailWorker.ts
│       └── videoProcessingWorker.ts
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── public/
│   ├── images/
│   └── icons/
│
├── hooks/                        # Custom React hooks
│   ├── useSocket.ts
│   ├── useCourse.ts
│   └── useWatchProgress.ts
│
├── types/                        # TypeScript types
│   ├── course.ts
│   ├── user.ts
│   └── payment.ts
│
├── config/
│   ├── site.ts                   # Site metadata
│   └── constants.ts
│
├── __tests__/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.example
├── .env.local
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── docker-compose.yml
└── README.md
```

---

## 3. Configuração de Serviços Externos

### 3.1 Stripe (Pagamentos)

#### Criar Conta
1. Acesse https://stripe.com
2. Crie uma conta
3. Ative o modo de teste

#### Configurar Webhook
1. Dashboard → Developers → Webhooks
2. Add endpoint: `https://seu-dominio.com/api/webhooks/stripe`
3. Eventos a escutar:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `customer.subscription.created`
4. Copiar **Webhook Secret** para `.env`

#### Stripe Connect (Marketplace)
```bash
# Configurar conta conectada para instrutores
# Docs: https://stripe.com/docs/connect
```

### 3.2 Mux (Streaming de Vídeo)

#### Criar Conta
1. Acesse https://mux.com
2. Crie um projeto
3. Gere credenciais em Settings → Access Tokens

#### Configurar Webhook
1. Settings → Webhooks
2. Add endpoint: `https://seu-dominio.com/api/webhooks/mux`
3. Eventos:
   - `video.asset.ready`
   - `video.asset.errored`
   - `video.live_stream.active`
4. Copiar **Webhook Secret**

#### Exemplo de Upload
```typescript
// lib/mux.ts
import Mux from '@mux/mux-node'

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
})

export async function createUploadUrl() {
  const upload = await mux.video.uploads.create({
    cors_origin: process.env.NEXT_PUBLIC_APP_URL,
    new_asset_settings: {
      playback_policy: ['signed'],
      encoding_tier: 'smart',
    }
  })

  return upload.url
}
```

### 3.3 AWS S3 (Armazenamento)

#### Configurar Bucket
```bash
# Instalar AWS CLI
brew install awscli

# Configurar credenciais
aws configure

# Criar bucket
aws s3 mb s3://ead-platform-uploads

# Configurar CORS
aws s3api put-bucket-cors --bucket ead-platform-uploads --cors-configuration file://cors.json
```

**cors.json**
```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://seu-dominio.com"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

### 3.4 Resend (Email Transacional)

```typescript
// lib/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendWelcomeEmail(to: string, name: string) {
  await resend.emails.send({
    from: 'EAD Platform <noreply@ead-platform.com>',
    to,
    subject: 'Bem-vindo à Plataforma!',
    react: WelcomeEmailTemplate({ name })
  })
}
```

### 3.5 Sentry (Monitoramento de Erros)

```bash
# Instalar SDK
pnpm add @sentry/nextjs

# Configurar
npx @sentry/wizard -i nextjs
```

**sentry.client.config.ts**
```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
})
```

---

## 4. Desenvolvimento

### 4.1 Comandos Úteis

```bash
# Desenvolvimento
pnpm dev              # Iniciar Next.js
pnpm dev:socket       # Iniciar Socket.io server
pnpm dev:worker       # Iniciar BullMQ worker

# Build
pnpm build            # Build de produção
pnpm start            # Rodar build de produção

# Database
pnpm prisma studio    # GUI do banco de dados
pnpm prisma migrate dev --name nome_da_migration
pnpm prisma db seed   # Popular banco com dados de teste

# Testes
pnpm test             # Rodar todos os testes
pnpm test:unit        # Testes unitários
pnpm test:e2e         # Testes E2E (Playwright)

# Linting
pnpm lint             # ESLint
pnpm type-check       # TypeScript check

# Docker
docker-compose up -d  # Iniciar todos os serviços
docker-compose logs -f app  # Ver logs
docker-compose down   # Parar serviços
```

### 4.2 Workflow de Desenvolvimento

1. **Criar Branch**
```bash
git checkout -b feature/nome-da-feature
```

2. **Desenvolver**
```bash
# Fazer alterações
# Testar localmente
pnpm dev
```

3. **Testar**
```bash
pnpm test
pnpm lint
pnpm type-check
```

4. **Commit**
```bash
git add .
git commit -m "feat: adicionar autenticação OAuth"
```

5. **Push e PR**
```bash
git push origin feature/nome-da-feature
# Abrir Pull Request no GitHub
```

### 4.3 Padrões de Código

#### Commits (Conventional Commits)
```
feat: nova funcionalidade
fix: correção de bug
docs: alteração em documentação
style: formatação, ponto e vírgula
refactor: refatoração de código
test: adicionar testes
chore: atualizar dependências
```

#### Nomenclatura
```typescript
// Components: PascalCase
export function CourseCard() {}

// Hooks: camelCase com prefixo 'use'
export function useCourseData() {}

// Utilities: camelCase
export function formatCurrency() {}

// Constants: UPPER_SNAKE_CASE
export const MAX_FILE_SIZE = 10 * 1024 * 1024
```

---

## 5. Deploy

### 5.1 Vercel (Recomendado para Next.js)

#### Via CLI
```bash
# Instalar Vercel CLI
pnpm add -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy para produção
vercel --prod
```

#### Via GitHub Integration
1. Conectar repositório GitHub à Vercel
2. Configurar variáveis de ambiente no dashboard
3. Push para `main` → deploy automático

#### Variáveis de Ambiente no Vercel
```bash
# Via CLI
vercel env add DATABASE_URL production
vercel env add STRIPE_SECRET_KEY production

# Ou via Dashboard:
# Settings → Environment Variables
```

### 5.2 Railway (Para Socket.io Server)

```bash
# Instalar CLI
npm i -g @railway/cli

# Login
railway login

# Criar projeto
railway init

# Deploy
railway up

# Adicionar variáveis
railway variables set REDIS_URL=redis://...
```

**railway.json**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install && pnpm build:socket"
  },
  "deploy": {
    "startCommand": "node server/socket.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 5.3 Docker Production

```dockerfile
# Dockerfile.prod
FROM node:22-alpine AS base

# Deps
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile --prod

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN pnpm prisma generate
RUN pnpm build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
```

**docker-compose.prod.yml**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ead_platform
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/ead_platform
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  socket:
    build:
      context: .
      dockerfile: Dockerfile.socket
    ports:
      - "3001:3001"
    environment:
      REDIS_URL: redis://redis:6379
    depends_on:
      - redis
    restart: unless-stopped

volumes:
  postgres_data:
```

### 5.4 CI/CD (GitHub Actions)

**.github/workflows/ci.yml**
```yaml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - run: pnpm install

      - run: pnpm prisma generate

      - run: pnpm lint

      - run: pnpm type-check

      - run: pnpm test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db

      - run: pnpm build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 6. Troubleshooting

### Problema: Erro de conexão com PostgreSQL
```bash
# Verificar se PostgreSQL está rodando
docker ps

# Ver logs
docker logs ead-postgres

# Testar conexão
psql -h localhost -U ead_user -d ead_platform
```

### Problema: Prisma não encontra o schema
```bash
# Regenerar Prisma Client
pnpm prisma generate

# Limpar cache
rm -rf node_modules/.prisma
pnpm install
```

### Problema: Erro de CORS no Socket.io
```typescript
// server/socket.ts
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL,
    credentials: true,
    methods: ['GET', 'POST']
  }
})
```

### Problema: Webhooks não funcionam localmente
```bash
# Usar Stripe CLI para redirecionar webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Para Mux, usar ngrok
ngrok http 3000
# Configurar URL do ngrok no dashboard do Mux
```

---

## 7. Recursos Adicionais

### Documentação
- **Next.js:** https://nextjs.org/docs
- **Prisma:** https://www.prisma.io/docs
- **NextAuth.js:** https://next-auth.js.org
- **Stripe:** https://stripe.com/docs
- **Mux:** https://docs.mux.com
- **Socket.io:** https://socket.io/docs

### Comunidade
- **Discord:** https://discord.gg/nextjs
- **Forum:** https://github.com/vercel/next.js/discussions

### Ferramentas Úteis
- **Prisma Studio:** GUI para banco de dados
- **Stripe CLI:** Testar webhooks localmente
- **ngrok:** Expor localhost para internet
- **Postman:** Testar APIs
- **TablePlus:** Cliente PostgreSQL

---

**Fim do Setup Guide**
