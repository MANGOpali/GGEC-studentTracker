import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateLeadId(sequence: number): string {
  const year = new Date().getFullYear();
  return `GG-${year}-${String(sequence).padStart(5, "0")}`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy");
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy, h:mm a");
}

export function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatPhone(phone: string): string {
  return phone.replace(/(\d{4})(\d{3})(\d{3})/, "$1-$2-$3");
}

export const EDUCATION_LEVELS = [
  "+2/High School",
  "Bachelor's",
  "Master's",
  "Diploma",
  "Language Course",
  "PhD",
  "Other",
];

export const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  FOLLOW_UP: "Follow Up",
  COUNSELLING_BOOKED: "Counselling Booked",
  COUNSELLING_COMPLETED: "Counselling Completed",
  INTERESTED: "Interested",
  DOCUMENT_COLLECTION: "Document Collection",
  APPLICATION_STARTED: "Application Started",
  APPLICATION_SUBMITTED: "Application Submitted",
  OFFER_RECEIVED: "Offer Received",
  VISA_PROCESS: "Visa Process",
  VISA_GRANTED: "Visa Granted",
  ENROLLED: "Enrolled",
  NOT_INTERESTED: "Not Interested",
  NOT_ELIGIBLE: "Not Eligible",
  NO_RESPONSE: "No Response",
  FUTURE_INTAKE: "Future Intake",
  CLOSED: "Closed",
};

export const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-cyan-100 text-cyan-800",
  FOLLOW_UP: "bg-yellow-100 text-yellow-800",
  COUNSELLING_BOOKED: "bg-purple-100 text-purple-800",
  COUNSELLING_COMPLETED: "bg-indigo-100 text-indigo-800",
  INTERESTED: "bg-emerald-100 text-emerald-800",
  DOCUMENT_COLLECTION: "bg-orange-100 text-orange-800",
  APPLICATION_STARTED: "bg-teal-100 text-teal-800",
  APPLICATION_SUBMITTED: "bg-teal-100 text-teal-800",
  OFFER_RECEIVED: "bg-green-100 text-green-800",
  VISA_PROCESS: "bg-violet-100 text-violet-800",
  VISA_GRANTED: "bg-lime-100 text-lime-800",
  ENROLLED: "bg-green-200 text-green-900",
  NOT_INTERESTED: "bg-red-100 text-red-800",
  NOT_ELIGIBLE: "bg-red-100 text-red-800",
  NO_RESPONSE: "bg-gray-100 text-gray-700",
  FUTURE_INTAKE: "bg-slate-100 text-slate-700",
  CLOSED: "bg-gray-200 text-gray-700",
};

export const ALL_STATUSES = Object.keys(STATUS_LABELS);

export const ACTIVE_STATUSES = [
  "NEW", "CONTACTED", "FOLLOW_UP", "COUNSELLING_BOOKED",
  "COUNSELLING_COMPLETED", "INTERESTED", "DOCUMENT_COLLECTION",
  "APPLICATION_STARTED", "APPLICATION_SUBMITTED", "OFFER_RECEIVED",
  "VISA_PROCESS", "VISA_GRANTED",
];

// New status labels
Object.assign(STATUS_LABELS, {
  DEMO_SCHEDULED: "Demo Scheduled",
  DEMO_ATTENDED: "Demo Attended",
  IN_CLASS: "In Class",
  COMPLETED: "Completed",
  DROPPED: "Dropped",
  CONFIRMED: "Confirmed",
  RESCHEDULED: "Rescheduled",
  NO_SHOW: "No Show",
});

Object.assign(STATUS_COLORS, {
  DEMO_SCHEDULED: "bg-violet-100 text-violet-800",
  DEMO_ATTENDED: "bg-indigo-100 text-indigo-800",
  IN_CLASS: "bg-teal-100 text-teal-800",
  COMPLETED: "bg-green-100 text-green-800",
  DROPPED: "bg-red-100 text-red-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  RESCHEDULED: "bg-yellow-100 text-yellow-800",
  NO_SHOW: "bg-gray-200 text-gray-700",
});

export const LEAD_TYPE_LABELS: Record<string, string> = {
  STUDY_ABROAD: "Study Abroad",
  IELTS_CLASS: "IELTS Class",
  PTE_CLASS: "PTE Class",
  DATE_BOOKING: "Date Booking",
};

export const LEAD_TYPE_COLORS: Record<string, string> = {
  STUDY_ABROAD: "bg-blue-100 text-blue-800",
  IELTS_CLASS: "bg-orange-100 text-orange-800",
  PTE_CLASS: "bg-purple-100 text-purple-800",
  DATE_BOOKING: "bg-pink-100 text-pink-800",
};

export const STATUSES_BY_TYPE: Record<string, string[]> = {
  STUDY_ABROAD: [
    "NEW", "CONTACTED", "FOLLOW_UP", "COUNSELLING_BOOKED", "COUNSELLING_COMPLETED",
    "INTERESTED", "DOCUMENT_COLLECTION", "APPLICATION_STARTED", "APPLICATION_SUBMITTED",
    "OFFER_RECEIVED", "VISA_PROCESS", "VISA_GRANTED", "ENROLLED",
    "NOT_INTERESTED", "NOT_ELIGIBLE", "NO_RESPONSE", "FUTURE_INTAKE", "CLOSED",
  ],
  IELTS_CLASS: [
    "NEW", "CONTACTED", "FOLLOW_UP",
    "DEMO_SCHEDULED", "DEMO_ATTENDED", "ENROLLED", "IN_CLASS", "COMPLETED", "DROPPED",
    "NOT_INTERESTED", "NO_RESPONSE", "CLOSED",
  ],
  PTE_CLASS: [
    "NEW", "CONTACTED", "FOLLOW_UP",
    "DEMO_SCHEDULED", "DEMO_ATTENDED", "ENROLLED", "IN_CLASS", "COMPLETED", "DROPPED",
    "NOT_INTERESTED", "NO_RESPONSE", "CLOSED",
  ],
  DATE_BOOKING: [
    "NEW", "CONTACTED", "FOLLOW_UP",
    "CONFIRMED", "RESCHEDULED", "NO_SHOW", "COMPLETED", "CLOSED",
  ],
};
