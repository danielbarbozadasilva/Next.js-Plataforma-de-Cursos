# Módulo de Administração - Plataforma EAD

## Visão Geral

Este documento descreve a implementação completa do **Módulo 1: Administrador** da plataforma EAD, similar à Udemy.

## Tecnologias Utilizadas

- **Next.js 15** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Prisma** - ORM para MySQL
- **NextAuth.js v5** - Autenticação
- **Tailwind CSS** - Estilização
- **Shadcn/UI** - Componentes UI
- **Recharts** - Gráficos e visualizações
- **Lucide React** - Ícones

## Estrutura do Projeto

```
src/
├── app/
│   ├── admin/
│   │   ├── layout.tsx                 # Layout do painel admin
│   │   ├── page.tsx                   # Dashboard principal
│   │   ├── users/
│   │   │   ├── page.tsx               # Listagem de usuários
│   │   │   └── [id]/page.tsx          # Detalhes do usuário
│   │   ├── instructors/
│   │   │   ├── page.tsx               # Listagem de instrutores
│   │   │   └── [id]/page.tsx          # Detalhes do instrutor
│   │   ├── courses/
│   │   │   ├── page.tsx               # Listagem de cursos
│   │   │   └── [id]/page.tsx          # Detalhes do curso
│   │   ├── finance/
│   │   │   └── page.tsx               # Gestão financeira
│   │   ├── categories/
│   │   │   └── page.tsx               # Gestão de categorias
│   │   ├── marketing/
│   │   │   └── page.tsx               # Cupons e marketing
│   │   └── settings/
│   │       └── page.tsx               # Configurações
│   ├── login/
│   │   └── page.tsx                   # Página de login
│   ├── unauthorized/
│   │   └── page.tsx                   # Acesso negado
│   ├── layout.tsx                     # Layout raiz
│   └── page.tsx                       # Página inicial
├── components/
│   ├── admin/
│   │   ├── sidebar.tsx                # Barra lateral de navegação
│   │   └── header.tsx                 # Cabeçalho do admin
│   └── ui/                            # Componentes UI reutilizáveis
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── table.tsx
│       └── badge.tsx
├── lib/
│   ├── auth.ts                        # Configuração NextAuth
│   ├── db.ts                          # Cliente Prisma
│   └── utils.ts                       # Funções utilitárias
└── middleware.ts                      # Middleware de autenticação

```

## Funcionalidades Implementadas

### 1. Dashboard Principal
- ✅ Receita do mês com comparação ao mês anterior
- ✅ Novos usuários do mês
- ✅ Cursos pendentes de aprovação
- ✅ Tickets abertos (perguntas sem resposta)
- ✅ Listagem de pedidos recentes

### 2. Gestão de Usuários
- ✅ Listagem completa de usuários (CRUD)
- ✅ Filtros por nome, email e papel (STUDENT/INSTRUCTOR/ADMIN)
- ✅ Visualização detalhada do usuário
- ✅ Histórico de compras
- ✅ Progresso nos cursos matriculados
- ✅ Botões para banimento e reset de senha (UI pronto)
- ✅ Total gasto por usuário

### 3. Gestão de Instrutores
- ✅ Listagem de todos os instrutores
- ✅ Visualização de cursos publicados vs rascunhos
- ✅ Saldo disponível para saque
- ✅ Saques pendentes
- ✅ Histórico de saques
- ✅ Aprovação/rejeição de saques (UI pronto)
- ✅ Cálculo de comissões (70% instrutor / 30% plataforma)
- ✅ Estatísticas de receita e alunos

### 4. Gestão de Cursos
- ✅ Listagem de todos os cursos
- ✅ Filtros por status (publicado/rascunho), categoria e busca
- ✅ Aprovação/rejeição de cursos (UI pronto)
- ✅ Marcar cursos em destaque (UI pronto)
- ✅ Visualização completa do curso (conteúdo, seções, aulas)
- ✅ Metadados (SEO, categoria, tags, nível)
- ✅ Estatísticas (alunos, receita, avaliações)
- ✅ Avaliações dos alunos

