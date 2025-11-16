# EAD Platform - Plataforma de Cursos Online (Udemy-like)

> Uma plataforma completa de ensino a distância (EAD) construída com Next.js 15, TypeScript, PostgreSQL e Socket.io.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.0-green)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 📋 Visão Geral

Esta plataforma EAD permite que instrutores criem e vendam cursos online, enquanto alunos podem adquirir e assistir conteúdos de vídeo com recursos avançados como:

- 🎥 **Streaming de Vídeo**: Upload, transcoding automático (HLS) via Mux
- 💳 **Pagamentos**: Integração com Stripe, PayPal e Mercado Pago
- 💬 **Chat em Tempo Real**: Socket.io para Q&A e suporte
- 📊 **Analytics**: Dashboard completo para instrutores e administradores
- 🎓 **Certificados**: Geração automática ao completar cursos
- 🔒 **Segurança**: Autenticação JWT, DRM para vídeos, proteção contra pirataria
- 🌍 **Escalável**: Arquitetura preparada para milhares de usuários simultâneos

---

## 🚀 Stack Tecnológico

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5.6
- **Styling:** TailwindCSS 4 + Shadcn UI
- **State Management:** Zustand + React Query
- **Forms:** React Hook Form + Zod
- **Video Player:** Mux Player React / Video.js

### Backend
- **Runtime:** Node.js 22 LTS
- **API:** Next.js API Routes + tRPC
- **Database:** PostgreSQL 16 + Prisma ORM
- **Cache:** Redis 7 (Upstash)
- **WebSocket:** Socket.io 4.7
- **Queue:** BullMQ
- **Auth:** NextAuth.js v5

### Infraestrutura
- **Hosting:** Vercel (Frontend/API)
- **Database:** Neon / Supabase
- **Storage:** AWS S3 / Cloudflare R2
- **Video:** Mux (transcoding + CDN)
- **Email:** Resend
- **Monitoring:** Sentry + Vercel Analytics

---

## 📚 Documentação

Este projeto possui documentação técnica completa:

- **[TECHNICAL_SPECIFICATION.md](TECHNICAL_SPECIFICATION.md)** - Especificação técnica completa da arquitetura
- **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** - Schema do banco de dados e diagrama ER
- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Documentação de todos os endpoints da API
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Guia passo a passo para configuração

---

## 🎯 Funcionalidades Principais

### Para Alunos
- ✅ Navegação e busca de cursos
- ✅ Carrinho de compras e checkout
- ✅ Player de vídeo com controle de progresso
- ✅ Marcação de aulas como completas
- ✅ Certificados ao concluir cursos
- ✅ Avaliações e reviews
- ✅ Chat em tempo real com instrutores
- ✅ Dashboard de progresso

### Para Instrutores
- ✅ Criação e gestão de cursos
- ✅ Upload de vídeos (transcoding automático)
- ✅ Organização de módulos e aulas
- ✅ Precificação e cupons
- ✅ Dashboard de analytics
- ✅ Gestão de alunos e Q&A
- ✅ Pagamentos e saques (split automático)

### Para Administradores
- ✅ Dashboard com métricas gerais
- ✅ Aprovação/rejeição de cursos
- ✅ Gestão de usuários (banir, suspender)
- ✅ Gerenciamento de pagamentos e reembolsos
- ✅ Criação de cupons globais
- ✅ Sistema de CMS (páginas estáticas, blog)
- ✅ Audit logs

---

## 🛠️ Quick Start

### Pré-requisitos
- Node.js 22+ instalado
- PostgreSQL 16+ rodando
- pnpm instalado (`npm i -g pnpm`)

### Instalação

```bash
# 1. Clonar repositório
git clone https://github.com/seu-usuario/ead-platform.git
cd ead-platform

# 2. Instalar dependências
pnpm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# 4. Setup do banco de dados
pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma db seed

# 5. Rodar em desenvolvimento
pnpm dev
```

Acesse: **http://localhost:3000**

Para instruções detalhadas, consulte o [SETUP_GUIDE.md](SETUP_GUIDE.md).

---

## 📁 Estrutura do Projeto

