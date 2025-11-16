# Módulo 3: Aluno (Experiência do Usuário)

## Visão Geral

O Módulo de Aluno implementa toda a experiência do usuário estudante na plataforma EAD, desde a descoberta de cursos até a obtenção de certificados.

## Funcionalidades Implementadas

### 1. Autenticação

#### Cadastro
- **Endpoint**: `POST /api/auth/signup`
- Email/senha tradicional
- Validação com Zod
- Hash de senha com bcrypt
- Auto-login após cadastro

#### Login Social (OAuth)
- Google OAuth
- Facebook OAuth
- Configuração via NextAuth.js

#### Recuperação de Senha
- **Endpoint**: `POST /api/auth/forgot-password`
- Geração de token único
- Expiração em 1 hora
- **Endpoint**: `POST /api/auth/reset-password`
- Validação de token
- Redefinição segura de senha

### 2. Descoberta e Compra de Cursos

#### Listagem de Cursos
- **Endpoint**: `GET /api/student/courses`
- **Filtros**:
  - Busca por texto (título/descrição)
  - Categoria
  - Nível (Iniciante/Intermediário/Avançado)
  - Faixa de preço
  - Avaliação mínima
- **Ordenação**:
  - Mais populares
  - Mais recentes
  - Preço (crescente/decrescente)
  - Melhor avaliados
- Paginação
- Cálculo de média de avaliações

#### Detalhes do Curso
- **Endpoint**: `GET /api/student/courses/[courseId]`
- Informações completas do curso
- Currículo (seções e aulas)
- Avaliações de alunos
- Perfil do instrutor
- Estatísticas (alunos, duração total, etc.)

### 3. Carrinho de Compras

#### Gerenciamento do Carrinho
- **Endpoints**:
  - `GET /api/student/cart` - Buscar carrinho
  - `POST /api/student/cart` - Adicionar curso
  - `DELETE /api/student/cart` - Remover curso
- Carrinho único por usuário
- Validação de duplicatas
- Cálculo automático do total
- Verificação de matrículas existentes

### 4. Lista de Desejos (Wishlist)

#### Gerenciamento da Wishlist
- **Endpoints**:
  - `GET /api/student/wishlist` - Buscar lista
  - `POST /api/student/wishlist` - Adicionar curso
  - `DELETE /api/student/wishlist` - Remover curso
- Múltiplos cursos por usuário
- Informações detalhadas dos cursos salvos

### 5. Checkout e Pagamentos

#### Processamento de Pagamento
- **Endpoint**: `POST /api/student/checkout`
- **Métodos de Pagamento**:
  - Cartão de crédito
  - Pix
  - Boleto bancário
- Aplicação de cupons de desconto
- Criação automática de matrícula
- Limpeza do carrinho após compra
- Simulação de pagamento (integrar gateway real em produção)

### 6. Player de Vídeo e Aprendizado

#### Video Player Customizado
- **Componente**: `VideoPlayer`
- **Funcionalidades**:
  - Play/Pause
  - Controle de velocidade (0.5x - 2x)
  - Ajuste de volume
  - Barra de progresso interativa
  - Controles de qualidade (placeholder)
  - Legendas (placeholder)
  - Modo fullscreen
  - Auto-save de progresso

#### Progresso do Curso
- **Endpoints**:
  - `GET /api/student/progress?courseId=X` - Buscar progresso
  - `POST /api/student/progress` - Marcar aula como completa
- Auto-salvamento a cada 10 segundos
- Cálculo de porcentagem de conclusão
- Geração automática de certificado ao atingir 100%

### 7. Anotações Privadas

#### Gerenciamento de Notas
- **Endpoints**:
  - `GET /api/student/notes?lessonId=X` - Buscar notas
  - `POST /api/student/notes` - Criar nota
  - `PUT /api/student/notes/[noteId]` - Atualizar nota
  - `DELETE /api/student/notes/[noteId]` - Deletar nota
- Notas vinculadas a aulas específicas
- Timestamp opcional (para vídeos)
- Ordenação por timestamp

### 8. Avaliações de Cursos

#### Sistema de Reviews
- **Endpoints**:
  - `GET /api/student/reviews?courseId=X` - Buscar avaliação
  - `POST /api/student/reviews` - Criar/atualizar avaliação
- Avaliação de 1-5 estrelas
- Comentário opcional
- Uma avaliação por aluno/curso
- Requer matrícula ativa

### 9. Q&A (Perguntas e Respostas)

#### Fórum de Dúvidas
- **Endpoints**:
  - `GET /api/student/questions?courseId=X&lessonId=Y` - Listar perguntas
  - `POST /api/student/questions` - Criar pergunta
  - `POST /api/student/answers` - Responder pergunta
- Perguntas por curso ou aula específica
- Respostas de alunos e instrutores
- Marcação de melhor resposta (por instrutor)

### 10. Chat com Instrutor

#### Mensagens Diretas
- **Endpoints**:
  - `GET /api/student/chat` - Listar conversas
  - `POST /api/student/chat` - Criar/buscar conversa com instrutor
  - `GET /api/student/chat/[chatId]/messages` - Buscar mensagens
  - `POST /api/student/chat/[chatId]/messages` - Enviar mensagem
- Chat direto 1-on-1 com instrutor
- Histórico de mensagens
- Timestamp de atualização

### 11. Painel do Aluno (Dashboard)

