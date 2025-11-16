/**
 * Security Middleware
 *
 * Implementa headers de segurança e proteções adicionais
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * Adiciona headers de segurança à resposta
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Previne clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // Previne MIME sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // XSS Protection (legacy, mas ainda útil)
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer Policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy (antigo Feature Policy)
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // Content Security Policy (CSP)
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://www.paypal.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.stripe.com https://stream.mux.com https://api.mercadopago.com",
    "frame-src 'self' https://js.stripe.com https://www.paypal.com",
    "media-src 'self' https://stream.mux.com blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  // Strict Transport Security (HTTPS only)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  return response;
}

/**
 * Middleware de segurança
 */
export function withSecurity(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const response = await handler(req);
    return addSecurityHeaders(response);
  };
}

/**
 * Valida input para prevenir injeções
 */
export function sanitizeInput(input: string): string {
  // Remove caracteres potencialmente perigosos
  return input
    .replace(/[<>]/g, "") // Remove < e >
    .replace(/javascript:/gi, "") // Remove javascript:
    .replace(/on\w+=/gi, "") // Remove event handlers
    .trim();
}

/**
 * Valida e sanitiza objeto
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = {} as T;

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key as keyof T] = sanitizeInput(value) as any;
    } else if (typeof value === "object" && value !== null) {
      sanitized[key as keyof T] = sanitizeObject(value);
    } else {
      sanitized[key as keyof T] = value;
    }
  }

  return sanitized;
}

/**
 * Valida URL para prevenir SSRF
 */
export function isUrlSafe(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Apenas HTTP(S)
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }

    // Bloqueia localhost e IPs privados
    const hostname = parsed.hostname.toLowerCase();

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.16.") ||
      hostname.startsWith("172.17.") ||
      hostname.startsWith("172.18.") ||
      hostname.startsWith("172.19.") ||
      hostname.startsWith("172.2") ||
      hostname.startsWith("172.30.") ||
      hostname.startsWith("172.31.")
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
