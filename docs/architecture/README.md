# Arquitetura EdTech Platform - Plataforma de Cursos Online

## Visão Geral

Este diretório contém a documentação arquitetural completa da plataforma EdTech, uma solução de ensino a distância (EAD) estilo Udemy/Hotmart construída com Next.js 15, TypeScript, PostgreSQL 15+, Redis, Socket.io e serviços AWS.

**Stack Principal:**
- **Frontend/Backend:** Next.js 15 (App Router) + TypeScript
- **Database:** PostgreSQL 15+ (AWS RDS Aurora) + Prisma ORM
- **Cache/Queue:** Redis 7 (ElastiCache) + BullMQ
- **Realtime:** Socket.io (ECS Fargate)
- **Video:** Mux (transcoding + streaming)
- **Payments:** Stripe Connect + Mercado Pago
- **Hosting:** Vercel (Edge/SSR) + AWS (stateful services)

**Mercado Alvo:**
- País: Brasil
- Idioma: pt-BR
- Moeda: BRL
- Compliance: LGPD

**Scale Target (MVP):**
- 5-10k usuários
- 200 req/s pico
- 99.9% uptime
- p95 latência < 300ms

---

## Índice de Documentos

### 📋 1. [Arquitetura de Alto Nível](./01-high-level-architecture.md)
- Diagrama de arquitetura completo (Mermaid)
- Componentes principais (Next.js, Workers, Socket.io, DB, Storage)
- Fluxos de dados principais (visualização de aula, upload de vídeo, checkout)
- Decisão: Monólito Modular vs. Microsserviços
- Critérios de evolução arquitetural
- Estimativa de custos (R$ 1.325-1.980/mês)
- SLAs e targets de performance

**Quando consultar:**
- Onboarding de novos desenvolvedores
- Decisões de infraestrutura
- Estimativas de custo
- Planejamento de escala

---

### 📝 2. [ADRs - Architecture Decision Records](./02-adrs-index.md)
12 decisões arquiteturais fundamentais com contexto, trade-offs e alternativas:

1. **ADR-001:** Next.js 15 App Router
2. **ADR-002:** Prisma ORM + PostgreSQL 15+
3. **ADR-003:** Redis + BullMQ para cache e filas
4. **ADR-004:** Stripe Connect para split de pagamentos
5. **ADR-005:** Mux para transcoding e streaming
6. **ADR-006:** Socket.io para realtime
7. **ADR-007:** BullMQ para jobs assíncronos
8. **ADR-008:** Estratégia de cache multi-layer
9. **ADR-009:** next-intl para i18n
10. **ADR-010:** WCAG 2.2 AA para acessibilidade
11. **ADR-011:** Vitest + Playwright para testes
12. **ADR-012:** OpenTelemetry para observabilidade

**Quando consultar:**
- Entender por que uma tecnologia foi escolhida
- Avaliar mudanças de stack
- Comparar com alternativas
- Documentar novas decisões (usar como template)

---

### 🗄️ 3. [Modelagem de Dados](./03-data-modeling.md)
- ERD completo (Mermaid) com 32 tabelas
- Dicionário de dados detalhado por tabela
- Schemas Prisma com enums
- Índices e constraints
- Relacionamentos e cardinalidades

**Entidades principais:**
- **Autenticação:** User, Account, Session, InstructorProfile, StudentProfile
- **Cursos:** Course, Section, Lesson, LessonAsset, Category, Tag
- **Matrículas:** Enrollment, LessonProgress, Certificate
- **Pagamentos:** Order, OrderItem, Payment, Refund, Payout, Coupon
- **Vídeo:** TranscodingJob, MediaAsset
- **Comunidade:** Review, Question, Answer, Chat, ChatMessage
- **Sistema:** WebhookEvent, Notification, Ticket, Announcement

**Quando consultar:**
- Implementar novas features (entender schema)
- Criar migrations
- Escrever queries
- Otimizar performance (índices)

---

### 🔒 4. [RBAC e Segurança](./04-rbac-security.md)
- Modelo de autorização (STUDENT, INSTRUCTOR, ADMIN)
- Matriz de permissões completa (40+ recursos)
- Autorização multi-tenant (ownership rules)
- Controles de segurança:
  - Rate limiting (5-100 req/min)
  - Proteção CSRF, XSS, SSRF
  - Política de senhas
  - 2FA (opcional)
- Compliance LGPD:
  - Base legal e consentimento
  - DSR (Data Subject Rights)
  - Retenção de dados
  - Criptografia (TLS 1.3, AES-256)
- Auditoria e logging

