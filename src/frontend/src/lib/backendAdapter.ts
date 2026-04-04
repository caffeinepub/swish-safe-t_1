// Conversion layer between frontend JS types and backend Candid types
import type {
  AppUser as BackendAppUser,
  Audit as BackendAudit,
  AuditAnswer as BackendAuditAnswer,
  Client as BackendClient,
  CriticalObservation as BackendCriticalObservation,
  PowerSupplyData as BackendPowerSupplyData,
  Site as BackendSite,
  Template as BackendTemplate,
  TemplateQuestion as BackendTemplateQuestion,
  TemplateSection as BackendTemplateSection,
} from "../declarations/backend.did";
import type {
  AppUser,
  Audit,
  AuditAnswer,
  Client,
  CriticalObservation,
  PowerSupplyData,
  Site,
  Template,
  TemplateQuestion,
  TemplateSection,
} from "../types";

// Helper: JS opt -> Candid opt
function toOpt<T>(val: T | undefined | null): [] | [T] {
  return val !== undefined && val !== null ? [val] : [];
}

// Helper: Candid opt -> JS value
function fromOpt<T>(opt: [] | [T]): T | undefined {
  return opt.length > 0 ? opt[0] : undefined;
}

// Helper: timestamp to BigInt (ms as-is, stored as BigInt)
function toTs(ms: number): bigint {
  return BigInt(ms);
}

function fromTs(bi: bigint): number {
  return Number(bi);
}

// ===== AppUser =====
export function toBackendUser(user: AppUser): BackendAppUser {
  return {
    id: user.id,
    username: user.username,
    passwordHash: user.passwordHash,
    role: user.role,
    elevatedUntil: toOpt(
      user.elevatedUntil !== undefined ? BigInt(user.elevatedUntil) : undefined,
    ),
    isEnabled: user.isEnabled,
    employeeId: toOpt(user.employeeId),
    name: toOpt(user.name),
    department: toOpt(user.department),
    contactDetails: toOpt(user.contactDetails),
    profilePictureUrl: toOpt(user.profilePictureUrl),
    createdAt: toTs(user.createdAt),
    updatedAt: toTs(user.updatedAt),
  };
}

export function fromBackendUser(u: BackendAppUser): AppUser {
  return {
    id: u.id,
    username: u.username,
    passwordHash: u.passwordHash,
    role: u.role as AppUser["role"],
    elevatedUntil:
      u.elevatedUntil.length > 0 ? Number(u.elevatedUntil[0]) : undefined,
    isEnabled: u.isEnabled,
    employeeId: fromOpt(u.employeeId),
    name: fromOpt(u.name),
    department: fromOpt(u.department),
    contactDetails: fromOpt(u.contactDetails),
    profilePictureUrl: fromOpt(u.profilePictureUrl),
    createdAt: fromTs(u.createdAt),
    updatedAt: fromTs(u.updatedAt),
  };
}

// ===== Client =====
export function toBackendClient(client: Client): BackendClient {
  return {
    id: client.id,
    name: client.name,
    industry: toOpt(client.industry),
    createdAt: toTs(client.createdAt),
    updatedAt: toTs(client.updatedAt),
  };
}

export function fromBackendClient(c: BackendClient): Client {
  return {
    id: c.id,
    name: c.name,
    industry: fromOpt(c.industry),
    createdAt: fromTs(c.createdAt),
    updatedAt: fromTs(c.updatedAt),
  };
}

// ===== Site =====
export function toBackendSite(site: Site): BackendSite {
  return {
    id: site.id,
    clientId: site.clientId,
    name: site.name,
    siteCode: toOpt(site.siteCode),
    address: toOpt(site.address),
    locationType: toOpt(site.locationType),
    scheduledDate: toOpt(site.scheduledDate),
    assignedAuditorId: toOpt(site.assignedAuditorId),
    assignedReviewerId: toOpt(site.assignedReviewerId),
    assignedManagerId: toOpt(site.assignedManagerId),
    templateId: toOpt(site.templateId),
    area: toOpt(site.area),
    city: toOpt(site.city),
    state: toOpt(site.state),
    district: toOpt(site.district),
    createdAt: toTs(site.createdAt),
    updatedAt: toTs(site.updatedAt),
  };
}

export function fromBackendSite(s: BackendSite): Site {
  return {
    id: s.id,
    clientId: s.clientId,
    name: s.name,
    siteCode: fromOpt(s.siteCode),
    address: fromOpt(s.address),
    locationType: fromOpt(s.locationType) as Site["locationType"],
    scheduledDate: fromOpt(s.scheduledDate),
    assignedAuditorId: fromOpt(s.assignedAuditorId),
    assignedReviewerId: fromOpt(s.assignedReviewerId),
    assignedManagerId: fromOpt(s.assignedManagerId),
    templateId: fromOpt(s.templateId),
    area: fromOpt(s.area),
    city: fromOpt(s.city),
    state: fromOpt(s.state),
    district: fromOpt(s.district),
    createdAt: fromTs(s.createdAt),
    updatedAt: fromTs(s.updatedAt),
  };
}

// ===== Template =====
function toBackendQuestion(q: TemplateQuestion): BackendTemplateQuestion {
  return {
    id: q.id,
    text: q.text,
    questionType: q.type, // frontend uses "type", backend uses "questionType"
    options: q.options,
    required: q.required,
    imageRequired: q.imageRequired ?? false,
    optionRemarks: Object.entries(q.optionRemarks ?? {}),
  };
}

