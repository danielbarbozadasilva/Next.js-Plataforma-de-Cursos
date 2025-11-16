# 13. Backlog e Roadmap

## Estratégia de Releases

### MVP (Minimum Viable Product) - 3 meses
Versão inicial com funcionalidades essenciais para validação de mercado.

### MMP (Minimum Marketable Product) - 6 meses
Produto com features diferenciadas para competitividade de mercado.

### Scale - 12+ meses
Otimizações para crescimento e features avançadas.

---

## Fase 1: MVP (Meses 1-3)

### Epic 1: Autenticação e Gestão de Usuários
**Prioridade:** P0 (Bloqueante)
**Esforço:** L

#### US-001: Registro de Usuário
**Como** visitante
**Quero** criar uma conta
**Para** acessar a plataforma

**Critérios de Aceitação:**
```gherkin
Given que estou na página de registro
When preencho nome, email e senha válidos
And aceito os termos de privacidade
And clico em "Cadastrar"
Then minha conta é criada
And recebo um email de verificação
And sou redirecionado para o dashboard
```

**Tarefas:**
- [ ] UI de registro (Shadcn Form + Zod)
- [ ] API POST /api/v1/auth/register
- [ ] Validação de senha (8+ chars, uppercase, lowercase, number)
- [ ] Hash bcrypt (12 rounds)
- [ ] Envio de email de verificação (Resend)
- [ ] Testes unitários (cobertura 80%+)

**Dependências:** Nenhuma
**Estimativa:** 5 dias

#### US-002: Login com Email/Senha
**Como** usuário registrado
**Quero** fazer login com email e senha
**Para** acessar minha conta

**Critérios de Aceitação:**
```gherkin
Given que estou na página de login
When preencho email e senha corretos
And clico em "Entrar"
Then sou autenticado
And redirecionado para meu dashboard
And recebo um JWT com validade de 1h
```

**Estimativa:** 3 dias

#### US-003: OAuth (Google)
**Como** visitante
**Quero** fazer login com Google
**Para** acessar rapidamente sem criar senha

**Critérios de Aceitação:**
```gherkin
Given que estou na página de login
When clico em "Entrar com Google"
And autorizo o acesso no popup do Google
Then minha conta é criada/vinculada automaticamente
And sou redirecionado para o dashboard
```

**Estimativa:** 3 dias

---

### Epic 2: Gestão de Cursos (Instrutor)
**Prioridade:** P0
**Esforço:** XL

#### US-004: Criar Curso (Rascunho)
**Como** instrutor
**Quero** criar um novo curso
**Para** começar a adicionar conteúdo

**Critérios de Aceitação:**
```gherkin
Given que sou um instrutor autenticado
When acesso "Criar Curso"
And preencho título, categoria e descrição
And clico em "Salvar Rascunho"
Then o curso é criado com status "rascunho"
And posso editar posteriormente
```

**Estimativa:** 5 dias

#### US-005: Adicionar Seções e Aulas
**Como** instrutor
**Quero** organizar meu curso em seções e aulas
**Para** estruturar o conteúdo

**Critérios de Aceitação:**
```gherkin
Given que tenho um curso criado
When adiciono seções e aulas
And posso reordenar por drag-and-drop
Then a estrutura é salva
And fica visível na preview
```

**Estimativa:** 8 dias

#### US-006: Upload de Vídeo
**Como** instrutor
**Quero** fazer upload de vídeos para minhas aulas
**Para** disponibilizar conteúdo aos alunos

**Critérios de Aceitação:**
```gherkin
Given que tenho uma aula criada
When faço upload de um arquivo MP4 (até 2GB)
Then o vídeo é enviado ao Mux
And vejo o progresso do upload
And recebo notificação quando o processamento terminar
And o vídeo fica disponível na aula
```

**Tarefas:**
- [ ] UI de upload (Uppy.js)
- [ ] API POST /api/v1/upload/video/url (Mux Direct Upload)
- [ ] Worker de polling de status (BullMQ)
- [ ] Webhook Mux (video.asset.ready)
- [ ] Atualizar LessonAsset no DB
- [ ] Testes E2E

