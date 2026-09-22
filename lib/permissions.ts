import { SessionData } from "./session";

export function canViewLead(user: SessionData, lead: { assignedCounsellorId: string | null; createdById: string }): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "COUNSELLOR") return lead.assignedCounsellorId === user.userId;
  if (user.role === "RECEPTIONIST") return lead.createdById === user.userId;
  return false;
}

export function canEditLead(user: SessionData, lead: { assignedCounsellorId: string | null; createdById: string }): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "COUNSELLOR") return lead.assignedCounsellorId === user.userId;
  if (user.role === "RECEPTIONIST") return lead.createdById === user.userId;
  return false;
}

export function canAssignLead(user: SessionData): boolean {
  return user.role === "ADMIN";
}

export function canManageUsers(user: SessionData): boolean {
  return user.role === "ADMIN";
}

export function canViewAllLeads(user: SessionData): boolean {
  return user.role === "ADMIN";
}

export function buildLeadWhereClause(user: SessionData) {
  if (user.role === "ADMIN") return { isArchived: false };
  if (user.role === "COUNSELLOR") return { assignedCounsellorId: user.userId, isArchived: false };
  if (user.role === "RECEPTIONIST") return { createdById: user.userId, isArchived: false };
  return { id: "never" };
}
