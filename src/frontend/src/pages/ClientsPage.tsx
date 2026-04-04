import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, ChevronRight, Edit, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  deleteClientFromBackend,
  pushClientToBackend,
} from "../lib/backendSync";
import {
  AUDITS_KEY,
  CLIENTS_KEY,
  SITES_KEY,
  getList,
  saveList,
} from "../lib/dataStore";
import type { Audit, Client, Site } from "../types";

export function ClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState(() => getList<Client>(CLIENTS_KEY));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [form, setForm] = useState({ name: "", industry: "" });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sites = getList<Site>(SITES_KEY);
  const audits = getList<Audit>(AUDITS_KEY);

  const getSiteCount = (clientId: string) =>
    sites.filter((s) => s.clientId === clientId).length;

  const getAuditCount = (clientId: string) => {
    const clientSiteIds = sites
      .filter((s) => s.clientId === clientId)
      .map((s) => s.id);
    return audits.filter((a) => clientSiteIds.includes(a.siteId)).length;
  };

  const openAdd = () => {
    setEditClient(null);
    setForm({ name: "", industry: "" });
    setDialogOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditClient(client);
    setForm({ name: client.name, industry: client.industry ?? "" });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const now = Date.now();
    let updated: Client[];
    let savedClient: Client;
    if (editClient) {
      const next: Client = {
        ...editClient,
        name: form.name.trim(),
        industry: form.industry.trim() || undefined,
        updatedAt: now,
      };
      updated = clients.map((c) => (c.id === editClient.id ? next : c));
      savedClient = next;
    } else {
      const newClient: Client = {
        id: `client-${now}`,
        name: form.name.trim(),
        industry: form.industry.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };
      updated = [...clients, newClient];
      savedClient = newClient;
    }
    saveList(CLIENTS_KEY, updated);
    setClients(updated);
    setDialogOpen(false);
    toast.success(editClient ? "Client updated" : "Client added");
    // Sync to backend (fire-and-forget)
    pushClientToBackend(savedClient).catch((e) =>
      console.warn("[Clients] pushClientToBackend failed:", e),
    );
  };

  const handleDelete = (id: string) => {
    const updated = clients.filter((c) => c.id !== id);
    saveList(CLIENTS_KEY, updated);
    setClients(updated);
    setDeleteId(null);
    toast.success("Client deleted");
    // Sync to backend (fire-and-forget)
    deleteClientFromBackend(id).catch((e) =>
      console.warn("[Clients] deleteClientFromBackend failed:", e),
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground">
            {clients.length} client{clients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={openAdd}
          style={{ backgroundColor: "#96BB1A", color: "#111" }}
          className="font-semibold"
          data-ocid="clients.primary_button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        {clients.length === 0 ? (
          <div
            className="py-16 text-center text-muted-foreground"
            data-ocid="clients.empty_state"
          >
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No clients yet</p>
            <p className="text-sm mt-1">Add your first client to get started</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Sites</TableHead>
                <TableHead>Audits</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client, idx) => (
                <TableRow key={client.id} data-ocid={`clients.item.${idx + 1}`}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.industry ?? "—"}
                  </TableCell>
                  <TableCell>{getSiteCount(client.id)}</TableCell>
                  <TableCell>{getAuditCount(client.id)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/clients/${client.id}/sites`)}
                        className="text-xs font-medium flex items-center gap-1 hover:text-primary transition-colors"
                        style={{ color: "#96BB1A" }}
                        data-ocid={`clients.link.${idx + 1}`}
                      >
                        Sites <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(client)}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                        data-ocid={`clients.edit_button.${idx + 1}`}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(client.id)}
                        className="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors"
                        data-ocid={`clients.delete_button.${idx + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="client.dialog">
          <DialogHeader>
            <DialogTitle>
              {editClient ? "Edit Client" : "Add Client"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Client name"
                data-ocid="client.input"
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
                data-ocid="client.input"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1"
                data-ocid="client.cancel_button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!form.name.trim()}
                style={{ backgroundColor: "#96BB1A", color: "#111" }}
                className="flex-1 font-semibold"
                data-ocid="client.save_button"
              >
                {editClient ? "Update" : "Add Client"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent data-ocid="client_delete.dialog">
          <DialogHeader>
            <DialogTitle>Delete Client?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will remove the client record. Sites and audits are not
            deleted.
          </p>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              className="flex-1"
              data-ocid="client_delete.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDelete(deleteId)}
              className="flex-1"
              data-ocid="client_delete.confirm_button"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
