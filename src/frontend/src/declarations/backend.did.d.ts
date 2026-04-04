/* eslint-disable */
// @ts-nocheck
// This file was automatically generated - DO NOT EDIT

import type { ActorMethod } from '@icp-sdk/core/agent';
import type { IDL } from '@icp-sdk/core/candid';
import type { Principal } from '@icp-sdk/core/principal';

export interface AppUser {
  id: string;
  username: string;
  passwordHash: string;
  role: string;
  elevatedUntil: [] | [bigint];
  isEnabled: boolean;
  employeeId: [] | [string];
  name: [] | [string];
  department: [] | [string];
  contactDetails: [] | [string];
  profilePictureUrl: [] | [string];
  createdAt: bigint;
  updatedAt: bigint;
}

export interface Client {
  id: string;
  name: string;
  industry: [] | [string];
  createdAt: bigint;
  updatedAt: bigint;
}

export interface Site {
  id: string;
  clientId: string;
  name: string;
  siteCode: [] | [string];
  address: [] | [string];
  locationType: [] | [string];
  scheduledDate: [] | [string];
  assignedAuditorId: [] | [string];
  assignedReviewerId: [] | [string];
  assignedManagerId: [] | [string];
  templateId: [] | [string];
  area: [] | [number];
  city: [] | [string];
  state: [] | [string];
  district: [] | [string];
  createdAt: bigint;
  updatedAt: bigint;
}

export interface TemplateQuestion {
  id: string;
  text: string;
  questionType: string;
  options: string[];
  required: boolean;
  imageRequired: boolean;
  optionRemarks: Array<[string, string]>;
}

export interface TemplateSection {
  id: string;
  title: string;
  order: bigint;
  questions: TemplateQuestion[];
  hasCriticalObservations: boolean;
  hasPowerSupply: boolean;
}

export interface Template {
  id: string;
  name: string;
  sections: TemplateSection[];
  createdAt: bigint;
  updatedAt: bigint;
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
  photo: [] | [string];
}

export interface PowerSupplyData {
  supplyType: string;
  fields: [string, string][];
}

export interface Audit {
  id: string;
  siteId: string;
  templateId: string;
  status: string;
  submittedBy: [] | [string];
  reviewedBy: [] | [string];
  approvedBy: [] | [string];
  rejectionNote: [] | [string];
  completedAt: [] | [bigint];
  answers: [string, AuditAnswer][];
  observations: [string, CriticalObservation[]][];
  powerSupply: [string, PowerSupplyData][];
  createdAt: bigint;
  updatedAt: bigint;
}

export interface _SERVICE {
  bootstrapAdmin: ActorMethod<[], undefined>;
  getUsers: ActorMethod<[], AppUser[]>;
  upsertUser: ActorMethod<[AppUser], undefined>;
  deleteUser: ActorMethod<[string], undefined>;
  verifyCredentials: ActorMethod<[string, string], [] | [AppUser]>;
  getUserByUsername: ActorMethod<[string], [] | [AppUser]>;
  getClients: ActorMethod<[], Client[]>;
  upsertClient: ActorMethod<[Client], undefined>;
  deleteClient: ActorMethod<[string], undefined>;
  getSites: ActorMethod<[], Site[]>;
  upsertSite: ActorMethod<[Site], undefined>;
  deleteSite: ActorMethod<[string], undefined>;
  getTemplates: ActorMethod<[], Template[]>;
  upsertTemplate: ActorMethod<[Template], undefined>;
  deleteTemplate: ActorMethod<[string], undefined>;
  getAudits: ActorMethod<[], Audit[]>;
  upsertAudit: ActorMethod<[Audit], undefined>;
  deleteAudit: ActorMethod<[string], undefined>;
}

export declare const idlService: IDL.ServiceClass;
export declare const idlInitArgs: IDL.Type[];
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
