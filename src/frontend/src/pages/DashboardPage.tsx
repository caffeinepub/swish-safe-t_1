import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  ClipboardList,
  Clock,
  FileEdit,
  Plus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { SyncButton } from "../components/SyncButton";
import { useAuth } from "../hooks/useAuth";
import {
  AUDITS_KEY,
  CLIENTS_KEY,
  SITES_KEY,
  TEMPLATES_KEY,
  getList,
} from "../lib/dataStore";
import type { Audit, Client, Site, Template } from "../types";

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [newAuditOpen, setNewAuditOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedSite, setSelectedSite] = useState("");

  const [audits, setAudits] = useState(() => getList<Audit>(AUDITS_KEY));
  const [clients, setClients] = useState(() => getList<Client>(CLIENTS_KEY));
  const [sites, setSites] = useState(() => getList<Site>(SITES_KEY));
  const [templates, setTemplates] = useState(() =>
    getList<Template>(TEMPLATES_KEY),
  );

  useEffect(() => {
    const handler = () => {
      setAudits(getList<Audit>(AUDITS_KEY));
      setClients(getList<Client>(CLIENTS_KEY));
      setSites(getList<Site>(SITES_KEY));
      setTemplates(getList<Template>(TEMPLATES_KEY));
    };
    window.addEventListener("swish-sync", handler);
    return () => window.removeEventListener("swish-sync", handler);
  }, []);

  const sitesForClient = useMemo(
    () => sites.filter((s) => s.clientId === selectedClient),
    [sites, selectedClient],
  );

  const kpi = useMemo(
    () => ({
      total: audits.length,
      draft: audits.filter((a) => a.status === "Draft").length,
      pending: audits.filter((a) =>
        ["Pending Review", "Pending Approval"].includes(a.status),
      ).length,
      completed: audits.filter((a) => a.status === "Completed").length,
    }),
    [audits],
  );

  const recentAudits = useMemo(
    () => [...audits].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 10),
    [audits],
  );

  const getSiteName = (siteId: string) =>
    sites.find((s) => s.id === siteId)?.name ?? siteId;
  const getTemplateName = (tmplId: string) =>
    templates.find((t) => t.id === tmplId)?.name ?? tmplId;
  const getClientForSite = (siteId: string) => {
    const site = sites.find((s) => s.id === siteId);
    if (!site) return "";
    return clients.find((c) => c.id === site.clientId)?.name ?? "";
  };

  const handleStartAudit = () => {
    if (!selectedSite) return;
    setNewAuditOpen(false);
    navigate(`/questionnaire/${selectedSite}`);
  };

  const kpiCards = [
    {
      label: "Total Audits",
      value: kpi.total,
      icon: ClipboardList,
      tileClass: "kpi-grey",
    },
    {
      label: "Draft",
      value: kpi.draft,
      icon: FileEdit,
      tileClass: "kpi-amber",
    },
    {
      label: "Pending",
      value: kpi.pending,
      icon: Clock,
      tileClass: "kpi-lime",
    },
    {
      label: "Completed",
      value: kpi.completed,
      icon: CheckCircle,
      tileClass: "kpi-green",
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {user?.username}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SyncButton />
          <Button
            onClick={() => setNewAuditOpen(true)}
            style={{ backgroundColor: "#96BB1A", color: "#111" }}
            className="font-semibold"
            data-ocid="dashboard.primary_button"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Audit
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiCards.map((card) => (
          <Card key={card.label} className="border border-border shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${card.tileClass}`}
                >
                  <card.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {card.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Audits */}
      <Card className="border border-border shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Recent Audits
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentAudits.length === 0 ? (
            <div
              className="py-12 text-center text-muted-foreground"
              data-ocid="audits.empty_state"
            >
              <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">
                No audits yet. Start your first inspection.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Site
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Client
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Template
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Date
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentAudits.map((audit, idx) => (
                    <tr
                      key={audit.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      data-ocid={`audits.item.${idx + 1}`}
                    >
                      <td className="px-4 py-3 font-medium">
                        {getSiteName(audit.siteId)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {getClientForSite(audit.siteId)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {getTemplateName(audit.templateId)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={audit.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(audit.updatedAt).toLocaleDateString("en-AU")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/questionnaire/${audit.siteId}`)
                            }
                            className="flex items-center gap-1 text-xs font-medium hover:text-primary transition-colors"
                            style={{ color: "#96BB1A" }}
                            data-ocid={`audits.edit_button.${idx + 1}`}
                          >
                            <FileEdit className="w-3.5 h-3.5" />
                            Open
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Audit Dialog */}
      <Dialog open={newAuditOpen} onOpenChange={setNewAuditOpen}>
        <DialogContent data-ocid="new_audit.dialog">
          <DialogHeader>
            <DialogTitle>Start New Audit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Client</Label>
              <Select
                value={selectedClient}
                onValueChange={(v) => {
                  setSelectedClient(v);
                  setSelectedSite("");
                }}
              >
                <SelectTrigger data-ocid="new_audit.select">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedClient && (
              <div className="space-y-1.5">
                <Label>Site</Label>
                <Select value={selectedSite} onValueChange={setSelectedSite}>
                  <SelectTrigger data-ocid="new_audit.select">
                    <SelectValue placeholder="Select a site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sitesForClient.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setNewAuditOpen(false)}
                className="flex-1"
                data-ocid="new_audit.cancel_button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleStartAudit}
                disabled={!selectedSite}
                style={{ backgroundColor: "#96BB1A", color: "#111" }}
                className="flex-1 font-semibold"
                data-ocid="new_audit.primary_button"
              >
                Start Audit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
