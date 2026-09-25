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
  shiftId: z.string().optional().or(z.literal("")),
  classType: z.enum(["PHYSICAL", "ONLINE", "CRASH_COURSE"]).optional().or(z.literal("")),
  studentStatus: z.enum(["TRIAL", "ACTIVE", "HOLD", "COMPLETE", "DROPPED"]).optional().or(z.literal("")),
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
  role: z.enum(["ADMIN", "COUNSELLOR", "RECEPTIONIST", "TEACHER"]),
  phone: z.string().optional(),
  branchId: z.string().optional(),
});

export const universityCourseInputSchema = z.object({
  courseName: z.string().min(1, "Course name is required"),
  courseLevel: z.string().min(1, "Level is required"),
  intakeName: z.string().optional().or(z.literal("")),
  campusLocation: z.string().optional().or(z.literal("")),
});

export const createUniversitySchema = z.object({
  name: z.string().min(2, "University name is required").max(200),
  country: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  tuitionFeeMin: z.number().min(0).optional().nullable(),
  tuitionFeeMax: z.number().min(0).optional().nullable(),
  currency: z.string().default("USD"),
  notes: z.string().max(2000).optional().or(z.literal("")),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  flyer: z.string().url("Invalid URL").optional().or(z.literal("")),
  academicCriteriaUG: z.string().optional().or(z.literal("")),
  academicCriteriaPG: z.string().optional().or(z.literal("")),
  englishCriteriaUG: z.string().optional().or(z.literal("")),
  englishCriteriaPG: z.string().optional().or(z.literal("")),
  englishWaiverUG: z.string().optional().or(z.literal("")),
  englishWaiverPG: z.string().optional().or(z.literal("")),
  courses: z.array(universityCourseInputSchema).default([]),
});

export const updateUniversitySchema = createUniversitySchema.partial();

export const createCounsellorNoteSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().min(1, "Content is required").max(5000),
  tags: z.array(z.string()).default([]),
});

export const updateCounsellorNoteSchema = createCounsellorNoteSchema.partial();

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type CreateUniversityInput = z.infer<typeof createUniversitySchema>;
export type CreateCounsellorNoteInput = z.infer<typeof createCounsellorNoteSchema>;
