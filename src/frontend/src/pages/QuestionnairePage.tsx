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
import { PowerSupplyTable } from "../components/PowerSupplyTable";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { pushAuditToBackend } from "../lib/backendSync";
import {
  AUDITS_KEY,
  CLIENTS_KEY,
  SITES_KEY,
  TEMPLATES_KEY,
  getList,
  saveList,
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

  // Create new — use site's assigned template, fall back to first template
  const site = getList<Site>(SITES_KEY).find((s) => s.id === siteId);
  const template =
    templates.find((t) => t.id === site?.templateId) ?? templates[0];
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

interface ValidationError {
  sectionId: string;
  sectionTitle: string;
  questionId: string;
  questionIndex: number; // 1-based
  questionText: string;
  errorType: "answer" | "image";
}

interface SectionPanelProps {
  section: TemplateSection;
  audit: Audit;
  validationErrors: ValidationError[];
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
  // Track last auto-filled remark per question
  autoFilledRemarks: Record<string, string>;
  onAutoFilledRemarksChange: (qId: string, remark: string) => void;
}

const SectionPanel = React.memo(function SectionPanel({
  section,
  audit,
  validationErrors,
  onAnswerChange,
  onObservationChange,
  onPowerSupplyChange,
  isOpen,
  onToggle,
  autoFilledRemarks,
  onAutoFilledRemarksChange,
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
    rows: [],
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
            const hasError = validationErrors.some(
              (e) => e.questionId === question.id,
            );
            const photoLabel = question.imageRequired
              ? "Photos (required)"
              : "Photos (optional)";

            return (
              <div
                key={question.id}
                className={`space-y-3 p-4 rounded-lg ${
                  hasError ? "bg-red-50 border-2 border-red-400" : "bg-muted/20"
                }`}
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
                      {question.imageRequired && (
                        <span
                          className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: "#FEF3C7",
                            color: "#92400E",
                          }}
                        >
                          📷 Photo required
                        </span>
                      )}
                    </p>

                    {/* Answer input */}
                    {question.type === "radio" ? (
                      <RadioGroup
                        value={ans.answer}
                        onValueChange={(v) => {
                          onAnswerChange(question.id, "answer", v);
                          // Auto-fill preset remark if available
                          const preset = question.optionRemarks?.[v];
                          if (preset) {
                            const currentRemark = ans.remarks;
                            const lastAutoFilled =
                              autoFilledRemarks[question.id] ?? "";
                            if (
                              currentRemark === "" ||
                              currentRemark === lastAutoFilled
                            ) {
                              onAnswerChange(question.id, "remarks", preset);
                              onAutoFilledRemarksChange(question.id, preset);
                            }
                          }
                        }}
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
                        onValueChange={(v) => {
                          onAnswerChange(question.id, "answer", v);
                          // Auto-fill preset remark if available
                          const preset = question.optionRemarks?.[v];
                          if (preset) {
                            const currentRemark = ans.remarks;
                            const lastAutoFilled =
                              autoFilledRemarks[question.id] ?? "";
                            if (
                              currentRemark === "" ||
                              currentRemark === lastAutoFilled
                            ) {
                              onAnswerChange(question.id, "remarks", preset);
                              onAutoFilledRemarksChange(question.id, preset);
                            }
                          }
                        }}
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

                    {/* Remarks (always optional) */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Remarks
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
                      label={photoLabel}
                    />

                    {/* Per-question validation error indicators */}
                    {hasError && (
                      <div className="space-y-1">
                        {validationErrors
                          .filter((e) => e.questionId === question.id)
                          .map((err) => (
                            <p
                              key={err.errorType}
                              className="text-xs text-red-600 flex items-center gap-1"
                            >
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                              {err.errorType === "answer"
                                ? "Answer is required"
                                : "At least one photo is required"}
                            </p>
                          ))}
                      </div>
                    )}
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
                  onValueChange={(v) => {
                    const newType = v as PowerSupplyData["type"];
                    onPowerSupplyChange(section.id, {
                      type: newType,
                      rows: [],
                    });
                  }}
                >
                  <SelectTrigger
                    className="max-w-xs"
                    data-ocid="power_supply.select"
                  >
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
              <PowerSupplyTable
                sectionId={section.id}
                data={psData}
                onChange={onPowerSupplyChange}
              />
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

  const [audit, setAudit] = useState<Audit | null>(() => {
    if (!siteId) return null;
    return loadOrCreateAudit(siteId, templates);
  });

  const template =
    templates.find((t) => t.id === audit?.templateId) ?? templates[0];

  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set([template?.sections[0]?.id ?? ""]),
  );
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    [],
  );
  // Track last auto-filled remark per question: questionId -> last preset that was auto-filled
  const [autoFilledRemarks, setAutoFilledRemarks] = useState<
    Record<string, string>
  >({});

  const pageTopRef = useRef<HTMLDivElement>(null);

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
        // Also push to backend on autosave
        pushAuditToBackend(updatedAudit).catch((e) =>
          console.warn(
            "[Questionnaire] pushAuditToBackend (autosave) failed:",
            e,
          ),
        );
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

  // Build validation errors from current audit state
  const validateAudit = useCallback(
    (currentAudit: Audit): ValidationError[] => {
      if (!template) return [];
      const errors: ValidationError[] = [];
      for (const section of template.sections) {
        section.questions.forEach((question, qi) => {
          const ans = currentAudit.answers[question.id];
          if (question.required && !ans?.answer) {
            errors.push({
              sectionId: section.id,
              sectionTitle: section.title,
              questionId: question.id,
              questionIndex: qi + 1,
              questionText: question.text,
              errorType: "answer",
            });
          }
          if (
            question.imageRequired &&
            (!ans?.images || ans.images.length === 0)
          ) {
            errors.push({
              sectionId: section.id,
              sectionTitle: section.title,
              questionId: question.id,
              questionIndex: qi + 1,
              questionText: question.text,
              errorType: "image",
            });
          }
        });
      }
      return errors;
    },
    [template],
  );

  const handleAnswerChange = useCallback(
    (
      questionId: string,
      field: keyof AuditAnswer,
      value: string | string[],
    ) => {
      updateAudit((prev) => {
        const next = {
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
        };
        // Re-run validation reactively if we have existing errors
        if (validationErrors.length > 0) {
          const newErrors = validateAudit(next);
          setValidationErrors(newErrors);
        }
        return next;
      });
    },
    [updateAudit, validationErrors.length, validateAudit],
  );

  const handleAutoFilledRemarksChange = useCallback(
    (qId: string, remark: string) => {
      setAutoFilledRemarks((prev) => ({ ...prev, [qId]: remark }));
    },
    [],
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
    // Push to backend (fire-and-forget)
    pushAuditToBackend(updatedAudit).catch((e) =>
      console.warn("[Questionnaire] pushAuditToBackend failed:", e),
    );
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

    // Run validation before proceeding
    const errors = validateAudit(audit);
    if (errors.length > 0) {
      setValidationErrors(errors);
      // Open sections that have errors
      setOpenSections((prev) => {
        const next = new Set(prev);
        for (const err of errors) {
          next.add(err.sectionId);
        }
        return next;
      });
      // Scroll to top to show error summary
      pageTopRef.current?.scrollIntoView({ behavior: "smooth" });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Clear any lingering validation errors
    setValidationErrors([]);

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
      {/* Scroll anchor */}
      <div ref={pageTopRef} />

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

      {/* Validation error summary */}
      {validationErrors.length > 0 && (
        <div
          className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4"
          data-ocid="questionnaire.error_state"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="font-semibold text-red-700 text-sm">
              Please fix the following before submitting:
            </span>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {validationErrors.map((err) => (
              <div
                key={`${err.sectionId}-${err.questionId}-${err.errorType}`}
                className="text-xs text-red-600"
              >
                • <span className="font-medium">{err.sectionTitle}</span> — Q
                {err.questionIndex}:{" "}
                {err.errorType === "answer"
                  ? "Answer required"
                  : "Photo required"}{" "}
                ({err.questionText.slice(0, 60)}
                {err.questionText.length > 60 ? "..." : ""})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-3">
        {template.sections.map((section) => (
          <SectionPanel
            key={section.id}
            section={section}
            audit={audit}
            validationErrors={validationErrors}
            onAnswerChange={handleAnswerChange}
            onObservationChange={handleObservationChange}
            onPowerSupplyChange={handlePowerSupplyChange}
            isOpen={openSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
            autoFilledRemarks={autoFilledRemarks}
            onAutoFilledRemarksChange={handleAutoFilledRemarksChange}
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
