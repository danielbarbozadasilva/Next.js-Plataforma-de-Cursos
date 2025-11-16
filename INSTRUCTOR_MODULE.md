# Módulo 2: Instrutor (Painel do Criador)

## 📋 Visão Geral

O Módulo Instrutor é uma plataforma completa para criadores de cursos gerenciarem seus conteúdos, interagirem com alunos e acompanharem seus ganhos.

## ✨ Funcionalidades Implementadas

### 1. Dashboard do Instrutor
- **Estatísticas em Tempo Real**
  - Receita do mês com crescimento percentual
  - Saldo disponível para saque
  - Novas matrículas com tendências
  - Avaliação média dos cursos
  - Total de alunos e cursos
  - Perguntas pendentes (Q&A)

- **Widgets Informativos**
  - Matrículas recentes
  - Top 5 cursos mais populares
  - Métricas de engajamento

### 2. Gerenciamento de Cursos
- **CRUD Completo de Cursos**
  - Criar, editar, visualizar e deletar cursos
  - Publicação/despublicação de cursos
  - Validações antes da publicação

- **Configurações do Curso**
  - Informações básicas (título, descrição, nível, idioma)
  - Upload de imagem de capa
  - Definição de preço (com cálculo automático de 70% para o instrutor)
  - Categorização

### 3. Currículo do Curso (Drag-and-Drop)
- **Estrutura Hierárquica**
  - Seções organizadas por ordem
  - Aulas dentro de cada seção
  - Reordenação via drag-and-drop

- **Gerenciamento de Aulas**
  - Criar, editar e deletar aulas
  - Marcar aulas como pré-visualização gratuita
  - Ordenação customizada

- **API RESTful**
  - `/api/instructor/courses/[courseId]/sections` - CRUD de seções
  - `/api/instructor/courses/[courseId]/sections/[sectionId]/lessons` - CRUD de aulas

### 4. Sistema de Comunicação

#### Q&A / Fórum
- **Gestão de Perguntas**
  - Visualizar todas as perguntas dos alunos
  - Filtrar por curso e aula específica
  - Indicador de perguntas não respondidas
  - Sistema de melhor resposta
  - Estatísticas de engajamento

#### Mensagens Diretas (Estrutura Socket.io)
- **Infraestrutura Preparada**
  - Configuração básica do Socket.io
  - Sistema de salas de chat
  - Eventos de digitação em tempo real
  - Suporte para mensagens 1:1

### 5. Analytics e Finanças

#### Analytics
- **Métricas de Desempenho**
  - Total de visualizações
  - Matrículas mensais com crescimento
  - Taxa de conversão
  - Avaliação média
  - Receita por curso
  - Ranking de cursos por vendas

- **Origem do Tráfego** (Estrutura preparada)

#### Finanças
- **Gestão Financeira**
  - Saldo disponível para saque
  - Receita total com breakdown
  - Histórico de reembolsos
  - Saques processados/pendentes/falhados
  - Cálculo automático de 70% de comissão

- **Sistema de Saques**
  - Solicitação de saque
  - Acompanhamento de status
  - Histórico completo

### 6. Sistema de Promoções
- **Cupons de Desconto**
  - Criar cupons personalizados
  - Desconto percentual ou fixo
  - Data de expiração
  - Limite de usos
  - Cupons por curso ou globais
  - Copiar código para compartilhar
  - Ativar/desativar cupons

- **Estatísticas de Uso**
  - Contador de usos
  - Visualização de cupons ativos/inativos

### 7. Upload de Conteúdo
- **API de Upload** (Estrutura base)
  - Suporte para múltiplos tipos: vídeos, PDFs, imagens, ZIPs
  - Validação de tamanho (max 500MB)
  - Validação de tipo de arquivo
  - Preparado para integração com S3, Cloudinary, etc.

### 8. Configurações
- **Perfil do Instrutor**
  - Visualização de informações pessoais
  - Bio e website
  - Estrutura preparada para edição

## 🗄️ Modelos de Dados Adicionados

### Announcement
```prisma
model Announcement {
  id          String   @id @default(cuid())
  title       String
  content     String   @db.Text
  courseId    String
  authorId    String
  createdAt   DateTime @default(now())
  sendEmail   Boolean  @default(true)

  course      Course   @relation(...)
  author      User     @relation(...)
}
```

### Coupon (Atualizado)
```prisma
model Coupon {
  id           String    @id @default(cuid())
  code         String    @unique
  discountType String    // PERCENTAGE ou FIXED
  value        Decimal   @db.Decimal(10, 2)
  expiresAt    DateTime?
  maxUses      Int?
  usedCount    Int       @default(0)
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())

  // Cupom específico de curso/instrutor
  courseId     String?
  instructorId String?

  course       Course?   @relation(...)
  instructor   User?     @relation("InstructorCoupons", ...)
}
```

### CourseTargetAudience
```prisma
model CourseTargetAudience {
  id       String @id @default(cuid())
  text     String
  courseId String
  course   Course @relation(...)
}
```

## 🛣️ Rotas Implementadas