```
ead-platform/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Autenticação
│   ├── (marketing)/         # Homepage e catálogo
│   ├── (student)/           # Área do aluno
│   ├── (instructor)/        # Área do instrutor
│   ├── (admin)/             # Painel admin
│   └── api/                 # API Routes
├── components/              # Componentes React
├── lib/                     # Utilitários
├── server/                  # Backend (tRPC, services)
├── prisma/                  # Schema e migrations
├── hooks/                   # Custom hooks
├── types/                   # TypeScript types
└── __tests__/               # Testes
```

---

## 🧪 Testes

```bash
# Testes unitários
pnpm test

# Testes E2E (Playwright)
pnpm test:e2e

# Coverage
pnpm test:coverage
```

---

## 🚢 Deploy

### Vercel (Recomendado)

```bash
# Instalar CLI
pnpm add -g vercel

# Deploy
vercel --prod
```

Ou conecte seu repositório GitHub à Vercel para deploy automático.

### Docker

```bash
# Build
docker-compose up --build

# Produção
docker-compose -f docker-compose.prod.yml up -d
```

Consulte o [SETUP_GUIDE.md](SETUP_GUIDE.md#deploy) para mais opções.

---

## 🔐 Segurança

- **Autenticação:** JWT via NextAuth.js
- **Rate Limiting:** 100 req/min (autenticado), 20 req/min (público)
- **DRM:** Vídeos protegidos com signed URLs (Mux)
- **Validação:** Zod em todas as entradas
- **HTTPS:** Obrigatório em produção
- **Compliance:** LGPD/GDPR ready

---

## 🌐 APIs e Integrações

### Pagamentos
- **Stripe Connect** (marketplace splits)
- **PayPal** (alternativa)
- **Mercado Pago** (Brasil)

### Vídeo
- **Mux:** Transcoding, HLS streaming, DRM
- **AWS MediaConvert:** (alternativa)

### Email
- **Resend:** Transacional
- **React Email:** Templates

### Armazenamento
- **AWS S3 / Cloudflare R2:** Upload de arquivos

---

## 📊 Performance

### Métricas Alvo
- Lighthouse Score: **> 90**
- TTFB: **< 200ms**
- LCP: **< 2.5s**
- Uptime: **> 99.9%**

### Otimizações
- ✅ Server-side Rendering (SSR)
- ✅ Static Site Generation (SSG)
- ✅ Redis caching
- ✅ CDN para assets
- ✅ Image optimization (Next.js)
- ✅ Code splitting

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'feat: adicionar nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

Consulte [CONTRIBUTING.md](CONTRIBUTING.md) para diretrizes detalhadas.

---

## 📝 Roadmap

### ✅ Fase 1: MVP (Concluído)
- [x] Autenticação
- [x] CRUD de cursos
- [x] Player de vídeo
- [x] Pagamentos
- [x] Matrículas

### 🚧 Fase 2: Features Core (Em andamento)
- [ ] Chat em tempo real
- [ ] Sistema de reviews
- [ ] Certificados
- [ ] Cupons
- [ ] Analytics

### 📅 Fase 3: Avançado (Planejado)
- [ ] Sistema de afiliados
- [ ] Quizzes e avaliações
- [ ] Live streaming
- [ ] Mobile app (React Native)
- [ ] Internacionalização

---

## 📜 Licença

Este projeto está licenciado sob a [MIT License](LICENSE).

---

## 👥 Autores

**Claude AI** - Arquiteto de Software
- Especificação técnica completa
- Modelagem de dados
- Documentação da API

---

## 🙏 Agradecimentos

- [Next.js](https://nextjs.org/) - Framework React
- [Prisma](https://www.prisma.io/) - ORM
- [Stripe](https://stripe.com/) - Pagamentos
- [Mux](https://mux.com/) - Streaming de vídeo
- [Vercel](https://vercel.com/) - Hosting
- [Shadcn UI](https://ui.shadcn.com/) - Componentes UI

---

## 📞 Suporte

- **Documentação:** [docs/](./docs)
- **Issues:** [GitHub Issues](https://github.com/seu-usuario/ead-platform/issues)
- **Discussões:** [GitHub Discussions](https://github.com/seu-usuario/ead-platform/discussions)

---

## 📈 Status

![Build](https://img.shields.io/github/actions/workflow/status/seu-usuario/ead-platform/ci.yml?branch=main)
![Coverage](https://img.shields.io/codecov/c/github/seu-usuario/ead-platform)
![Version](https://img.shields.io/github/package-json/v/seu-usuario/ead-platform)

---

**Construído com ❤️ usando Next.js e TypeScript**