### 5. Gestão Financeira
- ✅ Dashboard financeiro com KPIs
- ✅ Receita do mês vs mês anterior
- ✅ Receita total da plataforma
- ✅ Pedidos pendentes
- ✅ Saques pendentes com valores
- ✅ Listagem de todas as transações
- ✅ Filtro por gateway (Stripe/PayPal/Mercado Pago)
- ✅ Resumo de comissões (plataforma vs instrutores)
- ✅ Histórico completo de transações

### 6. CMS - Categorias
- ✅ Listagem de categorias
- ✅ Total de cursos por categoria
- ✅ Cursos publicados vs rascunhos
- ✅ CRUD de categorias (UI pronto)
- ✅ Slug para URLs amigáveis
- ✅ Estatísticas de categorias ativas

### 7. Marketing
- ✅ Gestão de cupons de desconto
- ✅ Tipos de cupom (percentual ou valor fixo)
- ✅ Limite de usos
- ✅ Data de expiração
- ✅ Status (ativo/expirado/esgotado)
- ✅ Estatísticas de uso
- ✅ CRUD de cupons (UI pronto)
- ✅ Placeholder para sistema de afiliados

### 8. Configurações
- ✅ Configurações gerais da plataforma
- ✅ Configuração de comissões
- ✅ Configuração de gateways de pagamento
- ✅ Configuração de provedores de armazenamento

### 9. Autenticação e Segurança
- ✅ Login com credenciais (email/senha)
- ✅ Sessões JWT
- ✅ Middleware de proteção de rotas
- ✅ Verificação de papel ADMIN
- ✅ Página de acesso negado
- ✅ Logout

## Como Executar o Projeto

### Pré-requisitos
- Node.js 18+
- MySQL 8+
- npm ou yarn

### Instalação

1. Clone o repositório e instale as dependências:
```bash
npm install
```

2. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
DATABASE_URL="mysql://user:password@localhost:3306/ead_platform"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="seu-secret-aqui-min-32-chars"
```

3. Execute as migrações do Prisma:
```bash
npm run db:generate
npm run db:migrate
```

4. (Opcional) Popule o banco com dados de teste:
```bash
npm run db:seed
```

5. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

6. Acesse o painel admin:
```
http://localhost:3000/admin
```

## Credenciais de Teste

Após executar o seed, você pode usar:
- **Email**: admin@test.com
- **Senha**: admin123

## Próximos Passos

Para tornar o sistema totalmente funcional, você precisará implementar:

1. **Server Actions** para:
   - Criar/editar/deletar usuários
   - Aprovar/rejeitar cursos
   - Processar saques de instrutores
   - Criar/editar/deletar categorias
   - Criar/editar/deletar cupons

2. **Integração com Gateways de Pagamento**:
   - Stripe
   - PayPal
   - Mercado Pago

3. **Upload de Arquivos**:
   - Imagens de cursos
   - Vídeos (integração com Mux/Vimeo)
   - Anexos de aulas

4. **Notificações**:
   - Email (aprovações, saques, etc.)
   - Push notifications

5. **Relatórios**:
   - Exportação de dados (CSV/PDF)
   - Gráficos avançados
   - Analytics

## Estrutura do Banco de Dados

O schema Prisma completo está em `prisma/schema.prisma` e inclui:

- **User** - Usuários (alunos, instrutores, admins)
- **Course** - Cursos
- **Section** - Seções dos cursos
- **Lesson** - Aulas
- **Enrollment** - Matrículas
- **Order** - Pedidos
- **OrderItem** - Itens dos pedidos
- **InstructorProfile** - Perfil do instrutor
- **InstructorPayout** - Saques
- **Coupon** - Cupons de desconto
- **Category** - Categorias
- **Review** - Avaliações
- E mais...

## Considerações de Performance

- Queries otimizadas com `include` e `select` do Prisma
- Índices no banco de dados
- Paginação implementada (limite de 50 itens)
- Cálculos agregados usando `aggregate` do Prisma

## Segurança

- Autenticação obrigatória em todas as rotas admin
- Verificação de papel (somente ADMIN)
- Proteção contra SQL Injection (Prisma ORM)
- Senhas hasheadas com bcrypt
- CSRF protection via NextAuth

## Suporte

Para dúvidas ou problemas, abra uma issue no repositório.

## Licença

ISC
