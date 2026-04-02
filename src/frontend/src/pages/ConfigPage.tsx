import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Settings } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  CLIENTS_KEY,
  TEMPLATES_KEY,
  getList,
  saveList,
} from "../lib/dataStore";
import type { Client, Template } from "../types";

export function ConfigPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const templates = getList<Template>(TEMPLATES_KEY);

  const [clients, setClients] = useState(() => getList<Client>(CLIENTS_KEY));
  const client = clients.find((c) => c.id === clientId);

  const [form, setForm] = useState({
    name: client?.name ?? "",
    industry: client?.industry ?? "",
    defaultTemplateId: client?.defaultTemplateId ?? "",
  });

  const handleSave = () => {
    if (!clientId || !form.name.trim()) return;
    const updated = clients.map((c) =>
      c.id === clientId
        ? {
            ...c,
            name: form.name.trim(),
            industry: form.industry.trim() || undefined,
            defaultTemplateId: form.defaultTemplateId || undefined,
            updatedAt: Date.now(),
          }
        : c,
    );
    saveList(CLIENTS_KEY, updated);
    setClients(updated);
    toast.success("Client configuration saved");
  };

  if (!client) {
    return <div className="p-6 text-muted-foreground">Client not found.</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-5 h-5" style={{ color: "#96BB1A" }} />
        <h1 className="text-2xl font-bold">Client Configuration</h1>
      </div>

      <Card className="border border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-base">{client.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Client Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              data-ocid="config.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Industry</Label>
            <Input
              value={form.industry}
              onChange={(e) =>
                setForm((f) => ({ ...f, industry: e.target.value }))
              }
              placeholder="e.g. Logistics, Energy"
              data-ocid="config.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Default Inspection Template</Label>
            <Select
              value={form.defaultTemplateId}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, defaultTemplateId: v }))
              }
            >
              <SelectTrigger data-ocid="config.select">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleSave}
            style={{ backgroundColor: "#96BB1A", color: "#111" }}
            className="font-semibold"
            data-ocid="config.save_button"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Configuration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