#### Dashboard Completo
- **Endpoint**: `GET /api/student/dashboard`
- **Informações**:
  - Cursos matriculados com progresso
  - Estatísticas gerais:
    - Total de cursos
    - Cursos em progresso
    - Cursos concluídos
    - Certificados obtidos
    - Total gasto
  - Histórico de compras
  - Lista de certificados

### 12. Certificados PDF

#### Geração de Certificados
- **Endpoint**: `GET /api/student/certificates/[certificateId]`
- Geração automática ao atingir 100%
- Código de verificação único
- Dados do certificado:
  - Nome do aluno
  - Nome do curso
  - Nome do instrutor
  - Data de emissão
  - Código de verificação

## Páginas Front-end

### Páginas Criadas

1. **`/signup`** - Página de cadastro
   - Formulário de registro
   - Login social (Google/Facebook)
   - Validação de formulário

2. **`/courses`** - Catálogo de cursos
   - Busca e filtros
   - Cards de curso
   - Paginação
   - Ordenação

3. **`/student/dashboard`** - Dashboard do aluno
   - Estatísticas
   - Cursos em progresso
   - Acesso rápido

### Componentes

1. **`StudentHeader`** - Header da aplicação para alunos
   - Navegação
   - Menu de usuário
   - Carrinho
   - Links rápidos

2. **`VideoPlayer`** - Player de vídeo customizado
   - Controles completos
   - Auto-save de progresso
   - Velocidade variável
   - Fullscreen

## Modelos do Banco de Dados

### Novos Modelos Adicionados

```prisma
// Carrinho de compras
model Cart {
  id        String     @id @default(cuid())
  userId    String     @unique
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  user      User       @relation(...)
  items     CartItem[]
}

model CartItem {
  id        String   @id @default(cuid())
  cartId    String
  courseId  String
  addedAt   DateTime @default(now())
  cart      Cart     @relation(...)
  course    Course   @relation(...)
  @@unique([cartId, courseId])
}

// Lista de desejos
model Wishlist {
  id        String   @id @default(cuid())
  userId    String
  courseId  String
  addedAt   DateTime @default(now())
  user      User     @relation(...)
  course    Course   @relation(...)
  @@unique([userId, courseId])
}

// Anotações privadas
model Note {
  id        String   @id @default(cuid())
  content   String   @db.Text
  timestamp Float?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  userId    String
  lessonId  String
  user      User     @relation(...)
  lesson    Lesson   @relation(...)
}
```

## Configuração

### Variáveis de Ambiente

Adicione ao `.env`:

```env
# OAuth Providers (opcional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
FACEBOOK_CLIENT_ID="your-facebook-client-id"
FACEBOOK_CLIENT_SECRET="your-facebook-client-secret"
```

### Configuração do OAuth

#### Google OAuth
1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um projeto
3. Ative Google+ API
4. Configure OAuth consent screen
5. Crie credenciais OAuth 2.0
6. Adicione redirect URI: `http://localhost:3000/api/auth/callback/google`

#### Facebook OAuth
1. Acesse [Facebook Developers](https://developers.facebook.com/)
2. Crie um app
3. Adicione Facebook Login
4. Configure Valid OAuth Redirect URIs: `http://localhost:3000/api/auth/callback/facebook`

## Próximos Passos (Melhorias Futuras)

### Integrações de Pagamento
- [ ] Integrar Stripe ou MercadoPago
- [ ] Webhooks para confirmação de pagamento
- [ ] Gestão de reembolsos

### Geração de Certificados
- [ ] Biblioteca de geração de PDF (jsPDF, PDFKit)
- [ ] Template visual de certificado
- [ ] Assinatura digital
- [ ] QR Code para verificação

### Video Player
- [ ] Integração com Mux ou Vimeo
- [ ] Streaming adaptivo (HLS/DASH)
- [ ] Legendas múltiplos idiomas
- [ ] Marcadores de capítulos

### Notificações
- [ ] Email transacional (SendGrid, Resend)
- [ ] Notificações push
- [ ] Notificações in-app

### Socket.io Real-time
- [ ] Chat em tempo real
- [ ] Notificações live
- [ ] Atualização de progresso em tempo real

### Analytics
- [ ] Tracking de engajamento
- [ ] Tempo médio por aula
- [ ] Taxa de conclusão
- [ ] Relatórios personalizados

## Testes

### Endpoints a Testar

1. Criar conta via `/signup`
2. Login via `/login`
3. Explorar cursos em `/courses`
4. Adicionar ao carrinho
5. Adicionar à wishlist
6. Realizar checkout
7. Acessar curso comprado
8. Marcar aulas como completas
9. Criar anotações
10. Avaliar curso
11. Fazer perguntas no Q&A
12. Enviar mensagem ao instrutor
13. Visualizar certificado ao completar 100%

## Tecnologias Utilizadas

- **Next.js 15** - Framework React
- **NextAuth.js 5** - Autenticação
- **Prisma** - ORM
- **MySQL** - Banco de dados
- **TypeScript** - Tipagem
- **Tailwind CSS** - Estilização
- **Zod** - Validação de dados
- **bcryptjs** - Hash de senhas

## Segurança

- ✅ Autenticação JWT
- ✅ Hash de senhas (bcrypt)
- ✅ Validação de inputs (Zod)
- ✅ Proteção de rotas (middleware)
- ✅ CSRF protection (NextAuth)
- ✅ Verificação de permissões
- ✅ Sanitização de dados

## Licença

Este projeto é parte da Plataforma EAD e segue a mesma licença do projeto principal.
