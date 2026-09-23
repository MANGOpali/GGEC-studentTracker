import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createLeadSchema = z.object({
  leadType: z.enum(["STUDY_ABROAD", "IELTS_CLASS", "PTE_CLASS", "DATE_BOOKING"]).default("STUDY_ABROAD"),
  studentName: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().min(7, "Phone number too short").max(20).regex(/^[\d\s+\-()]+$/, "Invalid phone number"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  educationLevel: z.string().min(1, "Education level is required"),
  countryId: z.string().optional().or(z.literal("")),
  sourceId: z.string().min(1, "Lead source is required"),
  bookingDate: z.string().optional(),
  course: z.string().optional(),
  intakeId: z.string().optional(),
  referredBy: z.string().optional(),
  branchId: z.string().optional(),
  assignedCounsellorId: z.string().optional(),
  notes: z.string().max(2000).optional(),
  campaign: z.string().optional(),
  campaignId: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmContent: z.string().optional(),
  academicInfo: z.object({
    highSchoolGrade: z.string().optional(),
    bachelorGpa: z.string().optional(),
    currentStatus: z.string().optional(),
    qualification: z.string().optional(),
  }).optional(),
  englishTest: z.object({
    type: z.string().optional(),
    score: z.string().optional(),
    testDate: z.string().optional(),
  }).optional(),
  dob: z.string().optional(),
  followUpDate: z.string().optional(),
});

export const updateLeadSchema = z.object({
  leadType: z.enum(["STUDY_ABROAD", "IELTS_CLASS", "PTE_CLASS", "DATE_BOOKING"]).optional(),
  studentName: z.string().min(2).optional(),
  phone: z.string().min(7).max(20).optional(),
  email: z.string().email().optional().or(z.literal("")),
  educationLevel: z.string().optional(),
  countryId: z.string().optional().or(z.literal("")),
  sourceId: z.string().optional(),
  bookingDate: z.string().optional().or(z.literal("")),
  course: z.string().optional(),
  intakeId: z.string().optional().or(z.literal("")),
  referredBy: z.string().optional(),
  branchId: z.string().optional().or(z.literal("")),
  assignedCounsellorId: z.string().optional().or(z.literal("")),
  teacherId: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional(),
  status: z.string().optional(),
  nextFollowUpAt: z.string().optional(),
  followUpNotes: z.string().optional(),
  lastContactedAt: z.string().optional(),
  academicInfo: z.record(z.string()).optional(),
  englishTest: z.record(z.string()).optional(),
});

export const assignLeadSchema = z.object({
  counsellorId: z.string().min(1, "Counsellor is required"),
});

export const addNoteSchema = z.object({
  note: z.string().min(1, "Note cannot be empty").max(2000),
});

export const followUpSchema = z.object({
  nextFollowUpAt: z.string().min(1, "Follow-up date is required"),
  notes: z.string().optional(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2),
  role: z.enum(["ADMIN", "COUNSELLOR", "RECEPTIONIST"]),
  phone: z.string().optional(),
  branchId: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
