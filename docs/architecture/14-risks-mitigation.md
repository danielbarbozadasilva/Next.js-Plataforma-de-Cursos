# 14. Riscos e Mitigação

## Matriz de Riscos

Classificação:
- **Probabilidade:** Baixa (1), Média (2), Alta (3)
- **Impacto:** Baixo (1), Médio (2), Alto (3), Crítico (4)
- **Severidade:** Probabilidade × Impacto

---

## Riscos Técnicos

### RT-001: Custos de Mux Acima do Esperado
**Categoria:** Financeiro/Técnico
**Probabilidade:** Alta (3)
**Impacto:** Alto (3)
**Severidade:** 9

**Descrição:**
Custos de transcoding e streaming no Mux podem escalar rapidamente se:
- Instrutores fizerem upload de vídeos muito longos (> 2h)
- Alto volume de visualizações (> 50k/mês)
- Re-uploads frequentes (edições de vídeos)

**Impacto Financeiro:**
- Orçamento MVP: R$ 650/mês (100h + 10k views)
- Cenário pior: R$ 3.000+/mês (500h + 50k views)

**Mitigação:**
1. **Preventiva:**
   - Limitar duração de vídeos: **máximo 2h por vídeo**
   - Limitar total de uploads: **10 vídeos/mês por instrutor (free tier)**
   - Avisar instrutor sobre custos antes de upload
   - Comprimir vídeos no cliente antes de upload (ffmpeg.wasm)

2. **Reativa:**
   - Monitorar uso semanal (dashboard Mux)
   - Alertar quando > 80% do budget mensal
   - Plano B: Migrar para Cloudflare Stream (preço fixo $1/1000min)
   - Plano C: Self-hosted transcoding (AWS MediaConvert)

**Responsável:** Backend Lead
**Status:** Mitigado parcialmente

---

### RT-002: Timeout de API Routes da Vercel
**Categoria:** Técnico
**Probabilidade:** Média (2)
**Impacto:** Médio (2)
**Severidade:** 4

**Descrição:**
Vercel Hobby: 10s timeout / Pro: 60s timeout
Operações longas podem falhar:
- Processamento de pagamentos complexos
- Geração de relatórios
- Uploads grandes

**Mitigação:**
1. **Design assíncrono:**
   - Jobs longos → BullMQ workers (ECS)
   - Retornar 202 Accepted imediatamente
   - Cliente faz polling de status

2. **Exemplo:**
```typescript
// ❌ Ruim: Processamento síncrono
POST /api/upload/video
→ Aguarda transcoding (10+ min) → Timeout!

// ✅ Bom: Processamento assíncrono
POST /api/upload/video
→ Retorna 202 Accepted com jobId
→ Worker processa em background
→ Cliente faz GET /api/jobs/:id para status
```

3. **Upgrade para Vercel Pro se necessário**
   - Custo: $20/mês
   - Timeout: 60s (vs. 10s)

**Responsável:** Arquiteto
**Status:** Mitigado (design assíncrono implementado)

---

### RT-003: Lock-in com Vercel
**Categoria:** Arquitetural
**Probabilidade:** Baixa (1)
**Impacto:** Alto (3)
**Severidade:** 3

**Descrição:**
Dependência forte da Vercel pode:
- Dificultar migração para outro provedor
- Expor a aumentos de preço
- Limitar customizações de infra

**Mitigação:**
1. **Manter portabilidade:**
   - Next.js standalone build habilitado
   - Dockerfile para build independente
   - Evitar features exclusivas da Vercel (Edge Middleware complexo)

2. **Plano de saída:**
   - Documentar processo de deploy standalone
   - Testar deploy em AWS ECS trimestralmente
   - Manter infraestrutura IaC (Terraform)

3. **Alternativas:**
   - Railway (similar à Vercel)
   - AWS Amplify
   - Self-hosted (ECS + ALB + CloudFront)

**Responsável:** DevOps Lead
**Status:** Aceito (baixa probabilidade, custo de migração é aceitável)

---

### RT-004: Falha de Segurança (Data Breach)
**Categoria:** Segurança
**Probabilidade:** Baixa (1)
**Impacto:** Crítico (4)
**Severidade:** 4

**Descrição:**
Vazamento de dados de usuários por:
- SQL Injection
- XSS
- Credenciais comprometidas
- Ataque DDoS

**Impacto:**
- Perda de confiança
- Multas LGPD (até 2% do faturamento)
- Processos judiciais

