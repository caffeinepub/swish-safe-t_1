// Generic localStorage CRUD helpers
import type { AppUser } from "../types";

export function getList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

export function saveList<T>(key: string, items: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (e) {
    console.warn("Failed to save list:", e);
  }
}

export function getById<T extends { id: string }>(
  key: string,
  id: string,
): T | undefined {
  const list = getList<T>(key);
  return list.find((item) => item.id === id);
}

export function upsert<T extends { id: string }>(key: string, item: T): void {
  const list = getList<T>(key);
  const index = list.findIndex((i) => i.id === item.id);
  if (index >= 0) {
    list[index] = item;
  } else {
    list.push(item);
  }
  saveList(key, list);
}

export function remove(key: string, id: string): void {
  const list = getList<{ id: string }>(key);
  saveList(
    key,
    list.filter((i) => i.id !== id),
  );
}

// Storage keys
export const USERS_KEY = "swish_users";
export const CLIENTS_KEY = "swish_clients";
export const SITES_KEY = "swish_sites";
export const TEMPLATES_KEY = "swish_templates";
export const AUDITS_KEY = "swish_audits";
export const SEEDED_KEY = "swish_seeded";
export const SEEDED_V2_KEY = "swish_seeded_v2";
export const SEEDED_V3_KEY = "swish_seeded_v3";

// User helpers
export function getUserByUsername(username: string): AppUser | undefined {
  const users = getList<AppUser>(USERS_KEY);
  return users.find((u) => u.username.toLowerCase() === username.toLowerCase());
}

export function verifyCredentials(
  username: string,
  password: string,
): AppUser | null {
  const user = getUserByUsername(username);
  if (!user) return null;
  const encoded = btoa(password);
  if (user.passwordHash !== encoded) return null;
  if (!user.isEnabled) return null;
  return user;
}

export function hasAdminPrivilege(user: AppUser): boolean {
  if (user.role === "Admin") return true;
  if (user.elevatedUntil && user.elevatedUntil > Date.now()) return true;
  return false;
}

