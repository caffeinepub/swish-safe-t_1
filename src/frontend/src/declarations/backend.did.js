// @ts-nocheck
// IDL factory for SWiSH SAFE-T backend
export const idlFactory = ({ IDL }) => {
  const AppUser = IDL.Record({
    id: IDL.Text,
    username: IDL.Text,
    passwordHash: IDL.Text,
    role: IDL.Text,
    elevatedUntil: IDL.Opt(IDL.Int),
    isEnabled: IDL.Bool,
    employeeId: IDL.Opt(IDL.Text),
    name: IDL.Opt(IDL.Text),
    department: IDL.Opt(IDL.Text),
    contactDetails: IDL.Opt(IDL.Text),
    profilePictureUrl: IDL.Opt(IDL.Text),
    createdAt: IDL.Int,
    updatedAt: IDL.Int,
  });
  const Client = IDL.Record({
    id: IDL.Text,
    name: IDL.Text,
    industry: IDL.Opt(IDL.Text),
    createdAt: IDL.Int,
    updatedAt: IDL.Int,
  });
  const Site = IDL.Record({
    id: IDL.Text,
    clientId: IDL.Text,
    name: IDL.Text,
    siteCode: IDL.Opt(IDL.Text),
    address: IDL.Opt(IDL.Text),
    locationType: IDL.Opt(IDL.Text),
    scheduledDate: IDL.Opt(IDL.Text),
    assignedAuditorId: IDL.Opt(IDL.Text),
    assignedReviewerId: IDL.Opt(IDL.Text),
    assignedManagerId: IDL.Opt(IDL.Text),
    templateId: IDL.Opt(IDL.Text),
    area: IDL.Opt(IDL.Float64),
    city: IDL.Opt(IDL.Text),
    state: IDL.Opt(IDL.Text),
    district: IDL.Opt(IDL.Text),
    createdAt: IDL.Int,
    updatedAt: IDL.Int,
  });
  const TemplateQuestion = IDL.Record({
    id: IDL.Text,
    text: IDL.Text,
    questionType: IDL.Text,
    options: IDL.Vec(IDL.Text),
    required: IDL.Bool,
  });
  const TemplateSection = IDL.Record({
    id: IDL.Text,
    title: IDL.Text,
    order: IDL.Nat,
    questions: IDL.Vec(TemplateQuestion),
    hasCriticalObservations: IDL.Bool,
    hasPowerSupply: IDL.Bool,
  });
  const Template = IDL.Record({
    id: IDL.Text,
    name: IDL.Text,
    sections: IDL.Vec(TemplateSection),
    createdAt: IDL.Int,
    updatedAt: IDL.Int,
  });
  const AuditAnswer = IDL.Record({
    answer: IDL.Text,
    remarks: IDL.Text,
    images: IDL.Vec(IDL.Text),
  });
  const CriticalObservation = IDL.Record({
    id: IDL.Text,
    remarks: IDL.Text,
    recommendations: IDL.Text,
    photo: IDL.Opt(IDL.Text),
  });
  const PowerSupplyData = IDL.Record({
    supplyType: IDL.Text,
    fields: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
  });
  const Audit = IDL.Record({
    id: IDL.Text,
    siteId: IDL.Text,
    templateId: IDL.Text,
    status: IDL.Text,
    submittedBy: IDL.Opt(IDL.Text),
    reviewedBy: IDL.Opt(IDL.Text),
    approvedBy: IDL.Opt(IDL.Text),
    rejectionNote: IDL.Opt(IDL.Text),
    completedAt: IDL.Opt(IDL.Int),
    answers: IDL.Vec(IDL.Tuple(IDL.Text, AuditAnswer)),
    observations: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Vec(CriticalObservation))),
    powerSupply: IDL.Vec(IDL.Tuple(IDL.Text, PowerSupplyData)),
    createdAt: IDL.Int,
    updatedAt: IDL.Int,
  });
  return IDL.Service({
    bootstrapAdmin: IDL.Func([], [], []),
    getUsers: IDL.Func([], [IDL.Vec(AppUser)], ['query']),
    upsertUser: IDL.Func([AppUser], [], []),
    deleteUser: IDL.Func([IDL.Text], [], []),
    verifyCredentials: IDL.Func([IDL.Text, IDL.Text], [IDL.Opt(AppUser)], ['query']),
    getUserByUsername: IDL.Func([IDL.Text], [IDL.Opt(AppUser)], ['query']),
    getClients: IDL.Func([], [IDL.Vec(Client)], ['query']),
    upsertClient: IDL.Func([Client], [], []),
    deleteClient: IDL.Func([IDL.Text], [], []),
    getSites: IDL.Func([], [IDL.Vec(Site)], ['query']),
    upsertSite: IDL.Func([Site], [], []),
    deleteSite: IDL.Func([IDL.Text], [], []),
    getTemplates: IDL.Func([], [IDL.Vec(Template)], ['query']),
    upsertTemplate: IDL.Func([Template], [], []),
    deleteTemplate: IDL.Func([IDL.Text], [], []),
    getAudits: IDL.Func([], [IDL.Vec(Audit)], ['query']),
    upsertAudit: IDL.Func([Audit], [], []),
    deleteAudit: IDL.Func([IDL.Text], [], []),
  });
};
export const idlInitArgs = [];
export const init = ({ IDL }) => { return []; };
