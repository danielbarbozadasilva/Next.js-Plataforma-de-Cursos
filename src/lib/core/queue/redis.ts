/**
 * Configuração do Redis para filas e cache
 */

import Redis from "ioredis";

// Configuração do Redis
const redisConfig = {
  host: process.env.REDIS_URL?.replace("redis://", "").split(":")[0] || "localhost",
  port: parseInt(
    process.env.REDIS_URL?.replace("redis://", "").split(":")[1] || "6379"
  ),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Necessário para BullMQ
  enableReadyCheck: false,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

/**
 * Cliente Redis para uso geral (cache, sessions, etc)
 */
export const redis = new Redis(redisConfig);

/**
 * Função helper para criar uma nova conexão Redis
 * Útil para criar workers separados
 */
export function createRedisConnection(): Redis {
  return new Redis(redisConfig);
}

// Event listeners para debug
redis.on("connect", () => {
  console.log("✅ Redis connected");
});

redis.on("error", (error) => {
  console.error("❌ Redis error:", error);
});

redis.on("ready", () => {
  console.log("✅ Redis ready");
});

/**
 * Helpers de cache
 */

/**
 * Armazena valor no cache
 */
export async function setCache(
  key: string,
  value: any,
  ttl?: number
): Promise<void> {
  const serialized = JSON.stringify(value);
  if (ttl) {
    await redis.setex(key, ttl, serialized);
  } else {
    await redis.set(key, serialized);
  }
}

/**
 * Obtém valor do cache
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const value = await redis.get(key);
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Deleta valor do cache
 */
export async function deleteCache(key: string): Promise<void> {
  await redis.del(key);
}

/**
 * Verifica se chave existe no cache
 */
export async function hasCache(key: string): Promise<boolean> {
  const exists = await redis.exists(key);
  return exists === 1;
}

/**
 * Limpa todas as chaves que correspondem a um padrão
 */
export async function clearCachePattern(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

/**
 * Incrementa contador
 */
export async function increment(key: string, ttl?: number): Promise<number> {
  const value = await redis.incr(key);
  if (ttl && value === 1) {
    await redis.expire(key, ttl);
  }
  return value;
}

/**
 * Rate limiting usando Redis
 */
export async function checkRateLimit(
  identifier: string,
  max: number,
  window: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowStart = now - window;

  // Remove entradas antigas
  await redis.zremrangebyscore(key, 0, windowStart);

  // Conta requisições na janela atual
  const count = await redis.zcard(key);

  if (count >= max) {
    const oldest = await redis.zrange(key, 0, 0, "WITHSCORES");
    const resetAt = oldest.length > 1 ? parseInt(oldest[1]) + window : now + window;

    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  // Adiciona a requisição atual
  await redis.zadd(key, now, `${now}-${Math.random()}`);
  await redis.expire(key, Math.ceil(window / 1000));

  return {
    allowed: true,
    remaining: max - count - 1,
    resetAt: now + window,
  };
}