**Mitigação:**
1. **Preventiva:**
   - Prisma ORM (previne SQL Injection)
   - Sanitização de inputs (DOMPurify)
   - CSP headers configurados
   - Rate limiting (100 req/min)
   - Secrets em AWS Secrets Manager
   - RDS/Redis em VPC privada
   - Testes de penetração trimestrais
   - Revisão de código (2 aprovações para merge)

2. **Reativa:**
   - Plano de resposta a incidentes documentado
   - Backup diário (retenção 30 dias)
   - Logs de auditoria (append-only)
   - Seguro cibernético (considerar)

**Responsável:** Security Lead (Arquiteto inicialmente)
**Status:** Mitigado

---

### RT-005: Perda de Dados (Database)
**Categoria:** Infraestrutura
**Probabilidade:** Baixa (1)
**Impacto:** Crítico (4)
**Severidade:** 4

**Descrição:**
Perda de dados por:
- Falha de hardware
- Corrupção de dados
- Migration mal executada
- Erro humano (DROP TABLE acidental)

**Mitigação:**
1. **Preventiva:**
   - RDS Aurora Multi-AZ (alta disponibilidade)
   - Backups automáticos diários (retenção 7 dias)
   - Point-in-time recovery habilitado
   - Migrations testadas em staging primeiro
   - Read-only role para queries de leitura

2. **Reativa:**
   - RTO (Recovery Time Objective): < 1h
   - RPO (Recovery Point Objective): < 24h
   - Runbook de disaster recovery documentado
   - Testes de restore mensais

**Responsável:** DevOps Lead
**Status:** Mitigado

---

## Riscos de Negócio

### RN-001: Baixa Adoção de Instrutores
**Categoria:** Produto/Mercado
**Probabilidade:** Média (2)
**Impacto:** Crítico (4)
**Severidade:** 8

**Descrição:**
Instrutores não criam cursos suficientes por:
- Comissão baixa (70% vs. Udemy 97% em alguns casos)
- Plataforma desconhecida (sem audiência)
- Complexidade de criação de cursos
- Falta de ferramentas (editor de vídeo, etc.)

**Mitigação:**
1. **Aumentar atratividade:**
   - Comissão competitiva: 70% (vs. Hotmart 70%, Udemy 50%)
   - Suporte ativo (onboarding 1:1)
   - Marketing da plataforma (tráfego orgânico)
   - Ferramentas facilitadoras (templates, guias)

2. **Reduzir fricção:**
   - Upload direto do browser (sem S3 manual)
   - Interface intuitiva (drag-and-drop)
   - Preview antes de publicar
   - Tutoriais em vídeo

3. **Incentivos iniciais:**
   - Primeiros 10 instrutores: comissão 80% (3 meses)
   - Co-marketing (divulgar redes sociais do instrutor)
   - Badge "Instrutor Fundador"

**KPIs de Monitoramento:**
- Target MVP: 10 instrutores / 50 cursos
- Target MMP: 100 instrutores / 500 cursos

**Responsável:** Product Lead
**Status:** Em monitoramento

---

### RN-002: Baixa Retenção de Alunos
**Categoria:** Produto
**Probabilidade:** Média (2)
**Impacto:** Alto (3)
**Severidade:** 6

**Descrição:**
Alunos compram cursos mas não completam por:
- Falta de engajamento
- Conteúdo de baixa qualidade
- Dificuldade de navegação

**Mitigação:**
1. **Aumentar engajamento:**
   - Gamificação (badges, streaks)
   - Notificações (email, push) de progresso
   - Lembretes de aulas não assistidas
   - Certificados de conclusão

2. **Qualidade de conteúdo:**
   - Aprovação de cursos antes de publicar (admin review)
   - Sistema de avaliações (reviews)
   - Feedback aos instrutores (analytics de engajamento)

3. **UX otimizada:**
   - Player intuitivo
   - Mobile-friendly
   - Download offline (futuro)

**KPIs de Monitoramento:**
- Target: Taxa de conclusão > 30% (benchmark Udemy: 15-30%)

**Responsável:** Product Lead
**Status:** Em monitoramento

---

### RN-003: Concorrência Forte (Udemy, Hotmart)
**Categoria:** Mercado
**Probabilidade:** Alta (3)
**Impacto:** Alto (3)
**Severidade:** 9

**Descrição:**
Competidores estabelecidos têm:
- Brand recognition
- Audiência grande
- Mais recursos ($$$)
- Features avançadas

**Mitigação:**
1. **Diferenciação:**
   - Foco em nicho (ex: cursos de tecnologia em PT-BR)
   - Curadoria rigorosa (qualidade > quantidade)
   - Suporte humanizado (WhatsApp, chat)
   - Comunidade ativa (Q&A, fóruns)

