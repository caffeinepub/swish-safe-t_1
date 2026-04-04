import Array "mo:core/Array";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Time "mo:core/Time";

actor {

  // ─── Current Types ────────────────────────────────────────────────

  public type AppUser = {
    id : Text;
    username : Text;
    passwordHash : Text;
    role : Text;
    elevatedUntil : ?Int;
    isEnabled : Bool;
    employeeId : ?Text;
    name : ?Text;
    department : ?Text;
    contactDetails : ?Text;
    profilePictureUrl : ?Text;
    createdAt : Int;
    updatedAt : Int;
  };

  public type Client = {
    id : Text;
    name : Text;
    industry : ?Text;
    createdAt : Int;
    updatedAt : Int;
  };

  public type Site = {
    id : Text;
    clientId : Text;
    name : Text;
    siteCode : ?Text;
    address : ?Text;
    locationType : ?Text;
    scheduledDate : ?Text;
    assignedAuditorId : ?Text;
    assignedReviewerId : ?Text;
    assignedManagerId : ?Text;
    templateId : ?Text;
    area : ?Float;
    city : ?Text;
    state : ?Text;
    district : ?Text;
    createdAt : Int;
    updatedAt : Int;
  };

  // V1 TemplateQuestion (no imageRequired / optionRemarks)
  type TemplateQuestionV1 = {
    id : Text;
    text : Text;
    questionType : Text;
    options : [Text];
    required : Bool;
  };

  // V2 TemplateQuestion with image required + per-option preset remarks
  public type TemplateQuestion = {
    id : Text;
    text : Text;
    questionType : Text;
    options : [Text];
    required : Bool;
    imageRequired : Bool;
    optionRemarks : [(Text, Text)];
  };

  // V1 TemplateSection (questions are V1)
  type TemplateSectionV1 = {
    id : Text;
    title : Text;
    order : Nat;
    questions : [TemplateQuestionV1];
    hasCriticalObservations : Bool;
    hasPowerSupply : Bool;
  };

  public type TemplateSection = {
    id : Text;
    title : Text;
    order : Nat;
    questions : [TemplateQuestion];
    hasCriticalObservations : Bool;
    hasPowerSupply : Bool;
  };

  // V1 Template (sections are V1)
  type TemplateV1 = {
    id : Text;
    name : Text;
    sections : [TemplateSectionV1];
    createdAt : Int;
    updatedAt : Int;
  };

  public type Template = {
    id : Text;
    name : Text;
    sections : [TemplateSection];
    createdAt : Int;
    updatedAt : Int;
  };

  public type AuditAnswer = {
    answer : Text;
    remarks : Text;
    images : [Text];
  };

  public type CriticalObservation = {
    id : Text;
    remarks : Text;
    recommendations : Text;
    photo : ?Text;
  };

  public type PowerSupplyData = {
    supplyType : Text;
    fields : [(Text, Text)];
  };

  public type Audit = {
    id : Text;
    siteId : Text;
    templateId : Text;
    status : Text;
    submittedBy : ?Text;
    reviewedBy : ?Text;
    approvedBy : ?Text;
    rejectionNote : ?Text;
    completedAt : ?Int;
    answers : [(Text, AuditAnswer)];
    observations : [(Text, [CriticalObservation])];
    powerSupply : [(Text, PowerSupplyData)];
    createdAt : Int;
    updatedAt : Int;
  };

  // ─── V1 Legacy Types (previous deployment schema) ───────────────────────

  type AppUserV1 = {
    id : Text;
    username : Text;
    passwordHash : Text;
    role : Text;
    elevatedUntil : ?Int;
    isEnabled : Bool;
    createdAt : Int;
    updatedAt : Int;
  };

  type SiteV1 = {
    id : Text;
    clientId : Text;
    name : Text;
    siteCode : ?Text;
    address : ?Text;
    locationType : ?Text;
    scheduledDate : ?Text;
    assignedAuditorId : ?Text;
    assignedReviewerId : ?Text;
    assignedManagerId : ?Text;
    templateId : ?Text;
    createdAt : Int;
    updatedAt : Int;
  };

  type AuditV1 = {
    id : Text;
    siteId : Text;
    templateId : Text;
    status : Text;
    submittedBy : ?Text;
    reviewedBy : ?Text;
    approvedBy : ?Text;
    rejectionNote : ?Text;
    answers : [(Text, AuditAnswer)];
    observations : [(Text, [CriticalObservation])];
    powerSupply : [(Text, PowerSupplyData)];
    createdAt : Int;
    updatedAt : Int;
  };

  // ─── Stable Storage ───────────────────────────────────────────────
  // V1 vars: same names as previous deployment so Motoko reads old stable memory.
  stable var usersStore : [AppUserV1] = [];
  stable var sitesStore : [SiteV1] = [];
  stable var auditsStore : [AuditV1] = [];

  // V2 vars: extended schema
  stable var usersStoreV2 : [AppUser] = [];
  stable var clientsStore : [Client] = [];
  stable var sitesStoreV2 : [Site] = [];
  stable var auditsStoreV2 : [Audit] = [];
  stable var bootstrapped : Bool = false;
  stable var migratedV2 : Bool = false;

  // V3 vars: template questions with imageRequired + optionRemarks
  stable var templatesStore : [TemplateV1] = [];
  stable var templatesStoreV3 : [Template] = [];
  stable var migratedV3 : Bool = false;

  // ─── Migration ───────────────────────────────────────────────

  func migrateQuestionV1(q : TemplateQuestionV1) : TemplateQuestion {
    {
      id = q.id;
      text = q.text;
      questionType = q.questionType;
      options = q.options;
      required = q.required;
      imageRequired = false;
      optionRemarks = [];
    }
  };

  func migrateSectionV1(s : TemplateSectionV1) : TemplateSection {
    {
      id = s.id;
      title = s.title;
      order = s.order;
      questions = s.questions.map(migrateQuestionV1);
      hasCriticalObservations = s.hasCriticalObservations;
      hasPowerSupply = s.hasPowerSupply;
    }
  };

  system func postupgrade() {
    // V1 -> V2 migration (users, sites, audits)
    if (not migratedV2) {
      if (usersStore.size() > 0) {
        usersStoreV2 := usersStore.map(func(u : AppUserV1) : AppUser {
          {
            id = u.id;
            username = u.username;
            passwordHash = u.passwordHash;
            role = u.role;
            elevatedUntil = u.elevatedUntil;
            isEnabled = u.isEnabled;
            employeeId = null;
            name = null;
            department = null;
            contactDetails = null;
            profilePictureUrl = null;
            createdAt = u.createdAt;
            updatedAt = u.updatedAt;
          }
        });
        usersStore := [];
      };

      if (sitesStore.size() > 0) {
        sitesStoreV2 := sitesStore.map(func(s : SiteV1) : Site {
          {
            id = s.id;
            clientId = s.clientId;
            name = s.name;
            siteCode = s.siteCode;
            address = s.address;
            locationType = s.locationType;
            scheduledDate = s.scheduledDate;
            assignedAuditorId = s.assignedAuditorId;
            assignedReviewerId = s.assignedReviewerId;
            assignedManagerId = s.assignedManagerId;
            templateId = s.templateId;
            area = null;
            city = null;
            state = null;
            district = null;
            createdAt = s.createdAt;
            updatedAt = s.updatedAt;
          }
        });
        sitesStore := [];
      };

      if (auditsStore.size() > 0) {
        auditsStoreV2 := auditsStore.map(func(a : AuditV1) : Audit {
          {
            id = a.id;
            siteId = a.siteId;
            templateId = a.templateId;
            status = a.status;
            submittedBy = a.submittedBy;
            reviewedBy = a.reviewedBy;
            approvedBy = a.approvedBy;
            rejectionNote = a.rejectionNote;
            completedAt = null;
            answers = a.answers;
            observations = a.observations;
            powerSupply = a.powerSupply;
            createdAt = a.createdAt;
            updatedAt = a.updatedAt;
          }
        });
        auditsStore := [];
      };

      migratedV2 := true;
    };

    // V2 -> V3 migration (templates: add imageRequired + optionRemarks to questions)
    if (not migratedV3) {
      if (templatesStore.size() > 0) {
        templatesStoreV3 := templatesStore.map(func(t : TemplateV1) : Template {
          {
            id = t.id;
            name = t.name;
            sections = t.sections.map(migrateSectionV1);
            createdAt = t.createdAt;
            updatedAt = t.updatedAt;
          }
        });
        templatesStore := [];
      };
      migratedV3 := true;
    };
  };

  // ─── Helpers ──────────────────────────────────────────────────

  func upsertById<T <: { id : Text; updatedAt : Int }>(store : [T], item : T) : [T] {
    var found = false;
    let updated = store.map(func(existing : T) : T {
      if (existing.id == item.id) {
        found := true;
        if (item.updatedAt >= existing.updatedAt) { item } else { existing }
      } else {
        existing
      }
    });
    if (found) { updated } else { updated.concat([item]) }
  };

  func removeById<T <: { id : Text }>(store : [T], id : Text) : [T] {
    store.filter(func(item : T) : Bool { item.id != id });
  };

  // ─── Bootstrap ───────────────────────────────────────────────

  public func bootstrapAdmin() : async () {
    if (bootstrapped) { return };
    if (usersStoreV2.size() > 0) {
      bootstrapped := true;
      return;
    };

    let now : Int = Time.now();

    usersStoreV2 := [
      { id = "user-admin-1"; username = "APA_Arun"; passwordHash = "U1dpU0hfU2FmZUFydW5AMjE="; role = "Admin"; elevatedUntil = null; isEnabled = true; employeeId = ?"EMP-001"; name = ?"Arun"; department = ?"Administration"; contactDetails = null; profilePictureUrl = null; createdAt = now; updatedAt = now },
      { id = "user-mgr-1"; username = "manager_sarah"; passwordHash = "TWFuYWdlckAxMjM="; role = "Manager"; elevatedUntil = null; isEnabled = true; employeeId = ?"EMP-002"; name = ?"Sarah"; department = ?"Operations"; contactDetails = null; profilePictureUrl = null; createdAt = now; updatedAt = now },
      { id = "user-rev-1"; username = "reviewer_john"; passwordHash = "UmV2aWV3QDEyMw=="; role = "Reviewer"; elevatedUntil = null; isEnabled = true; employeeId = ?"EMP-003"; name = ?"John"; department = ?"Quality"; contactDetails = null; profilePictureUrl = null; createdAt = now; updatedAt = now },
      { id = "user-aud-1"; username = "auditor_priya"; passwordHash = "QXVkaXRAMTIz"; role = "Auditor"; elevatedUntil = null; isEnabled = true; employeeId = ?"EMP-004"; name = ?"Priya"; department = ?"Field Audit"; contactDetails = null; profilePictureUrl = null; createdAt = now; updatedAt = now },
    ];

    clientsStore := [
      { id = "client-1"; name = "Acme Logistics"; industry = ?"Logistics & Warehousing"; createdAt = now; updatedAt = now },
      { id = "client-2"; name = "Metro Power Co"; industry = ?"Energy & Utilities"; createdAt = now; updatedAt = now },
    ];

    sitesStoreV2 := [
      { id = "site-1"; clientId = "client-1"; name = "Acme - Warehouse A"; siteCode = ?"ACM-WH-A"; address = ?"12 Industrial Ave, Andheri"; locationType = ?"Metro"; scheduledDate = ?"2026-05-15"; assignedAuditorId = ?"user-aud-1"; assignedReviewerId = ?"user-rev-1"; assignedManagerId = ?"user-mgr-1"; templateId = ?"tmpl-1"; area = ?45000.0; city = ?"Mumbai"; state = ?"Maharashtra"; district = ?"Mumbai Suburban"; createdAt = now; updatedAt = now },
      { id = "site-2"; clientId = "client-1"; name = "Acme - Depot B"; siteCode = ?"ACM-DEP-B"; address = ?"88 Logistics Rd, Whitefield"; locationType = ?"Urban"; scheduledDate = ?"2026-06-01"; assignedAuditorId = ?"user-aud-1"; assignedReviewerId = ?"user-rev-1"; assignedManagerId = ?"user-mgr-1"; templateId = ?"tmpl-1"; area = ?32000.0; city = ?"Bengaluru"; state = ?"Karnataka"; district = ?"Bengaluru Urban"; createdAt = now; updatedAt = now },
      { id = "site-3"; clientId = "client-2"; name = "Metro - Substation 1"; siteCode = ?"MPC-SS-01"; address = ?"45 Power St, Sector 14"; locationType = ?"Metro"; scheduledDate = ?"2026-04-20"; assignedAuditorId = ?"user-aud-1"; assignedReviewerId = ?"user-rev-1"; assignedManagerId = ?"user-mgr-1"; templateId = ?"tmpl-1"; area = ?18500.0; city = ?"Delhi"; state = ?"Delhi"; district = ?"New Delhi"; createdAt = now; updatedAt = now },
    ];

    templatesStoreV3 := [
      {
        id = "tmpl-1"; name = "General Safety Inspection";
        sections = [
          { id = "sec-1"; title = "Electrical Safety"; order = 1; questions = [
            { id = "q-1-1"; text = "Are all electrical panels properly labelled and accessible?"; questionType = "radio"; options = ["Compliant", "Non-Compliant", "N/A"]; required = true; imageRequired = false; optionRemarks = [("Compliant", "All electrical panels are properly labelled and accessible."), ("Non-Compliant", "Electrical panels are not properly labelled. Immediate action required."), ("N/A", "Not applicable for this site.")] },
            { id = "q-1-2"; text = "Is the earthing/grounding system intact and tested?"; questionType = "radio"; options = ["Compliant", "Non-Compliant", "N/A"]; required = true; imageRequired = false; optionRemarks = [("Compliant", "Earthing/grounding system is intact and has been tested."), ("Non-Compliant", "Earthing/grounding system requires immediate inspection and rectification."), ("N/A", "Not applicable for this site.")] },
            { id = "q-1-3"; text = "Are circuit breakers functioning correctly and appropriately rated?"; questionType = "radio"; options = ["Compliant", "Non-Compliant", "N/A"]; required = true; imageRequired = false; optionRemarks = [("Compliant", "Circuit breakers are functioning correctly and are appropriately rated."), ("Non-Compliant", "Circuit breakers are not functioning correctly. Replacement or repair required."), ("N/A", "Not applicable for this site.")] }
          ]; hasCriticalObservations = true; hasPowerSupply = true },
          { id = "sec-2"; title = "Fire Safety"; order = 2; questions = [
            { id = "q-2-1"; text = "Are fire extinguishers in place, charged and within service date?"; questionType = "radio"; options = ["Compliant", "Non-Compliant", "N/A"]; required = true; imageRequired = false; optionRemarks = [("Compliant", "Fire extinguishers are in place, charged and within service date."), ("Non-Compliant", "Fire extinguishers are missing, discharged or past service date. Immediate action required."), ("N/A", "Not applicable for this site.")] },
            { id = "q-2-2"; text = "Are emergency exit routes clearly marked and unobstructed?"; questionType = "radio"; options = ["Compliant", "Non-Compliant", "N/A"]; required = true; imageRequired = false; optionRemarks = [("Compliant", "Emergency exit routes are clearly marked and unobstructed."), ("Non-Compliant", "Emergency exit routes are not clearly marked or are obstructed. Immediate rectification required."), ("N/A", "Not applicable for this site.")] },
            { id = "q-2-3"; text = "Is the fire alarm system tested and operational?"; questionType = "radio"; options = ["Compliant", "Non-Compliant", "N/A"]; required = true; imageRequired = false; optionRemarks = [("Compliant", "Fire alarm system has been tested and is operational."), ("Non-Compliant", "Fire alarm system is not operational. Urgent repair required."), ("N/A", "Not applicable for this site.")] }
          ]; hasCriticalObservations = true; hasPowerSupply = false },
        ];
        createdAt = now; updatedAt = now;
      },
    ];

    auditsStoreV2 := [
      { id = "audit-1"; siteId = "site-1"; templateId = "tmpl-1"; status = "Draft"; submittedBy = ?"auditor_priya"; reviewedBy = null; approvedBy = null; rejectionNote = null; completedAt = null; answers = []; observations = []; powerSupply = []; createdAt = now - 172800000000000; updatedAt = now - 3600000000000 },
      { id = "audit-2"; siteId = "site-2"; templateId = "tmpl-1"; status = "Pending Review"; submittedBy = ?"auditor_priya"; reviewedBy = null; approvedBy = null; rejectionNote = null; completedAt = null; answers = [ ("q-1-1", { answer = "Compliant"; remarks = "All panels clearly labelled"; images = [] }), ("q-1-2", { answer = "Non-Compliant"; remarks = "Earthing rod corroded"; images = [] }), ("q-1-3", { answer = "Compliant"; remarks = "Breakers tested monthly"; images = [] }), ("q-2-1", { answer = "Compliant"; remarks = "All extinguishers serviced Jan 2026"; images = [] }), ("q-2-2", { answer = "Compliant"; remarks = "Exit signs illuminated"; images = [] }), ("q-2-3", { answer = "N/A"; remarks = "Building undergoing renovation"; images = [] }) ]; observations = []; powerSupply = []; createdAt = now - 432000000000000; updatedAt = now - 86400000000000 },
      { id = "audit-3"; siteId = "site-3"; templateId = "tmpl-1"; status = "Completed"; submittedBy = ?"reviewer_john"; reviewedBy = null; approvedBy = ?"manager_sarah"; rejectionNote = null; completedAt = ?(now - 604800000000000); answers = [ ("q-1-1", { answer = "Compliant"; remarks = "All panels labelled"; images = [] }), ("q-1-2", { answer = "Compliant"; remarks = "Earthing tested Q4 2025"; images = [] }), ("q-1-3", { answer = "Compliant"; remarks = "All breakers rated correctly"; images = [] }), ("q-2-1", { answer = "Compliant"; remarks = "12 extinguishers on site"; images = [] }), ("q-2-2", { answer = "Compliant"; remarks = "Three exit routes, all clear"; images = [] }), ("q-2-3", { answer = "Compliant"; remarks = "Fire alarm tested weekly"; images = [] }) ]; observations = []; powerSupply = []; createdAt = now - 1209600000000000; updatedAt = now - 604800000000000 },
    ];

    bootstrapped := true;
  };

  // ─── Users ────────────────────────────────────────────────────

  public query func getUsers() : async [AppUser] { usersStoreV2 };

  public func upsertUser(user : AppUser) : async () {
    usersStoreV2 := upsertById<AppUser>(usersStoreV2, user);
  };

  public func deleteUser(id : Text) : async () {
    usersStoreV2 := removeById<AppUser>(usersStoreV2, id);
  };

  public query func verifyCredentials(username : Text, passwordHash : Text) : async ?AppUser {
    let lower = username.toLower();
    for (u in usersStoreV2.vals()) {
      if (u.username.toLower() == lower and u.passwordHash == passwordHash and u.isEnabled) {
        return ?u;
      };
    };
    null;
  };

  public query func getUserByUsername(username : Text) : async ?AppUser {
    let lower = username.toLower();
    for (u in usersStoreV2.vals()) {
      if (u.username.toLower() == lower) { return ?u };
    };
    null;
  };

  // ─── Clients ────────────────────────────────────────────────

  public query func getClients() : async [Client] { clientsStore };

  public func upsertClient(client : Client) : async () {
    clientsStore := upsertById<Client>(clientsStore, client);
  };

  public func deleteClient(id : Text) : async () {
    clientsStore := removeById<Client>(clientsStore, id);
  };

  // ─── Sites ──────────────────────────────────────────────────

  public query func getSites() : async [Site] { sitesStoreV2 };

  public func upsertSite(site : Site) : async () {
    sitesStoreV2 := upsertById<Site>(sitesStoreV2, site);
  };

  public func deleteSite(id : Text) : async () {
    sitesStoreV2 := removeById<Site>(sitesStoreV2, id);
  };

  // ─── Templates ──────────────────────────────────────────────

  public query func getTemplates() : async [Template] { templatesStoreV3 };

  public func upsertTemplate(template : Template) : async () {
    templatesStoreV3 := upsertById<Template>(templatesStoreV3, template);
  };

  public func deleteTemplate(id : Text) : async () {
    templatesStoreV3 := removeById<Template>(templatesStoreV3, id);
  };

  // ─── Audits ─────────────────────────────────────────────────

  public query func getAudits() : async [Audit] { auditsStoreV2 };

  public func upsertAudit(audit : Audit) : async () {
    auditsStoreV2 := upsertById<Audit>(auditsStoreV2, audit);
  };

  public func deleteAudit(id : Text) : async () {
    auditsStoreV2 := removeById<Audit>(auditsStoreV2, id);
  };

};
