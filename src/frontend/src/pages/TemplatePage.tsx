import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  GripVertical,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TEMPLATES_KEY, getList, saveList } from "../lib/dataStore";
import type { Template, TemplateQuestion, TemplateSection } from "../types";

export function TemplatePage() {
  const [templates, setTemplates] = useState(() =>
    getList<Template>(TEMPLATES_KEY),
  );
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  );

  const openNew = () => {
    const now = Date.now();
    setEditTemplate({
      id: `tmpl-${now}`,
      name: "New Template",
      sections: [],
      createdAt: now,
      updatedAt: now,
    });
    setExpandedSections(new Set());
    setEditorOpen(true);
  };

  const openEdit = (tmpl: Template) => {
    setEditTemplate({
      ...tmpl,
      sections: tmpl.sections.map((s) => ({
        ...s,
        questions: [...s.questions],
      })),
    });
    setExpandedSections(new Set([tmpl.sections[0]?.id ?? ""]));
    setEditorOpen(true);
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    saveList(TEMPLATES_KEY, updated);
    setTemplates(updated);
    toast.success("Template deleted");
  };

  const handleSaveTemplate = () => {
    if (!editTemplate) return;
    const updated = [...templates];
    const idx = updated.findIndex((t) => t.id === editTemplate.id);
    const toSave = { ...editTemplate, updatedAt: Date.now() };
    if (idx >= 0) updated[idx] = toSave;
    else updated.push(toSave);
    saveList(TEMPLATES_KEY, updated);
    setTemplates(updated);
    setEditorOpen(false);
    toast.success("Template saved");
  };

  const addSection = () => {
    if (!editTemplate) return;
    const now = Date.now();
    const newSection: TemplateSection = {
      id: `sec-${now}`,
      title: "New Section",
      order: editTemplate.sections.length + 1,
      questions: [],
      hasCriticalObservations: false,
      hasPowerSupply: false,
    };
    setEditTemplate((t) =>
      t ? { ...t, sections: [...t.sections, newSection] } : t,
    );
    setExpandedSections((s) => new Set([...s, newSection.id]));
  };

  const removeSection = (sectionId: string) => {
    setEditTemplate((t) =>
      t ? { ...t, sections: t.sections.filter((s) => s.id !== sectionId) } : t,
    );
  };

  const updateSection = (
    sectionId: string,
    updates: Partial<TemplateSection>,
  ) => {
    setEditTemplate((t) =>
      t
        ? {
            ...t,
            sections: t.sections.map((s) =>
              s.id === sectionId ? { ...s, ...updates } : s,
            ),
          }
        : t,
    );
  };

  const addQuestion = (sectionId: string) => {
    const newQ: TemplateQuestion = {
      id: `q-${Date.now()}`,
      text: "New question",
      type: "radio",
      options: ["Compliant", "Non-Compliant", "N/A"],
      required: true,
    };
    setEditTemplate((t) =>
      t
        ? {
            ...t,
            sections: t.sections.map((s) =>
              s.id === sectionId
                ? { ...s, questions: [...s.questions, newQ] }
                : s,
            ),
          }
        : t,
    );
  };

  const removeQuestion = (sectionId: string, qId: string) => {
    setEditTemplate((t) =>
      t
        ? {
            ...t,
            sections: t.sections.map((s) =>
              s.id === sectionId
                ? { ...s, questions: s.questions.filter((q) => q.id !== qId) }
                : s,
            ),
          }
        : t,
    );
  };

  const updateQuestion = (
    sectionId: string,
    qId: string,
    updates: Partial<TemplateQuestion>,
  ) => {
    setEditTemplate((t) =>
      t
        ? {
            ...t,
            sections: t.sections.map((s) =>
              s.id === sectionId
                ? {
                    ...s,
                    questions: s.questions.map((q) =>
                      q.id === qId ? { ...q, ...updates } : q,
                    ),
                  }
                : s,
            ),
          }
        : t,
    );
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-sm text-muted-foreground">
            {templates.length} template{templates.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={openNew}
          style={{ backgroundColor: "#96BB1A", color: "#111" }}
          className="font-semibold"
          data-ocid="templates.primary_button"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Template List */}
      {templates.length === 0 ? (
        <div
          className="py-16 text-center text-muted-foreground bg-white rounded-xl border border-border"
          data-ocid="templates.empty_state"
        >
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No templates yet</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map((tmpl, idx) => (
            <Card
              key={tmpl.id}
              className="border border-border shadow-card"
              data-ocid={`templates.item.${idx + 1}`}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{tmpl.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {tmpl.sections.length} section
                    {tmpl.sections.length !== 1 ? "s" : ""} &mdash; updated{" "}
                    {new Date(tmpl.updatedAt).toLocaleDateString("en-AU")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(tmpl)}
                    data-ocid={`templates.edit_button.${idx + 1}`}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteTemplate(tmpl.id)}
                    data-ocid={`templates.delete_button.${idx + 1}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Template Editor Dialog */}
      {editorOpen && editTemplate && (
        <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
          <DialogContent
            className="max-w-3xl max-h-[90vh] overflow-y-auto"
            data-ocid="template.dialog"
          >
            <DialogHeader>
              <DialogTitle>Edit Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Template Name</Label>
                <Input
                  value={editTemplate.name}
                  onChange={(e) =>
                    setEditTemplate((t) =>
                      t ? { ...t, name: e.target.value } : t,
                    )
                  }
                  data-ocid="template.input"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Sections</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addSection}
                    data-ocid="template.primary_button"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Section
                  </Button>
                </div>

                {editTemplate.sections.map((section, si) => (
                  <div
                    key={section.id}
                    className="border border-border rounded-lg overflow-hidden"
                  >
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-3 bg-muted/30 cursor-pointer text-left"
                      onClick={() => toggleSection(section.id)}
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <Input
                        value={section.title}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateSection(section.id, { title: e.target.value });
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 h-7 text-sm"
                        data-ocid="template.input"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSection(section.id);
                        }}
                        className="p-1 rounded text-destructive hover:bg-destructive/10"
                        data-ocid={`template.delete_button.${si + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {expandedSections.has(section.id) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {expandedSections.has(section.id) && (
                      <div className="p-3 space-y-3">
                        <div className="flex gap-4">
                          <div className="flex items-center gap-2 text-sm cursor-pointer">
                            <Switch
                              id={`crit-obs-${section.id}`}
                              checked={section.hasCriticalObservations}
                              onCheckedChange={(v) =>
                                updateSection(section.id, {
                                  hasCriticalObservations: v,
                                })
                              }
                            />
                            <Label
                              htmlFor={`crit-obs-${section.id}`}
                              className="cursor-pointer"
                            >
                              Critical Observations
                            </Label>
                          </div>
                          <div className="flex items-center gap-2 text-sm cursor-pointer">
                            <Switch
                              id={`ps-${section.id}`}
                              checked={section.hasPowerSupply}
                              onCheckedChange={(v) =>
                                updateSection(section.id, { hasPowerSupply: v })
                              }
                            />
                            <Label
                              htmlFor={`ps-${section.id}`}
                              className="cursor-pointer"
                            >
                              Power Supply
                            </Label>
                          </div>
                        </div>

                        {/* Questions */}
                        <div className="space-y-2">
                          {section.questions.map((q, qi) => (
                            <div
                              key={q.id}
                              className="p-3 border border-border rounded-lg space-y-2 bg-background"
                            >
                              <div className="flex gap-2">
                                <span className="text-xs text-muted-foreground pt-2 w-4">
                                  {qi + 1}.
                                </span>
                                <div className="flex-1 space-y-2">
                                  <Input
                                    value={q.text}
                                    onChange={(e) =>
                                      updateQuestion(section.id, q.id, {
                                        text: e.target.value,
                                      })
                                    }
                                    placeholder="Question text"
                                    className="text-sm"
                                    data-ocid="template.input"
                                  />
                                  <div className="flex gap-2 items-center flex-wrap">
                                    <select
                                      value={q.type}
                                      onChange={(e) =>
                                        updateQuestion(section.id, q.id, {
                                          type: e.target.value as
                                            | "radio"
                                            | "dropdown",
                                        })
                                      }
                                      className="text-xs border border-input rounded px-2 py-1 bg-background"
                                    >
                                      <option value="radio">Radio</option>
                                      <option value="dropdown">Dropdown</option>
                                    </select>
                                    <label className="flex items-center gap-1 text-xs cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={q.required}
                                        onChange={(e) =>
                                          updateQuestion(section.id, q.id, {
                                            required: e.target.checked,
                                          })
                                        }
                                      />
                                      Required
                                    </label>
                                  </div>
                                  <Input
                                    value={q.options.join(", ")}
                                    onChange={(e) =>
                                      updateQuestion(section.id, q.id, {
                                        options: e.target.value
                                          .split(",")
                                          .map((o) => o.trim())
                                          .filter(Boolean),
                                      })
                                    }
                                    placeholder="Options (comma-separated)"
                                    className="text-xs"
                                    data-ocid="template.input"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeQuestion(section.id, q.id)
                                  }
                                  className="p-1.5 rounded text-destructive hover:bg-destructive/10 self-start"
                                  data-ocid={`template.delete_button.${qi + 1}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => addQuestion(section.id)}
                            data-ocid="template.secondary_button"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Question
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setEditorOpen(false)}
                  className="flex-1"
                  data-ocid="template.cancel_button"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveTemplate}
                  style={{ backgroundColor: "#96BB1A", color: "#111" }}
                  className="flex-1 font-semibold"
                  data-ocid="template.save_button"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