2. **Vantagens competitivas:**
   - Player de vídeo superior (Mux)
   - Comissão justa (70% vs. Udemy 50%)
   - Sem "race to bottom" de preços (mínimo R$ 50)
   - Pagamentos locais (Pix, Boleto)

3. **Go-to-Market:**
   - Parceria com influenciadores de tech
   - SEO otimizado (conteúdo em blog)
   - Ads segmentados (Google, Meta)

**Responsável:** CEO/Founder
**Status:** Aceito (competição é realidade, foco em diferenciação)

---

## Riscos Operacionais

### RO-001: Falta de Recursos (Time Pequeno)
**Categoria:** Recursos Humanos
**Probabilidade:** Alta (3)
**Impacto:** Médio (2)
**Severidade:** 6

**Descrição:**
Time inicial pequeno (2 devs + 1 designer) pode:
- Atrasar roadmap
- Comprometer qualidade
- Burnout

**Mitigação:**
1. **Priorização rigorosa:**
   - MVP enxuto (apenas features essenciais)
   - Dizer "não" para scope creep
   - Usar ferramenta de gestão (Linear, Jira)

2. **Ferramentas de produtividade:**
   - Shadcn UI (componentes prontos)
   - Prisma (ORM produtivo)
   - GitHub Copilot (assistência de código)
   - Templates Next.js

3. **Contratar quando necessário:**
   - Freelancers para tarefas pontuais
   - Estagiários para tarefas simples
   - Contratar dev 3 no mês 4 (se funding)

**Responsável:** CEO/CTO
**Status:** Aceito

---

### RO-002: Dependência de Serviços Externos
**Categoria:** Operacional
**Probabilidade:** Média (2)
**Impacto:** Alto (3)
**Severidade:** 6

**Descrição:**
Falha em serviços críticos:
- Mux (vídeos offline)
- Stripe (pagamentos offline)
- Vercel (site offline)
- AWS RDS (dados inacessíveis)

**Mitigação:**
1. **SLAs dos provedores:**
   - Mux: 99.9% uptime
   - Stripe: 99.99% uptime
   - Vercel: 99.99% uptime
   - AWS RDS: 99.95% uptime (Multi-AZ)

2. **Fallbacks:**
   - Mux down → Mensagem "Vídeos temporariamente indisponíveis"
   - Stripe down → Fila de retry (24h)
   - Vercel down → Static fallback em S3 (emergência)
   - RDS down → Read Replica (se configurado)

3. **Monitoring:**
   - Status page (Vercel Status, Stripe Status)
   - Alertas proativos (PagerDuty)
   - Runbooks para cada cenário

**Responsável:** DevOps Lead
**Status:** Mitigado parcialmente

---

### RO-003: Problemas de Compliance (LGPD)
**Categoria:** Legal/Regulatório
**Probabilidade:** Baixa (1)
**Impacto:** Alto (3)
**Severidade:** 3

**Descrição:**
Não conformidade com LGPD pode resultar em:
- Multas (até 2% do faturamento, máximo R$ 50M)
- Processos judiciais
- Perda de confiança

**Mitigação:**
1. **Compliance desde o início:**
   - Política de Privacidade publicada
   - Termos de Uso publicados
   - Consentimento explícito no cadastro
   - Direito de acesso (data export)
   - Direito de exclusão (soft delete)
   - Criptografia (TLS + AES-256)
   - Retenção de dados documentada

2. **Processos:**
   - DPO (Data Protection Officer) designado
   - Registro de tratamento de dados
   - Avaliação de impacto (RIPD) anual
   - Treinamento de equipe

3. **Consultoria:**
   - Advogado especializado em LGPD (consultoria trimestral)

**Responsável:** CEO + Legal Counsel
**Status:** Mitigado

---

## Riscos Financeiros

### RF-001: Runaway (Ficar Sem Dinheiro)
**Categoria:** Financeiro
**Probabilidade:** Média (2)
**Impacto:** Crítico (4)
**Severidade:** 8

**Descrição:**
Custos operacionais > Receita pode:
- Forçar shutdown
- Demitir equipe
- Perder tração

**Burn Rate Estimado (MVP):**
| Item | Custo Mensal (R$) |
|------|-------------------|
| Infra (AWS + Vercel + Mux) | 1.500 |
| Salários (2 devs + designer) | 25.000 |
| Marketing | 3.000 |
| Diversos | 1.500 |
| **Total** | **31.000** |

