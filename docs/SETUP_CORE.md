# Setup do Módulo Core - Guia de Instalação

Este guia fornece instruções passo a passo para configurar o Módulo Core da plataforma EAD.

## 📦 Pré-requisitos

- Node.js 18+ instalado
- MySQL ou PostgreSQL configurado
- Redis instalado (local ou remoto)
- Conta nos serviços externos (opcional):
  - Stripe (pagamentos)
  - AWS S3 (storage)
  - Mux (vídeo)
  - SendGrid ou Resend (e-mail)

## 🚀 Instalação

### 1. Instalar Dependências

```bash
npm install
```

Isso instalará todas as dependências necessárias do módulo Core.

### 2. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Edite o arquivo `.env` e configure as variáveis essenciais:

#### Configuração Mínima (Desenvolvimento):

```bash
# Database
DATABASE_URL="mysql://root:password@localhost:3306/ead_platform"

# Next Auth
NEXTAUTH_SECRET="sua-chave-secreta-aqui-min-32-caracteres"
NEXTAUTH_URL="http://localhost:3000"

# Redis
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=""

# Application
NODE_ENV="development"
APP_URL="http://localhost:3000"
```

#### Configuração Completa (Produção):

Configure também:
- Credenciais do Stripe/PayPal/Mercado Pago
- AWS S3 credentials
- Mux credentials
- SendGrid ou Resend API key

### 3. Configurar Banco de Dados

Gere o cliente Prisma:

```bash
npm run db:generate
```

Execute as migrações:

```bash
npm run db:migrate
```

Popule dados iniciais (opcional):

```bash
npm run db:seed
```

### 4. Configurar Redis

#### Instalação Local (Linux/macOS):

```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# Iniciar Redis
redis-server
```

#### Instalação Local (Windows):

Baixe Redis for Windows: https://github.com/microsoftarchive/redis/releases

Ou use Docker:

```bash
docker run -d -p 6379:6379 redis:alpine
```

#### Verificar Conexão:

```bash
redis-cli ping
# Deve retornar: PONG
```

### 5. Configurar Webhooks dos Gateways de Pagamento

#### Stripe:

1. Acesse https://dashboard.stripe.com/webhooks
2. Clique em "Add endpoint"
3. URL: `https://seu-dominio.com/api/webhooks/stripe`
4. Selecione eventos:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `charge.refunded`
5. Copie o "Signing secret" para `STRIPE_WEBHOOK_SECRET`

#### PayPal:

1. Acesse https://developer.paypal.com/dashboard/applications
2. Selecione sua aplicação
3. Em "Webhooks", adicione URL: `https://seu-dominio.com/api/webhooks/paypal`
4. Selecione eventos de pagamento
5. Copie o Webhook ID para `PAYPAL_WEBHOOK_ID`

#### Mercado Pago:

1. Acesse https://www.mercadopago.com.br/developers
2. Vá em "Webhooks"
3. Adicione URL: `https://seu-dominio.com/api/webhooks/mercadopago`
4. Copie o secret para `MERCADOPAGO_WEBHOOK_SECRET`

#### Mux:

1. Acesse https://dashboard.mux.com/settings/webhooks
2. Adicione URL: `https://seu-dominio.com/api/webhooks/mux`
3. Selecione eventos de vídeo
4. Copie o secret para `MUX_WEBHOOK_SECRET`

### 6. Executar a Aplicação

#### Modo Desenvolvimento:

Terminal 1 - Next.js:
```bash
npm run dev
```

Terminal 2 - Workers:
```bash
npx ts-node src/lib/core/queue/workers.ts
```

#### Modo Produção:

Build:
```bash
npm run build
```

Iniciar:
```bash
npm start
```

Workers (usando PM2):
```bash
pm2 start src/lib/core/queue/workers.ts --name workers
pm2 save
pm2 startup
```

## 🧪 Testar Funcionalidades

### Testar Pagamento (Stripe):

1. Use cartões de teste: https://stripe.com/docs/testing
2. Cartão de sucesso: `4242 4242 4242 4242`
3. Data: qualquer futura
4. CVV: qualquer 3 dígitos

### Testar Upload de Vídeo:

```bash
curl -X POST http://localhost:3000/api/instructor/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@video.mp4"
```

### Testar E-mail:

```typescript
import { sendWelcomeEmail } from "@/lib/core/email";

await sendWelcomeEmail("teste@example.com", "João Silva");
```

Verifique os logs ou a sandbox do SendGrid.

### Testar Socket.io:

Use o cliente de teste incluído ou ferramentas como:
- https://amritb.github.io/socketio-client-tool/

Conecte em: `http://localhost:3000`

## 🔧 Ferramentas de Monitoramento

### BullMQ Dashboard (Bull Board):

Instale:
```bash
npm install @bull-board/express @bull-board/api
```

Configure em um endpoint admin para visualizar as filas.

### Redis CLI:

```bash
# Monitorar comandos em tempo real
redis-cli monitor

# Ver todas as chaves
redis-cli keys '*'

# Ver estatísticas
redis-cli info stats
```

### Logs:

```bash
# Ver logs da aplicação
npm run dev

# Ver logs dos workers
tail -f logs/workers.log
```

## 🐛 Troubleshooting

### Redis não conecta:

```bash
# Verificar se Redis está rodando
redis-cli ping

# Verificar porta
netstat -an | grep 6379

# Iniciar Redis
redis-server
```

### Stripe webhook não funciona:

```bash
# Use Stripe CLI para testar localmente
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger evento de teste
stripe trigger checkout.session.completed
```

### Workers não processam jobs:

```bash
# Verificar se workers estão rodando
ps aux | grep workers

# Verificar logs
tail -f logs/workers.log

# Reiniciar workers
pm2 restart workers
```

### Upload falha:

- Verifique credenciais AWS S3
- Verifique permissões do bucket
- Verifique tamanho máximo do arquivo
- Verifique CORS do bucket

### Vídeo não processa:

- Verifique credenciais Mux
- Verifique webhook configurado
- Aguarde até 5 minutos para processamento
- Verifique formato do vídeo (MP4, MOV suportados)

## 📝 Checklist de Produção

Antes de colocar em produção:

- [ ] Configurar todas as variáveis de ambiente
- [ ] Usar credenciais de produção (não sandbox)
- [ ] Configurar HTTPS (SSL/TLS)
- [ ] Configurar webhooks com URLs de produção
- [ ] Configurar CORS com domínio real
- [ ] Habilitar rate limiting
- [ ] Configurar backup do banco de dados
- [ ] Configurar backup do Redis
- [ ] Configurar monitoramento (Sentry, Datadog, etc)
- [ ] Configurar logs centralizados
- [ ] Testar recuperação de desastres
- [ ] Configurar auto-scaling se necessário
- [ ] Revisar permissões de segurança
- [ ] Configurar firewall
- [ ] Habilitar 2FA para contas admin

## 🆘 Suporte

Consulte a documentação completa em: `docs/CORE_MODULE.md`

Para problemas específicos:
- Issues no GitHub: [link]
- Discord: [link]
- E-mail: support@plataforma.com
