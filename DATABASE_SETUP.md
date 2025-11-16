# Configuração do Banco de Dados MySQL com Prisma

Este guia irá ajudá-lo a configurar o banco de dados MySQL para a plataforma EAD.

## 📋 Pré-requisitos

- Node.js 18+ instalado
- MySQL Server 8.0+ instalado e rodando
- Terminal/Command Line

## 🗄️ Passo 1: Configurar o MySQL

### Instalar MySQL (se ainda não tiver)

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

**macOS (com Homebrew):**
```bash
brew install mysql
brew services start mysql
```

**Windows:**
Baixe e instale do site oficial: https://dev.mysql.com/downloads/installer/

### Criar o Banco de Dados

1. Acesse o MySQL:
```bash
mysql -u root -p
```

2. Crie o banco de dados:
```sql
CREATE DATABASE plataforma_ead CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

3. (Opcional) Crie um usuário específico:
```sql
CREATE USER 'ead_user'@'localhost' IDENTIFIED BY 'sua_senha_segura';
GRANT ALL PRIVILEGES ON plataforma_ead.* TO 'ead_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## ⚙️ Passo 2: Configurar as Variáveis de Ambiente

1. Copie o arquivo de exemplo:
```bash
cp .env.example .env
```

2. Edite o arquivo `.env` e configure a `DATABASE_URL`:

**Se usar o usuário root:**
```env
DATABASE_URL="mysql://root:sua_senha@localhost:3306/plataforma_ead"
```

**Se criar um usuário específico:**
```env
DATABASE_URL="mysql://ead_user:sua_senha_segura@localhost:3306/plataforma_ead"
```

**Formato da URL de conexão:**
```
mysql://USUARIO:SENHA@HOST:PORTA/NOME_DO_BANCO
```

## 🚀 Passo 3: Executar as Migrações

### Método 1: Migração Padrão (Recomendado)

```bash
npx prisma migrate dev --name init
```

Este comando irá:
- Criar as tabelas no banco de dados
- Gerar o Prisma Client
- Criar o histórico de migrações

### Método 2: Se houver problemas com download de binários

Se você encontrar erros 403 ao baixar os binários do Prisma, tente:

```bash
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma migrate dev --name init
```

Ou configure variáveis de ambiente permanentemente:

**Linux/macOS:**
```bash
export PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
npx prisma migrate dev --name init
```

**Windows (PowerShell):**
```powershell
$env:PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING="1"
npx prisma migrate dev --name init
```

### Método 3: Push Schema (sem histórico de migrações)

Para desenvolvimento rápido sem criar arquivos de migração:

```bash
npx prisma db push
```

## 🔍 Verificar a Instalação

### Visualizar o banco de dados no Prisma Studio

```bash
npx prisma studio
```

Isso abrirá uma interface web em `http://localhost:5555` onde você pode visualizar e editar os dados.

### Verificar as tabelas criadas

```bash
mysql -u root -p plataforma_ead -e "SHOW TABLES;"
```

Você deve ver 29 tabelas criadas:
- User, Account, Session, VerificationToken
- InstructorProfile
- Course, Category, Section, Lesson
- CourseRequirement, LearningObjective
- VideoData, TextContent, Attachment
- Enrollment, CompletedLesson, Certificate
- Order, OrderItem, Coupon, InstructorPayout
- Review, Question, Answer
- Chat, ChatParticipant, ChatMessage

## 📊 Estrutura do Schema

O schema foi organizado em 6 módulos principais:

1. **Núcleo de Usuários e Autenticação**: User, Account, Session, InstructorProfile
2. **Estrutura do Curso**: Course, Category, Section, Lesson
3. **Conteúdo da Aula**: VideoData, TextContent, Attachment
4. **Matrícula e Progresso**: Enrollment, CompletedLesson, Certificate
5. **Finanças e Pagamentos**: Order, OrderItem, Coupon, InstructorPayout
6. **Comunidade e Chat**: Review, Question, Answer, Chat

## 🔧 Comandos Úteis do Prisma

### Gerar o Prisma Client
```bash
npx prisma generate
```

### Resetar o banco de dados (⚠️ CUIDADO: apaga todos os dados)
```bash
npx prisma migrate reset
```

### Criar uma nova migração
```bash
npx prisma migrate dev --name nome_da_migracao
```

### Aplicar migrações em produção
```bash
npx prisma migrate deploy
```

### Formatar o schema.prisma
```bash
npx prisma format
```

### Validar o schema
```bash
npx prisma validate
```

## 🐛 Troubleshooting

### Erro: "Can't reach database server"

- Verifique se o MySQL está rodando: `sudo systemctl status mysql`
- Verifique as credenciais na DATABASE_URL
- Teste a conexão: `mysql -u root -p`

### Erro: "Database does not exist"

Crie o banco manualmente:
```bash
mysql -u root -p -e "CREATE DATABASE plataforma_ead;"
```

### Erro: "Access denied for user"

- Verifique o usuário e senha na DATABASE_URL
- Verifique as permissões do usuário no MySQL

### Erro ao baixar binários do Prisma (403 Forbidden)

Use a variável de ambiente:
```bash
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma migrate dev
```

## 📚 Próximos Passos

Após configurar o banco de dados:

1. ✅ Configure as outras variáveis de ambiente no `.env`
2. ✅ Implemente a autenticação com NextAuth.js
3. ✅ Configure o upload de arquivos (S3/MinIO)
4. ✅ Integre os gateways de pagamento
5. ✅ Configure o processamento de vídeo (Mux)

## 📖 Recursos

- [Documentação do Prisma](https://www.prisma.io/docs)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [MySQL Documentation](https://dev.mysql.com/doc/)
