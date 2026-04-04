// Shared data types for SWiSH SAFE-T

export interface AppUser {
  id: string;
  username: string;
  passwordHash: string;
  role: "Admin" | "Manager" | "Reviewer" | "Auditor";
  elevatedUntil?: number;
  isEnabled: boolean;
  employeeId?: string;
  name?: string;
  department?: string;
  contactDetails?: string;
  profilePictureUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Client {
  id: string;
  name: string;
  industry?: string;
  defaultTemplateId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Site {
  id: string;
  clientId: string;
  name: string;
  address?: string;
  siteCode?: string;
  locationType?: "Metro" | "Urban" | "Semi Urban" | "Rural";
  scheduledDate?: string; // ISO date string "YYYY-MM-DD"
  assignedAuditorId?: string;
  assignedReviewerId?: string;
  assignedManagerId?: string;
  templateId?: string;
  area?: number; // sq ft
  city?: string;
  state?: string; // Indian state/UT name
  district?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Template {
  id: string;
  name: string;
  sections: TemplateSection[];
  createdAt: number;
  updatedAt: number;
}

export interface TemplateSection {
  id: string;
  title: string;
  order: number;
  questions: TemplateQuestion[];
  hasCriticalObservations: boolean;
  hasPowerSupply: boolean;
}

export interface TemplateQuestion {
  id: string;
  text: string;
  type: "radio" | "dropdown";
  options: string[];
  required: boolean;
  imageRequired: boolean; // image upload is required for this question
  optionRemarks: Record<string, string>; // preset default remark per option value
}

export type AuditStatus =
  | "Draft"
  | "Pending Review"
  | "Pending Approval"
  | "Completed"
  | "Returned for Correction";

export interface Audit {
  id: string;
  siteId: string;
  templateId: string;
  status: AuditStatus;
  submittedBy?: string;
  reviewedBy?: string;
  approvedBy?: string;
  rejectionNote?: string;
  completedAt?: number;
  answers: Record<string, AuditAnswer>;
  observations: Record<string, CriticalObservation[]>;
  powerSupply: Record<string, PowerSupplyData>;
  createdAt: number;
  updatedAt: number;
}

export interface AuditAnswer {
  answer: string;
  remarks: string;
  images: string[];
}

export interface CriticalObservation {
  id: string;
  remarks: string;
  recommendations: string;
  photo?: string;
}

export interface PowerSupplyRow {
  id: string; // stable row identifier for React keys
  circuitName: string;
  values: Record<string, string>; // key = column id (e.g. "RN", "YN", etc.)
}

export interface PowerSupplyData {
  type: "3in3out" | "3in1out" | "1in1out";
  rows: PowerSupplyRow[];
}
