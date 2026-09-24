import { SessionData } from "./session";

type LeadOwnership = { assignedCounsellorId: string | null; createdById: string; teacherId?: string | null };

export function canViewLead(user: SessionData, lead: LeadOwnership): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "COUNSELLOR") return lead.assignedCounsellorId === user.userId;
  if (user.role === "RECEPTIONIST") return lead.createdById === user.userId || !!lead.teacherId;
  if (user.role === "TEACHER") return lead.teacherId === user.userId || lead.createdById === user.userId;
  return false;
}

export function canEditLead(user: SessionData, lead: LeadOwnership): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "COUNSELLOR") return lead.assignedCounsellorId === user.userId;
  if (user.role === "RECEPTIONIST") return lead.createdById === user.userId || !!lead.teacherId;
  if (user.role === "TEACHER") return lead.teacherId === user.userId || lead.createdById === user.userId;
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
  if (user.role === "TEACHER") return { OR: [{ teacherId: user.userId }, { createdById: user.userId }], isArchived: false };
  return { id: "never" };
}