function fromBackendQuestion(q: BackendTemplateQuestion): TemplateQuestion {
  return {
    id: q.id,
    text: q.text,
    type: q.questionType as TemplateQuestion["type"],
    options: q.options,
    required: q.required,
    imageRequired: (q as any).imageRequired ?? false,
    optionRemarks: Object.fromEntries((q as any).optionRemarks ?? []),
  };
}

function toBackendSection(s: TemplateSection): BackendTemplateSection {
  return {
    id: s.id,
    title: s.title,
    order: BigInt(s.order),
    questions: s.questions.map(toBackendQuestion),
    hasCriticalObservations: s.hasCriticalObservations,
    hasPowerSupply: s.hasPowerSupply,
  };
}

function fromBackendSection(s: BackendTemplateSection): TemplateSection {
  return {
    id: s.id,
    title: s.title,
    order: Number(s.order),
    questions: s.questions.map(fromBackendQuestion),
    hasCriticalObservations: s.hasCriticalObservations,
    hasPowerSupply: s.hasPowerSupply,
  };
}

export function toBackendTemplate(template: Template): BackendTemplate {
  return {
    id: template.id,
    name: template.name,
    sections: template.sections.map(toBackendSection),
    createdAt: toTs(template.createdAt),
    updatedAt: toTs(template.updatedAt),
  };
}

export function fromBackendTemplate(t: BackendTemplate): Template {
  return {
    id: t.id,
    name: t.name,
    sections: t.sections.map(fromBackendSection),
    createdAt: fromTs(t.createdAt),
    updatedAt: fromTs(t.updatedAt),
  };
}

// ===== Audit =====
function toBackendAnswer(a: AuditAnswer): BackendAuditAnswer {
  return {
    answer: a.answer,
    remarks: a.remarks,
    images: a.images,
  };
}

function fromBackendAnswer(a: BackendAuditAnswer): AuditAnswer {
  return {
    answer: a.answer,
    remarks: a.remarks,
    images: a.images,
  };
}

function toBackendObservation(
  o: CriticalObservation,
): BackendCriticalObservation {
  return {
    id: o.id,
    remarks: o.remarks,
    recommendations: o.recommendations,
    photo: toOpt(o.photo),
  };
}

function fromBackendObservation(
  o: BackendCriticalObservation,
): CriticalObservation {
  return {
    id: o.id,
    remarks: o.remarks,
    recommendations: o.recommendations,
    photo: fromOpt(o.photo),
  };
}

function toBackendPowerSupply(p: PowerSupplyData): BackendPowerSupplyData {
  // Encode rows as JSON string stored in a special field key "__rows__"
  return {
    supplyType: p.type,
    fields: [["__rows__", JSON.stringify(p.rows ?? [])]],
  };
}

function fromBackendPowerSupply(p: BackendPowerSupplyData): PowerSupplyData {
  // Try to decode rows from the __rows__ field; fall back to empty
  const rowsEntry = p.fields.find(([k]) => k === "__rows__");
  let rows: import("../types").PowerSupplyRow[] = [];
  if (rowsEntry) {
    try {
      rows = JSON.parse(rowsEntry[1]);
    } catch {
      rows = [];
    }
  }
  return {
    type: p.supplyType as PowerSupplyData["type"],
    rows,
  };
}

export function toBackendAudit(audit: Audit): BackendAudit {
  return {
    id: audit.id,
    siteId: audit.siteId,
    templateId: audit.templateId,
    status: audit.status,
    submittedBy: toOpt(audit.submittedBy),
    reviewedBy: toOpt(audit.reviewedBy),
    approvedBy: toOpt(audit.approvedBy),
    rejectionNote: toOpt(audit.rejectionNote),
    completedAt: toOpt(
      audit.completedAt !== undefined ? BigInt(audit.completedAt) : undefined,
    ),
    answers: Object.entries(audit.answers).map(([k, v]) => [
      k,
      toBackendAnswer(v),
    ]),
    observations: Object.entries(audit.observations).map(([k, v]) => [
      k,
      v.map(toBackendObservation),
    ]),
    powerSupply: Object.entries(audit.powerSupply).map(([k, v]) => [
      k,
      toBackendPowerSupply(v),
    ]),
    createdAt: toTs(audit.createdAt),
    updatedAt: toTs(audit.updatedAt),
  };
}

export function fromBackendAudit(a: BackendAudit): Audit {
  return {
    id: a.id,
    siteId: a.siteId,
    templateId: a.templateId,
    status: a.status as Audit["status"],
    submittedBy: fromOpt(a.submittedBy),
    reviewedBy: fromOpt(a.reviewedBy),
    approvedBy: fromOpt(a.approvedBy),
    rejectionNote: fromOpt(a.rejectionNote),
    completedAt:
      a.completedAt.length > 0 ? Number(a.completedAt[0]) : undefined,
    answers: Object.fromEntries(
      a.answers.map(([k, v]) => [k, fromBackendAnswer(v)]),
    ),
    observations: Object.fromEntries(
      a.observations.map(([k, v]) => [k, v.map(fromBackendObservation)]),
    ),
    powerSupply: Object.fromEntries(
      a.powerSupply.map(([k, v]) => [k, fromBackendPowerSupply(v)]),
    ),
    createdAt: fromTs(a.createdAt),
    updatedAt: fromTs(a.updatedAt),
  };
}