### Páginas do Instrutor
- `/instructor/dashboard` - Dashboard principal
- `/instructor/courses` - Listagem de cursos
- `/instructor/courses/new` - Criar novo curso
- `/instructor/courses/[id]` - Editar curso
- `/instructor/courses/[id]/curriculum` - Gerenciar currículo
- `/instructor/communication/qa` - Q&A / Fórum
- `/instructor/communication/messages` - Mensagens diretas
- `/instructor/analytics` - Analytics
- `/instructor/analytics/finances` - Finanças
- `/instructor/promotions` - Promoções e cupons
- `/instructor/settings` - Configurações

### APIs
- `GET/POST /api/instructor/courses` - Listar/criar cursos
- `GET/PATCH/DELETE /api/instructor/courses/[courseId]` - Operações em curso específico
- `POST /api/instructor/courses/[courseId]/sections` - Criar seção
- `PATCH/DELETE /api/instructor/courses/[courseId]/sections/[sectionId]` - Gerenciar seção
- `POST /api/instructor/courses/[courseId]/sections/[sectionId]/lessons` - Criar aula
- `PATCH/DELETE /api/instructor/courses/[courseId]/sections/[sectionId]/lessons/[lessonId]` - Gerenciar aula
- `GET/POST /api/instructor/coupons` - Listar/criar cupons
- `PATCH/DELETE /api/instructor/coupons/[couponId]` - Gerenciar cupom
- `POST /api/instructor/upload` - Upload de arquivos

## 🔐 Segurança e Permissões

### Autenticação
- Todas as rotas protegidas com NextAuth
- Verificação de papel (INSTRUCTOR ou ADMIN)
- Redirecionamento para `/login` se não autenticado
- Redirecionamento para `/unauthorized` se sem permissão

### Autorização
- Instrutores só podem editar seus próprios cursos
- Validação de propriedade em todas as operações
- Admins têm acesso total

## 🎨 Interface do Usuário

### Componentes Customizados
- `InstructorSidebar` - Navegação lateral
- `InstructorHeader` - Cabeçalho com busca e notificações
- Layout responsivo e moderno
- Uso extensivo de componentes shadcn/ui

### Recursos de UX
- Drag-and-drop para reordenação
- Modais para criação/edição rápida
- Badges de status
- Indicadores de progresso
- Estatísticas visuais com ícones
- Mensagens de confirmação
- Validações em tempo real

## 📦 Dependências Adicionadas

```json
{
  "socket.io": "^4.x",
  "socket.io-client": "^4.x",
  "multer": "^1.x",
  "@types/multer": "^1.x",
  "@dnd-kit/core": "^6.x",
  "@dnd-kit/sortable": "^8.x",
  "@dnd-kit/utilities": "^3.x"
}
```

## 🚀 Próximos Passos para Produção

### Integração de Serviços Externos
1. **Upload de Arquivos**
   - Integrar com AWS S3 ou Cloudinary
   - Implementar processamento de vídeo (Mux, AWS MediaConvert)
   - Gerar thumbnails automáticos

2. **Socket.io**
   - Configurar servidor Socket.io separado
   - Implementar autenticação Socket.io
   - Adicionar sistema de presença
   - Implementar notificações push

3. **Processamento em Background**
   - Fila de jobs para processamento de vídeos
   - Envio de e-mails assíncrono
   - Geração de certificados

4. **Analytics Avançado**
   - Integrar Google Analytics
   - Rastreamento de origem de tráfego
   - Dashboards com gráficos (Chart.js, Recharts)

### Funcionalidades Adicionais
- [ ] Editor rico para descrições (TinyMCE, Quill)
- [ ] Quizzes e exercícios
- [ ] Sistema de anúncios completo
- [ ] Chat em grupo por curso
- [ ] Agendamento de publicação
- [ ] Preview de curso antes de publicar
- [ ] Importação/exportação de cursos
- [ ] Templates de curso

## 📝 Notas de Desenvolvimento

### Padrões Utilizados
- **Server Components** para páginas com dados
- **Client Components** para interatividade
- **API Routes** para operações de backend
- **Prisma** para ORM
- **TypeScript** para type safety

### Boas Práticas
- Validação de dados no cliente e servidor
- Tratamento de erros consistente
- Mensagens de feedback ao usuário
- Loading states
- Proteção contra operações destrutivas

## 🔧 Configuração

### Variáveis de Ambiente Necessárias
```env
# Banco de Dados
DATABASE_URL="mysql://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."

# Upload (Futuro)
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET="..."

# Socket.io (Futuro)
SOCKET_IO_URL="..."
```

### Executar Migrations
```bash
npm run db:generate
npm run db:push
# ou
npm run db:migrate
```

## 📱 Responsividade

Todas as páginas são totalmente responsivas com breakpoints:
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## 🎯 KPIs Monitorados

- Receita total e por curso
- Número de matrículas
- Taxa de conversão
- Avaliação média
- Engajamento (Q&A, mensagens)
- Performance de cupons

---

**Desenvolvido com Next.js 16, TypeScript, Prisma e MySQL**
