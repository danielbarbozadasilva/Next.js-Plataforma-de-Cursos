/**
 * CORS Middleware
 *
 * Configura Cross-Origin Resource Sharing
 */

import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS =
  process.env.CORS_ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"];

/**
 * Verifica se a origem é permitida
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // Same-origin requests

  return ALLOWED_ORIGINS.some((allowed) => {
    // Suporta wildcard
    if (allowed === "*") return true;

    // Suporta padrões com * (ex: *.exemplo.com)
    if (allowed.includes("*")) {
      const pattern = allowed.replace(/\*/g, ".*");
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(origin);
    }

    return allowed === origin;
  });
}

/**
 * Adiciona headers CORS à resposta
 */
export function addCorsHeaders(
  response: NextResponse,
  origin: string | null
): NextResponse {
  if (origin && isOriginAllowed(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }

  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, X-User-Id"
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Max-Age", "86400"); // 24 horas

  return response;
}

/**
 * Middleware de CORS
 */
export function withCors(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const origin = req.headers.get("origin");

    // Verifica se a origem é permitida
    if (origin && !isOriginAllowed(origin)) {
      return NextResponse.json(
        {
          error: {
            message: "CORS policy: Origin not allowed",
            code: "CORS_ERROR",
          },
        },
        { status: 403 }
      );
    }

    // Handle preflight request
    if (req.method === "OPTIONS") {
      const response = new NextResponse(null, { status: 204 });
      return addCorsHeaders(response, origin);
    }

    // Execute handler
    const response = await handler(req);

    // Add CORS headers
    return addCorsHeaders(response, origin);
  };
}