**Estimativa:** 13 dias
**Dependências:** Conta Mux configurada

#### US-007: Publicar Curso
**Como** instrutor
**Quero** publicar meu curso
**Para** que alunos possam comprá-lo

**Critérios de Aceitação:**
```gherkin
Given que meu curso tem:
  - Título, descrição e imagem
  - Pelo menos 1 seção
  - Pelo menos 3 aulas com vídeo
  - Preço definido
When clico em "Publicar Curso"
Then o curso fica visível no catálogo
And alunos podem comprá-lo
```

**Estimativa:** 3 dias

---

### Epic 3: Catálogo e Compra (Aluno)
**Prioridade:** P0
**Esforço:** L

#### US-008: Navegar Catálogo de Cursos
**Como** visitante
**Quero** ver todos os cursos disponíveis
**Para** encontrar conteúdo do meu interesse

**Critérios de Aceitação:**
```gherkin
Given que acesso a página inicial
When vejo a lista de cursos
Then posso:
  - Filtrar por categoria
  - Filtrar por nível (BEGINNER, INTERMEDIATE, ADVANCED)
  - Ordenar por popularidade, preço, avaliação
  - Buscar por texto
And vejo 20 cursos por página
```

**Estimativa:** 8 dias

#### US-009: Ver Detalhes do Curso
**Como** visitante
**Quero** ver detalhes completos de um curso
**Para** decidir se quero comprar

**Critérios de Aceitação:**
```gherkin
Given que clico em um curso
Then vejo:
  - Título, subtítulo, descrição completa
  - Informações do instrutor
  - Grade curricular (seções e aulas)
  - Avaliações de alunos
  - Preview gratuito de 1 aula
  - Preço e botão "Comprar"
```

**Estimativa:** 5 days

#### US-010: Checkout e Pagamento (Stripe)
**Como** aluno
**Quero** comprar um curso com cartão de crédito
**Para** ter acesso ao conteúdo

**Critérios de Aceitação:**
```gherkin
Given que clico em "Comprar Curso"
When sou redirecionado para o Stripe Checkout
And preencho dados do cartão
And confirmo o pagamento
Then o pagamento é processado
And sou redirecionado de volta
And recebo confirmação por email
And o curso aparece em "Meus Cursos"
```

**Tarefas:**
- [ ] API POST /api/v1/checkout/create-session
- [ ] Integração Stripe Checkout
- [ ] Webhook handler (checkout.session.completed)
- [ ] Criar Order + Payment + Enrollment
- [ ] Calcular e criar Payout (instrutor)
- [ ] Email de confirmação (Resend)
- [ ] Testes E2E

**Estimativa:** 10 dias
**Dependências:** Conta Stripe Connect configurada

---

### Epic 4: Área do Aluno
**Prioridade:** P0
**Esforço:** XL

#### US-011: Acessar Curso Comprado
**Como** aluno
**Quero** acessar os cursos que comprei
**Para** começar a estudar

**Critérios de Aceitação:**
```gherkin
Given que comprei um curso
When acesso "Meus Cursos"
Then vejo todos os cursos matriculados
And posso clicar para assistir
```

**Estimativa:** 3 dias

#### US-012: Assistir Aula (Player de Vídeo)
**Como** aluno
**Quero** assistir as aulas em vídeo
**Para** aprender o conteúdo

**Critérios de Aceitação:**
```gherkin
Given que estou matriculado em um curso
When clico em uma aula
Then o player de vídeo carrega
And posso:
  - Play/Pause
  - Ajustar velocidade (0.5x, 1x, 1.5x, 2x)
  - Ativar legendas (se disponível)
  - Fullscreen
  - Avançar/voltar 10s
And o progresso é salvo automaticamente a cada 30s
```

**Tarefas:**
- [ ] Integração Mux Player React
- [ ] Gerar signed URL (4h expiração)
- [ ] API POST /api/v1/lessons/:id/progress
- [ ] Salvar watchedDuration em LessonProgress
- [ ] UI de progresso (barra, %)
- [ ] Testes E2E

