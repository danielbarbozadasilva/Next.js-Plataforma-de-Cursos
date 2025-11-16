/**
 * Helpers para autenticação e autorização em API Routes
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { Session } from "next-auth";
import { Resource, Action, hasPermission } from "./rbac";

/**
 * Obtém a sessão do usuário autenticado
 * Retorna null se não estiver autenticado
 */
export async function getSession(): Promise<Session | null> {
  try {
    return await auth();
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

/**
 * Middleware que requer autenticação
 * Retorna 401 se não estiver autenticado
 */
export async function requireAuth(): Promise<Session> {
  const session = await getSession();

  if (!session?.user) {
    throw new UnauthorizedError("Authentication required");
  }

  return session;
}

/**
 * Middleware que requer um role específico
 * Retorna 403 se não tiver o role necessário
 */
export async function requireRole(...allowedRoles: Role[]): Promise<Session> {
  const session = await requireAuth();

  if (!allowedRoles.includes(session.user.role)) {
    throw new ForbiddenError(
      `Access denied. Required role: ${allowedRoles.join(" or ")}`
    );
  }

  return session;
}

/**
 * Middleware que requer uma permissão específica
 * Retorna 403 se não tiver a permissão necessária
 */
export async function requirePermission(
  resource: Resource,
  action: Action
): Promise<Session> {
  const session = await requireAuth();

  if (!hasPermission(session.user.role, resource, action)) {
    throw new ForbiddenError(
      `Access denied. No permission to ${action} ${resource}`
    );
  }

  return session;
}

/**
 * Verifica se o usuário é o proprietário do recurso ou é admin
 */
export function canModifyResource(
  session: Session,
  resourceOwnerId: string
): boolean {
  // Admin pode modificar qualquer recurso
  if (session.user.role === Role.ADMIN) {
    return true;
  }

  // Usuário só pode modificar seus próprios recursos
  return session.user.id === resourceOwnerId;
}

/**
 * Middleware que verifica propriedade do recurso
 */
export function requireResourceOwnership(
  session: Session,
  resourceOwnerId: string
): void {
  if (!canModifyResource(session, resourceOwnerId)) {
    throw new ForbiddenError("You can only modify your own resources");
  }
}

// =============================================
// CLASSES DE ERRO CUSTOMIZADAS
// =============================================

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized") {
    super(401, message, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden") {
    super(403, message, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Resource not found") {
    super(404, message, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class BadRequestError extends ApiError {
  constructor(message = "Bad request") {
    super(400, message, "BAD_REQUEST");
    this.name = "BadRequestError";
  }
}

export class ConflictError extends ApiError {
  constructor(message = "Conflict") {
    super(409, message, "CONFLICT");
    this.name = "ConflictError";
  }
}

export class ValidationError extends ApiError {
  constructor(message = "Validation failed", public errors?: any) {
    super(422, message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

// =============================================
// HANDLER DE ERROS
// =============================================

/**
 * Converte erros em respostas HTTP
 */
export function handleApiError(error: unknown): NextResponse {
  console.error("API Error:", error);

  // Se for um ApiError customizado
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          message: error.message,
          code: error.code,
          ...(error instanceof ValidationError && { errors: error.errors }),
        },
      },
      { status: error.statusCode }
    );
  }

  // Se for um erro do Prisma
  if (error instanceof Error && error.name === "PrismaClientKnownRequestError") {
    return NextResponse.json(
      {
        error: {
          message: "Database error",
          code: "DATABASE_ERROR",
        },
      },
      { status: 500 }
    );
  }

  // Erro genérico
  return NextResponse.json(
    {
      error: {
        message: error instanceof Error ? error.message : "Internal server error",
        code: "INTERNAL_ERROR",
      },
    },
    { status: 500 }
  );
}

// =============================================
// WRAPPER PARA API ROUTES COM TRATAMENTO DE ERROS
// =============================================

type ApiHandler = (
  req: NextRequest,
  context?: { params?: Record<string, string> }
) => Promise<NextResponse> | NextResponse;

/**
 * Wrapper para API routes com tratamento automático de erros
 *
 * @example
 * export const GET = withErrorHandler(async (req) => {
 *   const session = await requireAuth();
 *   // ... seu código
 *   return NextResponse.json({ data: ... });
 * });
 */
export function withErrorHandler(handler: ApiHandler): ApiHandler {
  return async (req, context) => {
    try {
      return await handler(req, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

// =============================================
// HELPERS DE RESPOSTA
// =============================================

/**
 * Resposta de sucesso padronizada
 */
export function successResponse(data: any, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Resposta de sucesso para criação (201)
 */
export function createdResponse(data: any): NextResponse {
  return successResponse(data, 201);
}

/**
 * Resposta de sucesso sem conteúdo (204)
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}