export function ensureAdminSeeded(): void {
  const users = getList<AppUser>(USERS_KEY);
  if (users.length === 0) {
    const admin: AppUser = {
      id: "user-admin-1",
      username: "APA_Arun",
      passwordHash: btoa("SWiSH_SafeArun@21"),
      role: "Admin",
      isEnabled: true,
      employeeId: "EMP-001",
      name: "Arun",
      department: "Administration",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveList(USERS_KEY, [admin]);
  }
}

export function seedSampleData(): void {
  // Use SEEDED_V3_KEY so existing users get re-seeded with updated site + user data
  if (localStorage.getItem(SEEDED_V3_KEY)) return;

  const now = Date.now();

  // Sample users
  const users = getList<AppUser>(USERS_KEY);
  const sampleUsers: AppUser[] = [
    {
      id: "user-mgr-1",
      username: "manager_sarah",
      passwordHash: btoa("Manager@123"),
      role: "Manager",
      isEnabled: true,
      employeeId: "EMP-002",
      name: "Sarah",
      department: "Operations",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "user-rev-1",
      username: "reviewer_john",
      passwordHash: btoa("Review@123"),
      role: "Reviewer",
      isEnabled: true,
      employeeId: "EMP-003",
      name: "John",
      department: "Quality",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "user-aud-1",
      username: "auditor_priya",
      passwordHash: btoa("Audit@123"),
      role: "Auditor",
      isEnabled: true,
      employeeId: "EMP-004",
      name: "Priya",
      department: "Field Audit",
      createdAt: now,
      updatedAt: now,
    },
  ];
  const existingIds = users.map((u) => u.id);
  const newUsers = sampleUsers.filter((u) => !existingIds.includes(u.id));
  // Also update admin user with profile fields if it exists
  const updatedUsers = users.map((u) =>
    u.id === "user-admin-1"
      ? {
          ...u,
          employeeId: u.employeeId ?? "EMP-001",
          name: u.name ?? "Arun",
          department: u.department ?? "Administration",
          updatedAt: now,
        }
      : u,
  );
  saveList(USERS_KEY, [...updatedUsers, ...newUsers]);

  // Clients
  const clients = [
    {
      id: "client-1",
      name: "Acme Logistics",
      industry: "Logistics & Warehousing",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "client-2",
      name: "Metro Power Co",
      industry: "Energy & Utilities",
      createdAt: now,
      updatedAt: now,
    },
  ];
  saveList(CLIENTS_KEY, clients);

  // Sites — updated with new fields (Indian cities/states)
  const sites = [
    {
      id: "site-1",
      clientId: "client-1",
      name: "Acme - Warehouse A",
      siteCode: "ACM-WH-A",
      address: "12 Industrial Ave, Andheri",
      locationType: "Metro" as const,
      scheduledDate: "2026-05-15",
      assignedAuditorId: "user-aud-1",
      assignedReviewerId: "user-rev-1",
      assignedManagerId: "user-mgr-1",
      templateId: "tmpl-1",
      area: 45000,
      city: "Mumbai",
      state: "Maharashtra",
      district: "Mumbai Suburban",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "site-2",
      clientId: "client-1",
      name: "Acme - Depot B",
      siteCode: "ACM-DEP-B",
      address: "88 Logistics Rd, Whitefield",
      locationType: "Urban" as const,
      scheduledDate: "2026-06-01",
      assignedAuditorId: "user-aud-1",
      assignedReviewerId: "user-rev-1",
      assignedManagerId: "user-mgr-1",
      templateId: "tmpl-1",
      area: 32000,
      city: "Bengaluru",
      state: "Karnataka",
      district: "Bengaluru Urban",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "site-3",
      clientId: "client-2",
      name: "Metro - Substation 1",
      siteCode: "MPC-SS-01",
      address: "45 Power St, Sector 14",
      locationType: "Metro" as const,
      scheduledDate: "2026-04-20",
      assignedAuditorId: "user-aud-1",
      assignedReviewerId: "user-rev-1",
      assignedManagerId: "user-mgr-1",
      templateId: "tmpl-1",
      area: 18500,
      city: "Delhi",
      state: "Delhi",
      district: "New Delhi",
      createdAt: now,
      updatedAt: now,
    },
  ];
  saveList(SITES_KEY, sites);

  // Template
  const template = {
    id: "tmpl-1",
    name: "General Safety Inspection",
    sections: [
      {
        id: "sec-1",
        title: "Electrical Safety",
        order: 1,
        questions: [
          {
            id: "q-1-1",
            text: "Are all electrical panels properly labelled and accessible?",
            type: "radio" as const,
            options: ["Compliant", "Non-Compliant", "N/A"],
            required: true,
          },
          {
            id: "q-1-2",
            text: "Is the earthing/grounding system intact and tested?",
            type: "radio" as const,
            options: ["Compliant", "Non-Compliant", "N/A"],
            required: true,
          },
          {
            id: "q-1-3",
            text: "Are circuit breakers functioning correctly and appropriately rated?",
            type: "radio" as const,
            options: ["Compliant", "Non-Compliant", "N/A"],
            required: true,
          },
        ],
        hasCriticalObservations: true,
        hasPowerSupply: true,
      },
      {
        id: "sec-2",
        title: "Fire Safety",
        order: 2,
        questions: [
          {
            id: "q-2-1",
            text: "Are fire extinguishers in place, charged and within service date?",
            type: "radio" as const,
            options: ["Compliant", "Non-Compliant", "N/A"],
            required: true,
          },
          {
            id: "q-2-2",
            text: "Are emergency exit routes clearly marked and unobstructed?",
            type: "radio" as const,
            options: ["Compliant", "Non-Compliant", "N/A"],
            required: true,
          },
          {
            id: "q-2-3",
            text: "Is the fire alarm system tested and operational?",
            type: "radio" as const,
            options: ["Compliant", "Non-Compliant", "N/A"],
            required: true,
          },
        ],
        hasCriticalObservations: true,
        hasPowerSupply: false,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
  saveList(TEMPLATES_KEY, [template]);

  // Sample audits
  const audits = [
    {
      id: "audit-1",
      siteId: "site-1",
      templateId: "tmpl-1",
      status: "Draft" as const,
      submittedBy: "auditor_priya",
      answers: {},
      observations: {},
      powerSupply: {},
      createdAt: now - 86400000 * 2,
      updatedAt: now - 3600000,
    },
    {
      id: "audit-2",
      siteId: "site-2",
      templateId: "tmpl-1",
      status: "Pending Review" as const,
      submittedBy: "auditor_priya",
      answers: {
        "q-1-1": {
          answer: "Compliant",
          remarks: "All panels clearly labelled",
          images: [],
        },
        "q-1-2": {
          answer: "Non-Compliant",
          remarks: "Earthing rod corroded, replacement needed",
          images: [],
        },
        "q-1-3": {
          answer: "Compliant",
          remarks: "Breakers tested monthly",
          images: [],
        },
        "q-2-1": {
          answer: "Compliant",
          remarks: "All extinguishers serviced Jan 2026",
          images: [],
        },
        "q-2-2": {
          answer: "Compliant",
          remarks: "Exit signs illuminated",
          images: [],
        },
        "q-2-3": {
          answer: "N/A",
          remarks: "Building undergoing renovation",
          images: [],
        },
      },
      observations: {},
      powerSupply: {},
      createdAt: now - 86400000 * 5,
      updatedAt: now - 86400000,
    },
    {
      id: "audit-3",
      siteId: "site-3",
      templateId: "tmpl-1",
      status: "Completed" as const,
      submittedBy: "reviewer_john",
      approvedBy: "manager_sarah",
      completedAt: now - 86400000 * 7,
      answers: {
        "q-1-1": {
          answer: "Compliant",
          remarks: "All panels labelled and accessible",
          images: [],
        },
        "q-1-2": {
          answer: "Compliant",
          remarks: "Earthing system tested Q4 2025",
          images: [],
        },
        "q-1-3": {
          answer: "Compliant",
          remarks: "All breakers rated correctly",
          images: [],
        },
        "q-2-1": {
          answer: "Compliant",
          remarks: "12 extinguishers on site, all in date",
          images: [],
        },
        "q-2-2": {
          answer: "Compliant",
          remarks: "Three exit routes, all clear",
          images: [],
        },
        "q-2-3": {
          answer: "Compliant",
          remarks: "Fire alarm tested weekly",
          images: [],
        },
      },
      observations: {},
      powerSupply: {},
      createdAt: now - 86400000 * 14,
      updatedAt: now - 86400000 * 7,
    },
  ];
  saveList(AUDITS_KEY, audits);

  localStorage.setItem(SEEDED_V3_KEY, "1");
}