**Quando consultar:**
- Implementar novos endpoints (verificar RBAC)
- Auditoria de segurança
- Compliance check
- Incident response

---

### 🌐 5. [APIs HTTP (REST) e Contratos](./05-api-contracts.md)
- Convenções gerais (URL pattern, HTTP methods, response format)
- Endpoints por módulo (80+ endpoints):
  - Autenticação
  - Cursos
  - Matrículas
  - Progresso
  - Pagamentos
  - Upload de vídeo
  - Busca
  - Analytics
- Exemplos de request/response
- Paginação (cursor-based e offset-based)
- Idempotência (Idempotency-Key header)
- Webhooks (Stripe, Mercado Pago, Mux)
- Rate limits e versionamento

**Quando consultar:**
- Implementar novos endpoints
- Integrar frontend com backend
- Documentar APIs
- Debugar chamadas de API

---

### ⚡ 6. [Realtime (Socket.io)](./06-realtime-socketio.md)
- Arquitetura WebSocket (ALB + ECS + Redis Adapter)
- Eventos e payloads:
  - Chat (chat:join, chat:message, chat:typing)
  - Notificações (notification:new)
  - Progresso (lesson:progress)
  - Anúncios (announcement:new)
- Rooms e namespaces
- Autenticação (JWT no handshake)
- Autorização por room
- Anti-spam (rate limiting)
- Persistência de mensagens
- Scaling com Redis Adapter
- Health checks e monitoring

**Quando consultar:**
- Implementar features realtime
- Debugar WebSocket connections
- Otimizar performance de chat
- Adicionar novos eventos

---

### 📹 7-12. [Documentação Consolidada](./07-12-consolidated.md)

Consolida 6 entregáveis:

#### 7. Pipeline de Vídeo e CDN
- Fluxo completo: upload → transcoding → streaming
- Configurações Mux (HLS adaptativo 240p-1080p)
- Assinatura de URLs (anti-hotlink)
- DRM (opcional, não MVP)
- Storage e lifecycle (S3)
- Custo estimado ($134/mês para 100h + 10k views)

#### 8. Pagamentos e Split
- Split automático Stripe Connect (70% instrutor / 30% plataforma)
- Fórmula de comissão (incluindo taxas Stripe)
- Processamento de webhooks (idempotente)
- Reembolso (política 30 dias)
- Reconciliação financeira

#### 9. Busca e Descoberta
- Postgres Full-Text Search (MVP) com pg_trgm
- Migração para Meilisearch (quando > 5k cursos)
- Indexação e queries

#### 10. SEO, i18n e A11y
- Estratégia SSR/SSG/ISR por tipo de página
- JSON-LD Schema para cursos
- Sitemap e robots.txt
- Internacionalização (pt-BR baseline, en-US/es-ES futuro)
- WCAG 2.2 AA compliance (player acessível)

#### 11. Observabilidade, SRE e Resiliência
- Métricas-chave (Golden Signals)
- Health checks
- Circuit breakers
- SLOs (99.9% uptime, p95 < 300ms)

#### 12. DevEx, CI/CD e Ambientes
- Estrutura de monorepo
- Pipeline CI/CD (GitHub Actions)
- Ambientes (dev, preview, staging, prod)
- Variáveis de ambiente
- Migrations e seeds
- Geração de tipos

**Quando consultar:**
- Implementar upload de vídeo
- Configurar pagamentos
- Otimizar busca
- SEO improvements
- Setup de monitoramento
- CI/CD troubleshooting

---

### 📅 13. [Backlog e Roadmap](./13-backlog-roadmap.md)
- Estratégia de releases (MVP → MMP → Scale)
- Fase 1 - MVP (3 meses):
  - Epic 1: Autenticação (US-001 a US-003)
  - Epic 2: Gestão de Cursos (US-004 a US-007)
  - Epic 3: Catálogo e Compra (US-008 a US-010)
  - Epic 4: Área do Aluno (US-011 a US-014)
  - Epic 5: Infraestrutura e Deploy
- Fase 2 - MMP (6 meses):
  - Epic 6: Comunidade (Q&A, Chat, Reviews)
  - Epic 7: Certificados
  - Epic 8: Sistema de Cupons
  - Epic 9: Analytics
  - Epic 10: Busca Avançada
- Fase 3 - Scale (12+ meses):
  - Otimizações de performance
  - Features avançadas (Quizzes, Afiliados)
  - Mobile App (React Native)
- Milestones e dependências externas
- Definition of Done

**Quando consultar:**
- Planejamento de sprints
- Priorização de features
- Estimativas de entrega
- Comunicação com stakeholders

