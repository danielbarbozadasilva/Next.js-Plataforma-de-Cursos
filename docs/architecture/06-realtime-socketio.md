# 6. Realtime (Socket.io)

## Arquitetura WebSocket

```
Browser → ALB (sticky sessions) → Socket.io Server (ECS) → Redis Adapter → PostgreSQL
```

## Eventos e Payloads

### Chat (Q&A)

#### `chat:join`
**Cliente → Servidor**
```json
{
  "chatId": "cht_abc123"
}
```

**Servidor → Cliente**
```json
{
  "chatId": "cht_abc123",
  "participants": [
    {
      "userId": "usr_abc123",
      "name": "João Silva",
      "role": "STUDENT"
    }
  ],
  "onlineCount": 3
}
```

#### `chat:message`
**Cliente → Servidor**
```json
{
  "chatId": "cht_abc123",
  "content": "Como faço para instalar o React?"
}
```

**Servidor → Room**
```json
{
  "id": "msg_xyz789",
  "chatId": "cht_abc123",
  "userId": "usr_abc123",
  "user": {
    "name": "João Silva",
    "image": "https://..."
  },
  "content": "Como faço para instalar o React?",
  "createdAt": "2024-11-16T10:30:00Z"
}
```

#### `chat:typing`
**Cliente → Servidor**
```json
{
  "chatId": "cht_abc123"
}
```

**Servidor → Room (broadcast)**
```json
{
  "chatId": "cht_abc123",
  "userId": "usr_abc123",
  "userName": "João Silva"
}
```

### Notificações

#### `notification:new`
**Servidor → Cliente**
```json
{
  "id": "ntf_abc123",
  "type": "COURSE_UPDATE",
  "title": "Nova aula adicionada",
  "message": "O curso 'React Avançado' tem uma nova aula: Hooks customizados",
  "link": "/courses/crs_abc123/lessons/lsn_xyz789",
  "createdAt": "2024-11-16T10:30:00Z"
}
```

### Progresso de Vídeo

#### `lesson:progress`
**Cliente → Servidor (throttle: 30s)**
```json
{
  "lessonId": "lsn_abc123",
  "watchedDuration": 450,
  "totalDuration": 600
}
```

**Servidor → Cliente**
```json
{
  "lessonId": "lsn_abc123",
  "progress": 75,
  "saved": true
}
```

### Anúncios do Instrutor

#### `announcement:new`
**Servidor → Room (course:abc123)**
```json
{
  "id": "ann_xyz789",
  "courseId": "crs_abc123",
  "instructor": {
    "name": "Maria Santos",
    "image": "https://..."
  },
  "title": "Atualização importante",
  "content": "Adicionei 5 novas aulas...",
  "createdAt": "2024-11-16T10:30:00Z"
}
```

## Rooms e Namespaces

### Namespaces

| Namespace | Descrição |
|-----------|-----------|
| `/` | Default (notificações gerais) |
| `/chat` | Chat e Q&A |
| `/course/:id` | Eventos do curso |
| `/admin` | Admin dashboard (realtime metrics) |

### Rooms

| Room | Formato | Participantes |
|------|---------|---------------|
| User-specific | `user:{userId}` | Usuário específico |
| Course | `course:{courseId}` | Alunos matriculados |
| Chat | `chat:{chatId}` | Participantes do chat |
| Admin | `admin:dashboard` | Admins |

## Autenticação

```typescript
// server/socket.ts
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token

  if (!token) {
    return next(new Error('Authentication error'))
  }

  try {
    const decoded = await verifyJWT(token)
    socket.data.user = decoded
    next()
  } catch (error) {
    next(new Error('Invalid token'))
  }
})
```

## Autorização por Room

```typescript
socket.on('chat:join', async (data) => {
  const { chatId } = data

  // Verificar se usuário é participante
  const participant = await db.chatParticipant.findUnique({
    where: {
      userId_chatId: {
        userId: socket.data.user.id,
        chatId,
      },
    },
  })

  if (!participant) {
    return socket.emit('error', { message: 'Not authorized' })
  }

  socket.join(`chat:${chatId}`)
  io.to(`chat:${chatId}`).emit('user:joined', {
    userId: socket.data.user.id,
    name: socket.data.user.name,
  })
})
```

## Anti-Spam

```typescript
import { RateLimiterRedis } from 'rate-limiter-flexible'

const chatLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'chat_limit',
  points: 10, // 10 mensagens
  duration: 60, // por minuto
})

socket.on('chat:message', async (data) => {
  try {
    await chatLimiter.consume(socket.data.user.id)
    // Processar mensagem...
  } catch {
    socket.emit('error', { message: 'Too many messages. Please slow down.' })
  }
})
```

## Persistência de Mensagens

```typescript
socket.on('chat:message', async (data) => {
  const { chatId, content } = data

  // Validar
  if (!content || content.length > 2000) {
    return socket.emit('error', { message: 'Invalid message' })
  }

  // Salvar no DB
  const message = await db.chatMessage.create({
    data: {
      chatId,
      userId: socket.data.user.id,
      content: sanitizeHtml(content),
    },
    include: {
      user: { select: { name: true, image: true } },
    },
  })

  // Broadcast para room
  io.to(`chat:${chatId}`).emit('chat:message', {
    id: message.id,
    chatId: message.chatId,
    userId: message.userId,
    user: message.user,
    content: message.content,
    createdAt: message.createdAt,
  })

  // Incrementar unread count para outros participantes
  await db.chatParticipant.updateMany({
    where: {
      chatId,
      userId: { not: socket.data.user.id },
    },
    data: {
      unreadCount: { increment: 1 },
    },
  })
})
```

## Scaling com Redis Adapter

```typescript
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'

const pubClient = createClient({ url: process.env.REDIS_URL })
const subClient = pubClient.duplicate()

await Promise.all([pubClient.connect(), subClient.connect()])

io.adapter(createAdapter(pubClient, subClient))
```

**Benefícios:**
- Mensagens sincronizadas entre múltiplas instâncias Socket.io
- Broadcast funciona cross-instance
- Rooms compartilhadas

## Health Check

```typescript
// GET /socket/health
app.get('/socket/health', (req, res) => {
  const connectedSockets = io.engine.clientsCount
  const rooms = io.sockets.adapter.rooms.size

  res.json({
    status: 'healthy',
    connectedSockets,
    rooms,
    uptime: process.uptime(),
  })
})
```

## Monitoring

```typescript
io.on('connection', (socket) => {
  // Métricas
  connectionsTotal.inc()

  socket.on('disconnect', () => {
    connectionsTotal.dec()
  })

  socket.on('chat:message', () => {
    messagesTotal.inc({ type: 'chat' })
  })
})
```

---

**Próximo Documento:** Pipeline de Vídeo e CDN
