/**
 * RBAC (Role-Based Access Control) - Sistema de Controle de Acesso Baseado em Roles
 *
 * Define permissões e recursos para cada role (ADMIN, INSTRUCTOR, STUDENT)
 */

import { Role } from "@prisma/client";
import { Session } from "next-auth";

// Recursos e ações disponíveis no sistema
export enum Resource {
  // Usuários
  USERS = "users",
  USERS_OWN = "users:own",

  // Cursos
  COURSES = "courses",
  COURSES_OWN = "courses:own",
  COURSES_PUBLISH = "courses:publish",

  // Conteúdo
  SECTIONS = "sections",
  LESSONS = "lessons",

  // Finanças
  FINANCES = "finances",
  FINANCES_OWN = "finances:own",
  PAYOUTS = "payouts",
  ORDERS = "orders",

  // Comunidade
  REVIEWS = "reviews",
  QUESTIONS = "questions",
  CHAT = "chat",

  // Admin
  PLATFORM_SETTINGS = "platform_settings",
  CATEGORIES = "categories",
  ANALYTICS = "analytics",
  ANALYTICS_OWN = "analytics:own",

  // Marketing
  COUPONS = "coupons",
  COUPONS_OWN = "coupons:own",
  ANNOUNCEMENTS = "announcements",
  ANNOUNCEMENTS_OWN = "announcements:own",
}

export enum Action {
  CREATE = "create",
  READ = "read",
  UPDATE = "update",
  DELETE = "delete",
  MANAGE = "manage", // Todas as ações
}

// Mapa de permissões por role
const ROLE_PERMISSIONS: Record<Role, Map<Resource, Action[]>> = {
  [Role.ADMIN]: new Map([
    // Admin tem acesso total a tudo
    [Resource.USERS, [Action.MANAGE]],
    [Resource.COURSES, [Action.MANAGE]],
    [Resource.SECTIONS, [Action.MANAGE]],
    [Resource.LESSONS, [Action.MANAGE]],
    [Resource.FINANCES, [Action.MANAGE]],
    [Resource.PAYOUTS, [Action.MANAGE]],
    [Resource.ORDERS, [Action.MANAGE]],
    [Resource.REVIEWS, [Action.MANAGE]],
    [Resource.QUESTIONS, [Action.MANAGE]],
    [Resource.CHAT, [Action.MANAGE]],
    [Resource.PLATFORM_SETTINGS, [Action.MANAGE]],
    [Resource.CATEGORIES, [Action.MANAGE]],
    [Resource.ANALYTICS, [Action.MANAGE]],
    [Resource.COUPONS, [Action.MANAGE]],
    [Resource.ANNOUNCEMENTS, [Action.MANAGE]],
  ]),

  [Role.INSTRUCTOR]: new Map([
    // Acesso próprio
    [Resource.USERS_OWN, [Action.READ, Action.UPDATE]],

    // Cursos próprios - controle total
    [Resource.COURSES_OWN, [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE]],
    [Resource.COURSES_PUBLISH, [Action.UPDATE]], // Pode publicar/despublicar seus cursos
    [Resource.SECTIONS, [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE]],
    [Resource.LESSONS, [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE]],

    // Finanças próprias
    [Resource.FINANCES_OWN, [Action.READ]],
    [Resource.PAYOUTS, [Action.CREATE, Action.READ]], // Pode solicitar saques
    [Resource.ANALYTICS_OWN, [Action.READ]],

    // Comunicação com alunos
    [Resource.QUESTIONS, [Action.READ, Action.CREATE, Action.UPDATE]], // Responder perguntas
    [Resource.CHAT, [Action.READ, Action.CREATE]],
    [Resource.ANNOUNCEMENTS_OWN, [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE]],

    // Marketing próprio
    [Resource.COUPONS_OWN, [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE]],

    // Leitura geral
    [Resource.COURSES, [Action.READ]], // Pode ver outros cursos
    [Resource.REVIEWS, [Action.READ]], // Pode ver reviews dos seus cursos
  ]),

  [Role.STUDENT]: new Map([
    // Acesso próprio
    [Resource.USERS_OWN, [Action.READ, Action.UPDATE]],

    // Cursos - apenas leitura dos matriculados
    [Resource.COURSES, [Action.READ]],
    [Resource.SECTIONS, [Action.READ]],
    [Resource.LESSONS, [Action.READ]],

    // Comunidade
    [Resource.REVIEWS, [Action.CREATE, Action.READ, Action.UPDATE]], // Suas próprias reviews
    [Resource.QUESTIONS, [Action.CREATE, Action.READ, Action.UPDATE]], // Fazer perguntas
    [Resource.CHAT, [Action.READ, Action.CREATE]], // Chat com instrutor

    // Finanças próprias
    [Resource.ORDERS, [Action.CREATE, Action.READ]], // Fazer compras
  ]),
};

/**
 * Verifica se um usuário tem permissão para realizar uma ação em um recurso
 */
export function hasPermission(
  role: Role | undefined,
  resource: Resource,
  action: Action
): boolean {
  if (!role) return false;

  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;

  const resourceActions = permissions.get(resource);
  if (!resourceActions) return false;

  // Se tem MANAGE, tem todas as ações
  if (resourceActions.includes(Action.MANAGE)) return true;

  return resourceActions.includes(action);
}

/**
 * Verifica se o usuário é proprietário do recurso
 * Usado para verificar acesso a recursos "own"
 */
export function isResourceOwner(
  userId: string | undefined,
  resourceOwnerId: string
): boolean {
  return userId === resourceOwnerId;
}

/**
 * Middleware para verificar role
 */
export function requireRole(...allowedRoles: Role[]) {
  return (session: Session | null) => {
    if (!session?.user?.role) {
      throw new Error("Unauthorized: No session found");
    }

    if (!allowedRoles.includes(session.user.role)) {
      throw new Error(`Forbidden: Requires role ${allowedRoles.join(" or ")}`);
    }

    return true;
  };
}

/**
 * Middleware para verificar permissão
 */
export function requirePermission(resource: Resource, action: Action) {
  return (session: Session | null) => {
    if (!session?.user?.role) {
      throw new Error("Unauthorized: No session found");
    }

    if (!hasPermission(session.user.role, resource, action)) {
      throw new Error(`Forbidden: No permission to ${action} ${resource}`);
    }

    return true;
  };
}

/**
 * Verifica se o usuário pode acessar um recurso próprio
 */
export function canAccessOwnResource(
  session: Session | null,
  resourceOwnerId: string,
  ownResource: Resource
): boolean {
  if (!session?.user) return false;

  // Admin pode acessar qualquer recurso
  if (session.user.role === Role.ADMIN) return true;

  // Verifica se é o proprietário e tem permissão no recurso :own
  return isResourceOwner(session.user.id, resourceOwnerId) &&
         hasPermission(session.user.role, ownResource, Action.READ);
}

/**
 * Helper para verificar se é Admin
 */
export function isAdmin(session: Session | null): boolean {
  return session?.user?.role === Role.ADMIN;
}

/**
 * Helper para verificar se é Instrutor
 */
export function isInstructor(session: Session | null): boolean {
  return session?.user?.role === Role.INSTRUCTOR;
}

/**
 * Helper para verificar se é Aluno
 */
export function isStudent(session: Session | null): boolean {
  return session?.user?.role === Role.STUDENT;
}

/**
 * Utilitário para obter todas as permissões de um role
 */
export function getRolePermissions(role: Role): Map<Resource, Action[]> {
  return ROLE_PERMISSIONS[role] || new Map();
}