**Runway:**
- Funding: R$ 200.000
- Runway: ~6 meses (sem receita)

**Mitigação:**
1. **Reduzir custos:**
   - Usar tiers gratuitos quando possível
   - Contratar freelancers (ao invés de CLT)
   - Bootstrap máximo (sem escritório)

2. **Aumentar receita:**
   - Lançar MVP em 3 meses
   - 100 vendas/mês × R$ 100 × 30% = R$ 3.000/mês (break-even parcial)
   - Buscar investimento (Seed) no mês 4

3. **Plano B:**
   - Consultoria paralela (founders)
   - Pausa de desenvolvimento (hibernação)

**Responsável:** CEO/CFO
**Status:** Em monitoramento (critical path)

---

### RF-002: Fraude em Pagamentos
**Categoria:** Financeiro/Segurança
**Probabilidade:** Baixa (1)
**Impacto:** Médio (2)
**Severidade:** 2

**Descrição:**
Chargebacks e fraudes podem:
- Perda de receita
- Taxas de chargeback (R$ 50 por)
- Suspensão da conta Stripe

**Mitigação:**
1. **Stripe Radar (anti-fraude nativo):**
   - Machine learning de fraude
   - Block automático de cartões suspeitos
   - 3D Secure para transações de risco

2. **Políticas:**
   - Sem reembolso após 30 dias
   - Limitar 1 compra por cartão por dia
   - Monitorar IPs suspeitos (múltiplas compras)

3. **Processo de disputa:**
   - Responder chargebacks em 7 dias
   - Documentação de evidências (logs, emails)

**Responsável:** Finance Lead (Founder inicialmente)
**Status:** Mitigado

---

## Resumo Executivo de Riscos

### Top 5 Riscos Críticos

| Rank | Risco | Severidade | Status |
|------|-------|------------|--------|
| 1 | RN-001: Baixa adoção de instrutores | 8 | Em monitoramento |
| 2 | RF-001: Runaway | 8 | Em monitoramento |
| 3 | RN-003: Concorrência forte | 9 | Aceito |
| 4 | RT-001: Custos Mux acima do esperado | 9 | Mitigado parcialmente |
| 5 | RT-004: Falha de segurança | 4 | Mitigado |

### Plano de Ação Imediato

1. **Semana 1:**
   - [ ] Configurar monitoramento de custos (Mux, AWS)
   - [ ] Configurar alertas de budget (CloudWatch)
   - [ ] Revisar política de segurança (checklist)

2. **Mês 1:**
   - [ ] Contratar consultoria LGPD
   - [ ] Executar pentest básico
   - [ ] Documentar runbooks de incidentes

3. **Mês 3 (pré-launch):**
   - [ ] Teste de carga (k6/Artillery)
   - [ ] Disaster recovery drill
   - [ ] Revisão de custos vs. budget

---

## Registro de Lições Aprendidas

**Objetivo:** Atualizar este documento a cada incidente/near-miss.

**Template:**
```
Data: YYYY-MM-DD
Risco: [RT-XXX]
O que aconteceu: ...
Impacto real: ...
O que funcionou: ...
O que não funcionou: ...
Ações corretivas: ...
```

**Exemplo:**
```
Data: 2024-12-01
Risco: RT-001 (Custos Mux)
O que aconteceu: Instrutor fez upload de 10 vídeos de 3h cada em um dia
Impacto real: Custo de $150 (5x do esperado)
O que funcionou: Alerta de budget nos avisou em 6h
O que não funcionou: Não havia limite técnico de uploads
Ações corretivas:
- Implementar limite de 5 uploads/dia por instrutor
- Adicionar aviso de custo na UI de upload
```

---

## Próximos Passos

1. Revisar riscos mensalmente em reunião de liderança
2. Atualizar severidades conforme contexto muda
3. Adicionar novos riscos conforme identificados
4. Executar drills de disaster recovery trimestralmente

---

**Fim da Documentação Arquitetural**

**Documentos Relacionados:**
- [01-high-level-architecture.md](./01-high-level-architecture.md)
- [02-adrs-index.md](./02-adrs-index.md)
- [03-data-modeling.md](./03-data-modeling.md)
- [04-rbac-security.md](./04-rbac-security.md)
- [05-api-contracts.md](./05-api-contracts.md)
- [06-realtime-socketio.md](./06-realtime-socketio.md)
- [07-12-consolidated.md](./07-12-consolidated.md)
- [13-backlog-roadmap.md](./13-backlog-roadmap.md)