**Estimativa:** 8 dias

#### US-013: Marcar Aula como Completa
**Como** aluno
**Quero** marcar aulas como concluídas
**Para** acompanhar meu progresso

**Critérios de Aceitação:**
```gherkin
Given que assisti 90%+ de uma aula
When clico em "Marcar como Concluída"
Then a aula é marcada com ✓
And meu progresso no curso é atualizado
```

**Estimativa:** 3 dias

#### US-014: Visualizar Progresso do Curso
**Como** aluno
**Quero** ver meu progresso geral no curso
**Para** saber quanto falta

**Critérios de Aceitação:**
```gherkin
Given que estou em um curso
Then vejo:
  - Percentual de conclusão (ex: 45%)
  - Total de aulas completadas / total de aulas
  - Próxima aula sugerida
```

**Estimativa:** 3 dias

---

### Epic 5: Infraestrutura e Deploy
**Prioridade:** P0
**Esforço:** L

#### Task-001: Setup AWS (RDS, ElastiCache, S3, ECS)
**Estimativa:** 5 dias

#### Task-002: Setup Vercel (Frontend + API)
**Estimativa:** 2 dias

#### Task-003: Setup CI/CD (GitHub Actions)
**Estimativa:** 3 dias

#### Task-004: Configurar Monitoramento (Sentry, CloudWatch)
**Estimativa:** 3 dias

#### Task-005: Configurar Backup Automático (RDS)
**Estimativa:** 2 dias

---

## Fase 2: MMP (Meses 4-6)

### Epic 6: Comunidade e Engajamento
**Prioridade:** P1
**Esforço:** XL

#### US-015: Sistema de Q&A (Perguntas e Respostas)
**Como** aluno
**Quero** fazer perguntas sobre as aulas
**Para** tirar dúvidas

**Estimativa:** 13 dias

#### US-016: Chat em Tempo Real (Socket.io)
**Como** aluno
**Quero** conversar com o instrutor em tempo real
**Para** obter suporte imediato

**Estimativa:** 13 dias

#### US-017: Avaliações (Reviews)
**Como** aluno
**Quero** avaliar cursos que completei
**Para** ajudar outros alunos

**Estimativa:** 8 dias

---

### Epic 7: Certificados
**Prioridade:** P1
**Esforço:** M

#### US-018: Gerar Certificado de Conclusão
**Como** aluno
**Quero** receber um certificado ao completar 100% do curso
**Para** comprovar meu aprendizado

**Tarefas:**
- [ ] Detecção automática de 100%
- [ ] Geração de PDF (Puppeteer)
- [ ] Upload para S3
- [ ] Criar registro Certificate no DB
- [ ] Email de parabenização
- [ ] Página pública de verificação (/certificates/:code)

**Estimativa:** 8 dias

---

### Epic 8: Sistema de Cupons
**Prioridade:** P1
**Esforço:** M

#### US-019: Criar Cupom de Desconto (Instrutor)
**Como** instrutor
**Quero** criar cupons de desconto para meus cursos
**Para** fazer promoções

**Estimativa:** 5 dias

#### US-020: Aplicar Cupom no Checkout (Aluno)
**Como** aluno
**Quero** aplicar um cupom no checkout
**Para** obter desconto

**Estimativa:** 3 dias

---

### Epic 9: Analytics para Instrutor
**Prioridade:** P1
**Esforço:** L

#### US-021: Dashboard de Analytics
**Como** instrutor
**Quero** ver estatísticas dos meus cursos
**Para** entender o desempenho

**Métricas:**
- Receita total e por curso
- Total de matrículas
- Taxa de conclusão
- Tempo médio de visualização
- Avaliação média

**Estimativa:** 13 dias

---

### Epic 10: Busca Avançada
**Prioridade:** P1
**Esforço:** M

#### US-022: Busca Global com Filtros
**Como** aluno
**Quero** buscar cursos por texto
**Para** encontrar rapidamente o que preciso

