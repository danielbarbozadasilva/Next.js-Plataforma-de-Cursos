/**
 * Rate Limiting Middleware
 *
 * Protege a API contra abuso e ataques DDoS
 */

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "../queue/redis";

const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || "100");
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || "900000"); // 15 min

/**
 * Configurações de rate limit por tipo de endpoint
 */
const RATE_LIMIT_CONFIGS: Record<
  string,
  { max: number; window: number }
> = {
  // Auth endpoints - mais restritivo
  auth: {
    max: 5,
    window: 15 * 60 * 1000, // 15 minutos
  },
  // API padrão
  api: {
    max: RATE_LIMIT_MAX,
    window: RATE_LIMIT_WINDOW,
  },
  // Webhooks - menos restritivo (gateways de pagamento)
  webhook: {
    max: 1000,
    window: 60 * 60 * 1000, // 1 hora
  },
  // Upload - restritivo
  upload: {
    max: 10,
    window: 60 * 60 * 1000, // 1 hora
  },
};

/**
 * Obtém identificador único do cliente
 */
function getClientIdentifier(req: NextRequest): string {
  // Tenta obter o userId se estiver autenticado
  const userId = req.headers.get("x-user-id");
  if (userId) return `user:${userId}`;

  // Usa IP como fallback
  const ip =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown";

  return `ip:${ip}`;
}

/**
 * Middleware de rate limiting
 *
 * @example
 * export const GET = withRateLimit("api", async (req) => {
 *   // ... seu código
 * });
 */
export function withRateLimit(
  type: keyof typeof RATE_LIMIT_CONFIGS = "api",
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const config = RATE_LIMIT_CONFIGS[type];
      const identifier = getClientIdentifier(req);

      const { allowed, remaining, resetAt } = await checkRateLimit(
        identifier,
        config.max,
        config.window
      );

      // Adiciona headers de rate limit
      const headers = new Headers();
      headers.set("X-RateLimit-Limit", config.max.toString());
      headers.set("X-RateLimit-Remaining", remaining.toString());
      headers.set("X-RateLimit-Reset", resetAt.toString());

      if (!allowed) {
        const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);

        return NextResponse.json(
          {
            error: {
              message: "Too many requests",
              code: "RATE_LIMIT_EXCEEDED",
              retryAfter,
            },
          },
          {
            status: 429,
            headers: {
              ...Object.fromEntries(headers),
              "Retry-After": retryAfter.toString(),
            },
          }
        );
      }

      // Executa o handler
      const response = await handler(req);

      // Adiciona headers de rate limit à resposta
      headers.forEach((value, key) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error) {
      console.error("Rate limit error:", error);
      // Em caso de erro, permite a requisição (fail-open)
      return await handler(req);
    }
  };
}

/**
 * Helper para aplicar rate limit baseado em IP
 */
export async function rateLimitByIP(
  req: NextRequest,
  max: number = 100,
  window: number = 900000
): Promise<boolean> {
  const ip =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const { allowed } = await checkRateLimit(`ip:${ip}`, max, window);
  return allowed;
}

/**
 * Helper para aplicar rate limit baseado em userId
 */
export async function rateLimitByUser(
  userId: string,
  max: number = 100,
  window: number = 900000
): Promise<boolean> {
  const { allowed } = await checkRateLimit(`user:${userId}`, max, window);
  return allowed;
}
