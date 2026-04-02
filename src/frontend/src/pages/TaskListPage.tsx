import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ClipboardList, Eye, XCircle } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import {
  AUDITS_KEY,
  CLIENTS_KEY,
  SITES_KEY,
  TEMPLATES_KEY,
  getList,
  saveList,
} from "../lib/dataStore";
import type { Audit, Client, Site, Template } from "../types";

export function TaskListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const audits = getList<Audit>(AUDITS_KEY);
  const sites = getList<Site>(SITES_KEY);
  const clients = getList<Client>(CLIENTS_KEY);
  const templates = getList<Template>(TEMPLATES_KEY);

  const getSiteName = (siteId: string) =>
    sites.find((s) => s.id === siteId)?.name ?? siteId;
  const getClientName = (siteId: string) => {
    const site = sites.find((s) => s.id === siteId);
    return clients.find((c) => c.id === site?.clientId)?.name ?? "";
  };
  const getTemplateName = (tmplId: string) =>
    templates.find((t) => t.id === tmplId)?.name ?? tmplId;

  const relevantAudits = useMemo(() => {
    if (!user) return [];
    const role = user.role;
    const isAdminOrMgr = role === "Admin" || role === "Manager";
    return audits
      .filter((a) => {
        if (isAdminOrMgr) return true;
        if (role === "Reviewer")
          return ["Pending Review", "Returned for Correction"].includes(
            a.status,
          );
        if (role === "Auditor") return a.status === "Draft";
        return false;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [audits, user]);

  const handleApprove = (audit: Audit) => {
    const updated = audits.map((a) =>
      a.id === audit.id
        ? {
            ...a,
            status: "Completed" as const,
            approvedBy: user?.username,
            updatedAt: Date.now(),
          }
        : a,
    );
    saveList(AUDITS_KEY, updated);
    toast.success("Audit approved and completed");
    window.location.reload();
  };

  const handleReject = (audit: Audit) => {
    const note = window.prompt("Enter rejection note:");
    if (note === null) return;
    const updated = audits.map((a) =>
      a.id === audit.id
        ? {
            ...a,
            status: "Returned for Correction" as const,
            rejectionNote: note,
            updatedAt: Date.now(),
          }
        : a,
    );
    saveList(AUDITS_KEY, updated);
    toast.success("Audit returned for correction");
    window.location.reload();
  };

  const getActionButtons = (audit: Audit, idx: number) => {
    const role = user?.role;
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(`/questionnaire/${audit.siteId}`)}
          className="flex items-center gap-1 text-xs font-medium transition-colors"
          style={{ color: "#96BB1A" }}
          data-ocid={`tasks.edit_button.${idx + 1}`}
        >
          <Eye className="w-3.5 h-3.5" />
          Open
        </button>
        {(role === "Admin" || role === "Manager") &&
          audit.status === "Pending Approval" && (
            <>
              <button
                type="button"
                onClick={() => handleApprove(audit)}
                className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700"
                data-ocid={`tasks.confirm_button.${idx + 1}`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Approve
              </button>
              <button
                type="button"
                onClick={() => handleReject(audit)}
                className="flex items-center gap-1 text-xs font-medium text-destructive hover:text-destructive/80"
                data-ocid={`tasks.delete_button.${idx + 1}`}
              >
                <XCircle className="w-3.5 h-3.5" />
                Reject
              </button>
            </>
          )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {user?.role} view — {relevantAudits.length} item
            {relevantAudits.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={() => navigate("/dashboard")}
          style={{ backgroundColor: "#96BB1A", color: "#111" }}
          className="font-semibold"
          data-ocid="tasks.primary_button"
        >
          + New Audit
        </Button>
      </div>

      <Card className="border border-border shadow-card">
        <CardContent className="p-0">
          {relevantAudits.length === 0 ? (
            <div
              className="py-16 text-center text-muted-foreground"
              data-ocid="tasks.empty_state"
            >
              <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No tasks right now</p>
              <p className="text-sm mt-1">All caught up!</p>
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
                      Updated
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {relevantAudits.map((audit, idx) => (
                    <tr
                      key={audit.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      data-ocid={`tasks.item.${idx + 1}`}
                    >
                      <td className="px-4 py-3 font-medium">
                        {getSiteName(audit.siteId)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {getClientName(audit.siteId)}
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
                        <div className="flex justify-end">
                          {getActionButtons(audit, idx)}
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
    </div>
  );
}