**Tarefas:**
- [ ] Postgres Full-Text Search (pg_trgm)
- [ ] Filtros: categoria, nível, preço, avaliação
- [ ] Ordenação: relevância, popularidade, preço
- [ ] Sugestões de busca (autocomplete)

**Estimativa:** 8 dias

---

## Fase 3: Scale (Meses 7-12+)

### Epic 11: Otimizações de Performance
**Prioridade:** P2
**Esforço:** L

#### Task-006: Migrar Busca para Meilisearch
**Trigger:** > 5.000 cursos no catálogo
**Estimativa:** 8 days

#### Task-007: Implementar Read Replica (PostgreSQL)
**Trigger:** > 10.000 usuários ativos
**Estimativa:** 5 dias

#### Task-008: CDN para Assets (Cloudflare R2)
**Estimativa:** 3 dias

---

### Epic 12: Features Avançadas
**Prioridade:** P2
**Esforço:** XXL

#### US-023: Quizzes e Avaliações
**Como** instrutor
**Quero** adicionar quizzes às aulas
**Para** testar o conhecimento dos alunos

**Estimativa:** 21 dias

#### US-024: Anotações Privadas
**Como** aluno
**Quero** fazer anotações durante as aulas
**Para** revisar depois

**Estimativa:** 8 dias

#### US-025: Legendas Automáticas (IA)
**Como** instrutor
**Quero** gerar legendas automaticamente
**Para** tornar o curso mais acessível

**Estimativa:** 13 dias

#### US-026: Sistema de Afiliados
**Como** usuário
**Quero** ganhar comissão ao indicar cursos
**Para** monetizar meu alcance

**Estimativa:** 21 dias

---

### Epic 13: Mobile App (React Native)
**Prioridade:** P3
**Esforço:** XXXL

#### US-027: App iOS e Android
**Como** aluno
**Quero** assistir aulas no celular
**Para** estudar em qualquer lugar

**Estimativa:** 3 meses (equipe separada)

---

## Velocidade Estimada

**Time:** 2 devs full-stack + 1 designer

**Velocity:**
- Sprint: 2 semanas
- Story Points/Sprint: 30-40
- Horas/Dev: 40h/semana

**Conversão:**
- P (pequeno): 1-3 dias → 3-5 SP
- M (médio): 5-8 dias → 8-13 SP
- L (grande): 8-13 dias → 13-21 SP
- XL (extra grande): 13-21 dias → 21-34 SP

---

## Milestones

| Milestone | Data Alvo | Entregáveis |
|-----------|-----------|-------------|
| **M1: Alpha Interno** | Mês 1 | Autenticação + CRUD Cursos + Upload Vídeo |
| **M2: Beta Fechado** | Mês 2 | Checkout + Player + Progresso |
| **M3: MVP Launch** | Mês 3 | Busca + Deploy Prod + 10 cursos piloto |
| **M4: MMP Launch** | Mês 6 | Q&A + Chat + Certificados + Cupons |
| **M5: Scale Ready** | Mês 12 | Quizzes + Afiliados + 1.000+ cursos |

---

## Dependências Externas

| Serviço | Quando Configurar | Responsável |
|---------|-------------------|-------------|
| Stripe Connect | Antes M2 | Backend Lead |
| Mux | Antes M1 | Backend Lead |
| AWS (RDS, S3, ECS) | Antes M1 | DevOps |
| Vercel | Antes M1 | DevOps |
| Resend (Email) | Antes M2 | Backend Lead |
| Sentry | Antes M3 | DevOps |

---

## Critérios de Pronto (Definition of Done)

Uma User Story só é considerada concluída quando:

- [ ] Código implementado e revisado (PR aprovado)
- [ ] Testes unitários (cobertura 80%+)
- [ ] Testes E2E para fluxos críticos
- [ ] Documentação atualizada (se aplicável)
- [ ] Deploy em staging e validado
- [ ] Aprovado pelo PO/Stakeholder
- [ ] Sem bugs críticos (P0/P1) abertos

---

**Próximo Documento:** Riscos e Mitigação
