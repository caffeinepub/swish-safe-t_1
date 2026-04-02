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
import {
  ChevronRight,
  Edit,
  MapPin,
  PlayCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  AUDITS_KEY,
  CLIENTS_KEY,
  SITES_KEY,
  getList,
  saveList,
} from "../lib/dataStore";
import type { Audit, Client, Site } from "../types";

export function SitesPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  const clients = getList<Client>(CLIENTS_KEY);
  const client = clients.find((c) => c.id === clientId);

  const [sites, setSites] = useState(() =>
    getList<Site>(SITES_KEY).filter((s) => s.clientId === clientId),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSite, setEditSite] = useState<Site | null>(null);
  const [form, setForm] = useState({ name: "", address: "" });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const audits = getList<Audit>(AUDITS_KEY);

  const getAuditCount = (siteId: string) =>
    audits.filter((a) => a.siteId === siteId).length;

  const openAdd = () => {
    setEditSite(null);
    setForm({ name: "", address: "" });
    setDialogOpen(true);
  };

  const openEdit = (site: Site) => {
    setEditSite(site);
    setForm({ name: site.name, address: site.address ?? "" });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !clientId) return;
    const now = Date.now();
    const allSites = getList<Site>(SITES_KEY);
    let updatedAll: Site[];
    if (editSite) {
      updatedAll = allSites.map((s) =>
        s.id === editSite.id
          ? {
              ...s,
              name: form.name.trim(),
              address: form.address.trim() || undefined,
              updatedAt: now,
            }
          : s,
      );
    } else {
      const newSite: Site = {
        id: `site-${now}`,
        clientId,
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };
      updatedAll = [...allSites, newSite];
    }
    saveList(SITES_KEY, updatedAll);
    setSites(updatedAll.filter((s) => s.clientId === clientId));
    setDialogOpen(false);
    toast.success(editSite ? "Site updated" : "Site added");
  };

  const handleDelete = (id: string) => {
    const allSites = getList<Site>(SITES_KEY);
    const updated = allSites.filter((s) => s.id !== id);
    saveList(SITES_KEY, updated);
    setSites(updated.filter((s) => s.clientId === clientId));
    setDeleteId(null);
    toast.success("Site deleted");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link
          to="/clients"
          className="hover:text-foreground transition-colors"
          data-ocid="breadcrumb.link"
        >
          Clients
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">
          {client?.name ?? "Client"}
        </span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sites</h1>
          <p className="text-sm text-muted-foreground">
            {client?.name} &mdash; {sites.length} site
            {sites.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={openAdd}
          style={{ backgroundColor: "#96BB1A", color: "#111" }}
          className="font-semibold"
          data-ocid="sites.primary_button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Site
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        {sites.length === 0 ? (
          <div
            className="py-16 text-center text-muted-foreground"
            data-ocid="sites.empty_state"
          >
            <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No sites yet</p>
            <p className="text-sm mt-1">
              Add your first site to start inspections
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Site Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Audits</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((site, idx) => (
                <TableRow key={site.id} data-ocid={`sites.item.${idx + 1}`}>
                  <TableCell className="font-medium">{site.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {site.address ?? "—"}
                  </TableCell>
                  <TableCell>{getAuditCount(site.id)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/questionnaire/${site.id}`)}
                        className="flex items-center gap-1 text-xs font-medium hover:text-primary transition-colors"
                        style={{ color: "#96BB1A" }}
                        data-ocid={`sites.primary_button.${idx + 1}`}
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        Start Audit
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(site)}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                        data-ocid={`sites.edit_button.${idx + 1}`}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(site.id)}
                        className="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors"
                        data-ocid={`sites.delete_button.${idx + 1}`}
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
        <DialogContent data-ocid="site.dialog">
          <DialogHeader>
            <DialogTitle>{editSite ? "Edit Site" : "Add Site"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Site Name *</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Warehouse A"
                data-ocid="site.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                placeholder="Street address"
                data-ocid="site.input"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1"
                data-ocid="site.cancel_button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!form.name.trim()}
                style={{ backgroundColor: "#96BB1A", color: "#111" }}
                className="flex-1 font-semibold"
                data-ocid="site.save_button"
              >
                {editSite ? "Update" : "Add Site"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent data-ocid="site_delete.dialog">
          <DialogHeader>
            <DialogTitle>Delete Site?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will remove the site. Audits for this site are not deleted.
          </p>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              className="flex-1"
              data-ocid="site_delete.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDelete(deleteId)}
              className="flex-1"
              data-ocid="site_delete.confirm_button"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
