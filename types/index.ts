import { LeadStatus, UserRole } from "@prisma/client";

export type { LeadStatus, UserRole };

export interface LeadListItem {
  id: string;
  leadId: string;
  studentName: string;
  phone: string;
  email: string | null;
  educationLevel: string;
  status: LeadStatus;
  createdAt: string;
  nextFollowUpAt: string | null;
  isArchived: boolean;
  country: { id: string; name: string };
  source: { id: string; name: string };
  intake: { id: string; name: string } | null;
  branch: { id: string; name: string } | null;
  assignedCounsellor: { id: string; name: string; email: string } | null;
  createdBy: { id: string; name: string };
}

export interface LeadDetail extends LeadListItem {
  course: string | null;
  referredBy: string | null;
  notes: string | null;
  followUpNotes: string | null;
  lastContactedAt: string | null;
  academicInfo: Record<string, string> | null;
  englishTest: Record<string, string> | null;
  campaign: string | null;
  campaignId: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  updatedAt: string;
  activities: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string; role: UserRole };
}

export interface DashboardStats {
  totalLeads: number;
  todaysLeads: number;
  newLeads: number;
  followUpsDueToday: number;
  overdueFollowUps: number;
  counsellingCompleted: number;
  applications: number;
  visaProcess: number;
  visaGranted: number;
  enrolled: number;
}

export interface SourceStats {
  sourceId: string;
  sourceName: string;
  total: number;
  contacted: number;
  counselling: number;
  applications: number;
  enrolled: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  details?: unknown;
}
