import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileDown,
  FileText,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PhotoUpload } from "../components/PhotoUpload";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import {
  AUDITS_KEY,
  CLIENTS_KEY,
  SITES_KEY,
  TEMPLATES_KEY,
  getById,
  getList,
  saveList,
  upsert,
} from "../lib/dataStore";
import { exportAuditToCSV } from "../lib/exportExcel";
import { exportAuditToWord } from "../lib/exportWord";
import type {
  Audit,
  AuditAnswer,
  AuditStatus,
  Client,
  CriticalObservation,
  PowerSupplyData,
  Site,
  Template,
  TemplateSection,
} from "../types";

const DRAFT_KEY_PREFIX = "audit_draft_";

function getDraftKey(siteId: string) {
  return `${DRAFT_KEY_PREFIX}${siteId}`;
}

function loadOrCreateAudit(
  siteId: string,
  templates: Template[],
): Audit | null {
  // First try the active audit (non-Draft that's in progress for this site)
  const audits = getList<Audit>(AUDITS_KEY);
  const existing = audits.find((a) => a.siteId === siteId);
  if (existing) return existing;

  // Otherwise load draft
  try {
    const raw = localStorage.getItem(getDraftKey(siteId));
    if (raw) return JSON.parse(raw) as Audit;
  } catch {
    // ignore
  }

  // Create new
  const template = templates[0];
  if (!template) return null;
  return {
    id: `audit-${Date.now()}`,
    siteId,
    templateId: template.id,
    status: "Draft",
    answers: {},
    observations: {},
    powerSupply: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

interface SectionPanelProps {
  section: TemplateSection;
  audit: Audit;
  onAnswerChange: (
    questionId: string,
    field: keyof AuditAnswer,
    value: string | string[],
  ) => void;
  onObservationChange: (
    sectionId: string,
    observations: CriticalObservation[],
  ) => void;
  onPowerSupplyChange: (sectionId: string, data: PowerSupplyData) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const SectionPanel = React.memo(function SectionPanel({
  section,
  audit,
  onAnswerChange,
  onObservationChange,
  onPowerSupplyChange,
  isOpen,
  onToggle,
}: SectionPanelProps) {
  const answeredCount = section.questions.filter(
    (q) => audit.answers[q.id]?.answer,
  ).length;
  const totalCount = section.questions.length;

  const handleAddObservation = () => {
    const current = audit.observations[section.id] ?? [];
    onObservationChange(section.id, [
      ...current,
      {
        id: `obs-${Date.now()}`,
        remarks: "",
        recommendations: "",
        photo: undefined,
      },
    ]);
  };

  const handleRemoveObservation = (obsId: string) => {
    const current = audit.observations[section.id] ?? [];
    onObservationChange(
      section.id,
      current.filter((o) => o.id !== obsId),
    );
  };

  const handleObsField = (
    obsId: string,
    field: keyof CriticalObservation,
    value: string,
  ) => {
    const current = audit.observations[section.id] ?? [];
    onObservationChange(
      section.id,
      current.map((o) => (o.id === obsId ? { ...o, [field]: value } : o)),
    );
  };

  const psData: PowerSupplyData = audit.powerSupply[section.id] ?? {
    type: "3in3out",
    fields: {},
  };

  const psFields: Record<string, string[]> = {
    "3in3out": [
      "Input Voltage L1-L2 (V)",
      "Input Voltage L2-L3 (V)",
      "Input Voltage L3-L1 (V)",
      "Output Voltage L1-L2 (V)",
      "Output Voltage L2-L3 (V)",
      "Output Voltage L3-L1 (V)",
    ],
    "3in1out": [
      "Input Voltage L1-L2 (V)",
      "Input Voltage L2-L3 (V)",
      "Input Voltage L3-L1 (V)",
      "Output Voltage (V)",
      "Output Current (A)",
    ],
    "1in1out": [
      "Input Voltage (V)",
      "Output Voltage (V)",
      "Input Current (A)",
      "Output Current (A)",
    ],
  };

  return (
    <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
      {/* Section header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-4 hover:bg-muted/30 transition-colors"
        data-ocid="questionnaire.panel"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">{section.title}</span>
          <span className="text-xs text-muted-foreground">
            {answeredCount}/{totalCount} answered
          </span>
          {answeredCount === totalCount && totalCount > 0 && (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: "#2FAE5B" }}
            >
              Complete
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Progress bar */}
          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${totalCount > 0 ? (answeredCount / totalCount) * 100 : 0}%`,
                backgroundColor: "#96BB1A",
              }}
            />
          </div>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Section content */}
      {isOpen && (
        <div className="border-t border-border p-4 space-y-6">
          {/* Questions */}
          {section.questions.map((question, qi) => {
            const ans = audit.answers[question.id] ?? {
              answer: "",
              remarks: "",
              images: [],
            };
            return (
              <div
                key={question.id}
                className="space-y-3 p-4 bg-muted/20 rounded-lg"
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-muted-foreground mt-0.5 w-5 flex-shrink-0">
                    {qi + 1}.
                  </span>
                  <div className="flex-1 space-y-3">
                    <p className="text-sm font-medium">
                      {question.text}
                      {question.required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </p>

                    {/* Answer input */}
                    {question.type === "radio" ? (
                      <RadioGroup
                        value={ans.answer}
                        onValueChange={(v) =>
                          onAnswerChange(question.id, "answer", v)
                        }
                        className="flex flex-wrap gap-3"
                      >
                        {question.options.map((opt) => (
                          <div key={opt} className="flex items-center gap-1.5">
                            <RadioGroupItem
                              value={opt}
                              id={`${question.id}-${opt}`}
                            />
                            <Label
                              htmlFor={`${question.id}-${opt}`}
                              className="text-sm cursor-pointer"
                            >
                              {opt}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    ) : (
                      <Select
                        value={ans.answer}
                        onValueChange={(v) =>
                          onAnswerChange(question.id, "answer", v)
                        }
                      >
                        <SelectTrigger className="max-w-xs">
                          <SelectValue placeholder="Select answer" />
                        </SelectTrigger>
                        <SelectContent>
                          {question.options.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* Remarks (mandatory) */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Remarks *
                      </Label>
                      <Textarea
                        value={ans.remarks}
                        onChange={(e) =>
                          onAnswerChange(question.id, "remarks", e.target.value)
                        }
                        placeholder="Enter remarks..."
                        rows={2}
                        className="text-sm resize-none"
                        data-ocid="questionnaire.textarea"
                      />
                    </div>

                    {/* Photo upload */}
                    <PhotoUpload
                      images={ans.images}
                      onChange={(imgs) =>
                        onAnswerChange(question.id, "images", imgs)
                      }
                      label="Photos (optional)"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Critical Observations */}
          {section.hasCriticalObservations && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle
                    className="w-4 h-4"
                    style={{ color: "#F4A62A" }}
                  />
                  Critical Observations
                </h4>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddObservation}
                  data-ocid="questionnaire.primary_button"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add
                </Button>
              </div>

              {(audit.observations[section.id] ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No critical observations added.
                </p>
              ) : (
                <div className="space-y-3">
                  {(audit.observations[section.id] ?? []).map((obs, oi) => (
                    <div
                      key={obs.id}
                      className="p-3 border border-border rounded-lg space-y-2 relative"
                    >
                      <button
                        type="button"
                        onClick={() => handleRemoveObservation(obs.id)}
                        className="absolute top-2 right-2 text-destructive hover:bg-destructive/10 p-1 rounded"
                        data-ocid={`questionnaire.delete_button.${oi + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="space-y-1">
                        <Label className="text-xs">Remarks *</Label>
                        <Textarea
                          value={obs.remarks}
                          onChange={(e) =>
                            handleObsField(obs.id, "remarks", e.target.value)
                          }
                          placeholder="Describe the critical observation"
                          rows={2}
                          className="text-sm resize-none"
                          data-ocid="questionnaire.textarea"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Recommendations *</Label>
                        <Textarea
                          value={obs.recommendations}
                          onChange={(e) =>
                            handleObsField(
                              obs.id,
                              "recommendations",
                              e.target.value,
                            )
                          }
                          placeholder="Recommended corrective action"
                          rows={2}
                          className="text-sm resize-none"
                          data-ocid="questionnaire.textarea"
                        />
                      </div>
                      <PhotoUpload
                        images={obs.photo ? [obs.photo] : []}
                        onChange={(imgs) =>
                          handleObsField(obs.id, "photo", imgs[0] ?? "")
                        }
                        maxPhotos={1}
                        label="Photo (mandatory)"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Power Supply */}
          {section.hasPowerSupply && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Power Supply Details</h4>
              <div className="space-y-1.5">
                <Label className="text-xs">Configuration Type</Label>
                <Select
                  value={psData.type}
                  onValueChange={(v) =>
                    onPowerSupplyChange(section.id, {
                      ...psData,
                      type: v as PowerSupplyData["type"],
                    })
                  }
                >
                  <SelectTrigger className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3in3out">
                      3-Phase In / 3-Phase Out
                    </SelectItem>
                    <SelectItem value="3in1out">
                      3-Phase In / 1-Phase Out
                    </SelectItem>
                    <SelectItem value="1in1out">
                      1-Phase In / 1-Phase Out
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(psFields[psData.type] ?? []).map((fieldName) => (
                  <div key={fieldName} className="space-y-1">
                    <Label className="text-xs">{fieldName}</Label>
                    <input
                      type="text"
                      value={psData.fields[fieldName] ?? ""}
                      onChange={(e) =>
                        onPowerSupplyChange(section.id, {
                          ...psData,
                          fields: {
                            ...psData.fields,
                            [fieldName]: e.target.value,
                          },
                        })
                      }
                      placeholder="0"
                      className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      data-ocid="questionnaire.input"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export function QuestionnairePage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const sites = getList<Site>(SITES_KEY);
  const clients = getList<Client>(CLIENTS_KEY);
  const templates = getList<Template>(TEMPLATES_KEY);

  const site = sites.find((s) => s.id === siteId);
  const client = clients.find((c) => c.id === site?.clientId);
  const template =
    templates.find((t) => t.id === templates[0]?.id) ?? templates[0];

  const [audit, setAudit] = useState<Audit | null>(() => {
    if (!siteId) return null;
    return loadOrCreateAudit(siteId, templates);
  });

  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set([template?.sections[0]?.id ?? ""]),
  );
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Auto-save debounce
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerAutoSave = useCallback(
    (updatedAudit: Audit) => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        if (siteId) {
          localStorage.setItem(
            getDraftKey(siteId),
            JSON.stringify(updatedAudit),
          );
        }
      }, 5000);
    },
    [siteId],
  );

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  const updateAudit = useCallback(
    (updater: (prev: Audit) => Audit) => {
      setAudit((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        triggerAutoSave(next);
        return next;
      });
    },
    [triggerAutoSave],
  );

  const handleAnswerChange = useCallback(
    (
      questionId: string,
      field: keyof AuditAnswer,
      value: string | string[],
    ) => {
      updateAudit((prev) => ({
        ...prev,
        answers: {
          ...prev.answers,
          [questionId]: {
            ...(prev.answers[questionId] ?? {
              answer: "",
              remarks: "",
              images: [],
            }),
            [field]: value,
          },
        },
        updatedAt: Date.now(),
      }));
    },
    [updateAudit],
  );

  const handleObservationChange = useCallback(
    (sectionId: string, observations: CriticalObservation[]) => {
      updateAudit((prev) => ({
        ...prev,
        observations: { ...prev.observations, [sectionId]: observations },
        updatedAt: Date.now(),
      }));
    },
    [updateAudit],
  );

  const handlePowerSupplyChange = useCallback(
    (sectionId: string, data: PowerSupplyData) => {
      updateAudit((prev) => ({
        ...prev,
        powerSupply: { ...prev.powerSupply, [sectionId]: data },
        updatedAt: Date.now(),
      }));
    },
    [updateAudit],
  );

  const toggleSection = useCallback((sectionId: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }, []);

  const persistAudit = (updatedAudit: Audit) => {
    const audits = getList<Audit>(AUDITS_KEY);
    const idx = audits.findIndex((a) => a.id === updatedAudit.id);
    if (idx >= 0) {
      audits[idx] = updatedAudit;
    } else {
      audits.push(updatedAudit);
    }
    saveList(AUDITS_KEY, audits);
    // Clear draft
    if (siteId) localStorage.removeItem(getDraftKey(siteId));
  };

  const handleSaveDraft = () => {
    if (!audit) return;
    setSaving(true);
    const updated = {
      ...audit,
      status: "Draft" as AuditStatus,
      updatedAt: Date.now(),
    };
    persistAudit(updated);
    setAudit(updated);
    setSaving(false);
    toast.success("Draft saved");
  };

  const handleSubmit = () => {
    if (!audit || !user) return;
    let newStatus: AuditStatus = audit.status;
    const role = user.role;

    if (role === "Auditor" && audit.status === "Draft") {
      newStatus = "Pending Review";
    } else if (
      role === "Reviewer" &&
      (audit.status === "Pending Review" ||
        audit.status === "Returned for Correction")
    ) {
      newStatus = "Pending Approval";
    } else if (
      (role === "Manager" || role === "Admin") &&
      audit.status === "Pending Approval"
    ) {
      newStatus = "Completed";
    } else if (role === "Admin" || role === "Manager") {
      newStatus = "Completed";
    }

    const updated: Audit = {
      ...audit,
      status: newStatus,
      submittedBy: audit.submittedBy ?? user.username,
      updatedAt: Date.now(),
    };
    persistAudit(updated);
    setAudit(updated);
    toast.success(`Audit status updated to: ${newStatus}`);
  };

  const handleExportCSV = () => {
    if (!audit || !template || !site || !client) return;
    try {
      exportAuditToCSV(audit, template, site, client);
      toast.success("CSV exported");
    } catch {
      toast.error("Export failed");
    }
  };

  const handleExportWord = async () => {
    if (!audit || !template || !site || !client) return;
    setExporting(true);
    try {
      await exportAuditToWord(audit, template, site, client);
      toast.success("Word document exported");
    } catch (e) {
      console.error(e);
      toast.error("Word export failed");
    } finally {
      setExporting(false);
    }
  };

  const getSubmitLabel = () => {
    const role = user?.role;
    if (role === "Auditor") return "Submit for Review";
    if (role === "Reviewer") return "Submit for Approval";
    if (role === "Manager" || role === "Admin") return "Approve & Complete";
    return "Submit";
  };

  if (!audit || !template || !site) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Site or template not found.</p>
        <Button
          onClick={() => navigate("/dashboard")}
          variant="outline"
          className="mt-4"
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // All photos for photographs section
  const allPhotos: { img: string; caption: string }[] = [];
  if (template) {
    for (const section of template.sections) {
      for (const q of section.questions) {
        const ans = audit.answers[q.id];
        if (ans?.images) {
          for (const img of ans.images) {
            allPhotos.push({ img, caption: `${section.title}: ${q.text}` });
          }
        }
      }
    }
  }

  const canExport = audit.status !== "Draft";

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{site.name}</h1>
            <p className="text-sm text-muted-foreground">
              {client?.name} — {template.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={audit.status} />
            <span className="text-xs text-muted-foreground">
              Updated {new Date(audit.updatedAt).toLocaleDateString("en-AU")}
            </span>
          </div>
        </div>

        {/* Rejection note */}
        {audit.status === "Returned for Correction" && audit.rejectionNote && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
            <p className="text-sm font-semibold text-destructive">
              Returned for Correction
            </p>
            <p className="text-sm mt-1">{audit.rejectionNote}</p>
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {template.sections.map((section) => (
          <SectionPanel
            key={section.id}
            section={section}
            audit={audit}
            onAnswerChange={handleAnswerChange}
            onObservationChange={handleObservationChange}
            onPowerSupplyChange={handlePowerSupplyChange}
            isOpen={openSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
          />
        ))}

        {/* Photographs section */}
        {allPhotos.length > 0 && (
          <div className="bg-white rounded-xl border border-border shadow-card p-4">
            <h3 className="text-sm font-semibold mb-4">Photographs</h3>
            <div className="space-y-4">
              {template.sections.map((section) => {
                const sectionPhotos: {
                  img: string;
                  caption: string;
                  qText: string;
                }[] = [];
                for (const q of section.questions) {
                  const ans = audit.answers[q.id];
                  if (ans?.images) {
                    for (const img of ans.images) {
                      sectionPhotos.push({
                        img,
                        caption: section.title,
                        qText: q.text,
                      });
                    }
                  }
                }
                if (sectionPhotos.length === 0) return null;
                return (
                  <div key={section.id}>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                      {section.title}
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      {sectionPhotos.map((p, i) => (
                        <div key={`${p.img}-${i}`} className="space-y-1">
                          <img
                            src={p.img}
                            alt={p.qText}
                            className="w-32 h-24 object-cover rounded-lg border border-border"
                            loading="lazy"
                          />
                          <p className="text-xs text-muted-foreground max-w-[8rem] truncate">
                            {p.qText}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3 py-4 border-t border-border">
        <Button
          variant="outline"
          onClick={handleSaveDraft}
          disabled={saving}
          data-ocid="questionnaire.save_button"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Draft"}
        </Button>

        <Button
          onClick={handleSubmit}
          style={{ backgroundColor: "#96BB1A", color: "#111" }}
          className="font-semibold"
          data-ocid="questionnaire.submit_button"
        >
          <Send className="w-4 h-4 mr-2" />
          {getSubmitLabel()}
        </Button>

        <div className="flex-1" />

        {canExport && (
          <>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              data-ocid="questionnaire.secondary_button"
            >
              <FileDown className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={handleExportWord}
              disabled={exporting}
              data-ocid="questionnaire.secondary_button"
            >
              <FileText className="w-4 h-4 mr-2" />
              {exporting ? "Exporting..." : "Export Word"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