---

### ⚠️ 14. [Riscos e Mitigação](./14-risks-mitigation.md)
- Matriz de riscos (Probabilidade × Impacto)
- **Top 5 Riscos Críticos:**
  1. Baixa adoção de instrutores (Severidade: 8)
  2. Runaway financeiro (Severidade: 8)
  3. Concorrência forte (Severidade: 9)
  4. Custos Mux acima do esperado (Severidade: 9)
  5. Falha de segurança (Severidade: 4)
- Riscos técnicos (6):
  - Timeout de API Routes Vercel
  - Lock-in com Vercel
  - Perda de dados (database)
  - Dependência de serviços externos
- Riscos de negócio (3):
  - Baixa retenção de alunos
  - Concorrência
- Riscos operacionais (3):
  - Falta de recursos (time pequeno)
  - Compliance LGPD
- Riscos financeiros (2):
  - Fraude em pagamentos
- Planos de mitigação detalhados
- Registro de lições aprendidas (template)

**Quando consultar:**
- Planejamento de projeto
- Análise de viabilidade
- Incident response
- Review mensal de riscos
- Comunicação com investidores

---

## Fluxo de Leitura Recomendado

### Para Desenvolvedores Novos
1. [Arquitetura de Alto Nível](./01-high-level-architecture.md) - entender visão geral
2. [ADRs](./02-adrs-index.md) - entender decisões técnicas
3. [Modelagem de Dados](./03-data-modeling.md) - entender schema
4. [APIs HTTP](./05-api-contracts.md) - entender contratos
5. [DevEx, CI/CD](./07-12-consolidated.md#12-devex-cicd-e-ambientes) - setup local

### Para Product Managers
1. [Backlog e Roadmap](./13-backlog-roadmap.md) - entender prioridades
2. [Riscos e Mitigação](./14-risks-mitigation.md) - entender riscos de negócio
3. [Arquitetura de Alto Nível](./01-high-level-architecture.md) - entender capacidades técnicas

### Para DevOps/SRE
1. [Arquitetura de Alto Nível](./01-high-level-architecture.md) - entender infra
2. [Observabilidade](./07-12-consolidated.md#11-observabilidade-sre-e-resiliência) - entender monitoring
3. [DevEx, CI/CD](./07-12-consolidated.md#12-devex-cicd-e-ambientes) - entender pipelines
4. [Riscos e Mitigação](./14-risks-mitigation.md) - entender disaster recovery

### Para Security Engineers
1. [RBAC e Segurança](./04-rbac-security.md) - entender controles
2. [APIs HTTP](./05-api-contracts.md) - entender autenticação
3. [Riscos e Mitigação](./14-risks-mitigation.md) - entender riscos de segurança

---

## Ferramentas e Comandos Úteis

### Visualizar Diagramas Mermaid
Use extensão VSCode: [Mermaid Preview](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid)

Ou online: https://mermaid.live/

### Gerar Schema Prisma
```bash
cd prisma
npx prisma generate
npx prisma migrate dev --name init
```

### Rodar Testes
```bash
npm run test              # Unit tests
npm run test:e2e          # E2E tests
npm run test:coverage     # Coverage report
```

### Deploy
```bash
# Preview (PR)
Automático via GitHub Actions

# Staging
git push origin develop

# Production
git push origin main
# (requer aprovação manual)
```

---

## Manutenção desta Documentação

**Responsável:** Arquiteto de Software / Tech Lead

**Frequência de Atualização:**
- ADRs: Sempre que uma decisão arquitetural for tomada
- Modelagem de Dados: A cada nova migration
- APIs: A cada novo endpoint ou mudança de contrato
- Riscos: Mensalmente ou após incidentes
- Backlog: A cada sprint (2 semanas)

**Versionamento:**
- Documentação versionada junto com código (Git)
- Tag releases com versão semântica (v1.0.0, v1.1.0, etc.)
- Changelog mantido em CHANGELOG.md

---

## Contatos

**Equipe Técnica:**
- Tech Lead / Arquiteto: [Nome]
- Backend Lead: [Nome]
- Frontend Lead: [Nome]
- DevOps Lead: [Nome]

**Canais:**
- Slack: #edtech-dev
- Email: dev@edtech.com
- Docs: https://docs.edtech.com

---

## Licença

Documentação interna - Confidencial

© 2024 EdTech Platform. Todos os direitos reservados.

---

**Última Atualização:** 2024-11-16
**Versão:** 1.0.0
**Status:** ✅ Aprovado para MVP
