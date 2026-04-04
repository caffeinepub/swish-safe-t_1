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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useAuthContext } from "../contexts/AuthContext";
import { deleteSiteFromBackend, pushSiteToBackend } from "../lib/backendSync";
import {
  AUDITS_KEY,
  CLIENTS_KEY,
  SITES_KEY,
  TEMPLATES_KEY,
  USERS_KEY,
  getList,
  saveList,
} from "../lib/dataStore";
import type { AppUser, Audit, Client, Site, Template } from "../types";

const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

interface SiteForm {
  name: string;
  siteCode: string;
  address: string;
  locationType: string;
  scheduledDate: string;
  assignedAuditorId: string;
  assignedReviewerId: string;
  assignedManagerId: string;
  templateId: string;
  area: string;
  city: string;
  state: string;
  district: string;
}

const EMPTY_FORM: SiteForm = {
  name: "",
  siteCode: "",
  address: "",
  locationType: "",
  scheduledDate: "",
  assignedAuditorId: "",
  assignedReviewerId: "",
  assignedManagerId: "",
  templateId: "",
  area: "",
  city: "",
  state: "",
  district: "",
};

function formatDate(iso: string | undefined): string {
  if (!iso) return "\u2014";
  try {
    const [year, month, day] = iso.split("-");
    return `${day}/${month}/${year}`;
  } catch {
    return iso;
  }
}

export function SitesPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const canEdit =
    user?.role === "Admin" ||
    user?.role === "Manager" ||
    user?.role === "Reviewer";

  const allUsers = getList<AppUser>(USERS_KEY);
  const auditors = allUsers.filter((u) => u.role === "Auditor");
  const reviewers = allUsers.filter((u) => u.role === "Reviewer");
  const managers = allUsers.filter((u) => u.role === "Manager");
  const templates = getList<Template>(TEMPLATES_KEY);

  const clients = getList<Client>(CLIENTS_KEY);
  const client = clients.find((c) => c.id === clientId);

  const [sites, setSites] = useState(() =>
    getList<Site>(SITES_KEY).filter((s) => s.clientId === clientId),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSite, setEditSite] = useState<Site | null>(null);
  const [form, setForm] = useState<SiteForm>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const audits = getList<Audit>(AUDITS_KEY);

  const getAuditCount = (siteId: string) =>
    audits.filter((a) => a.siteId === siteId).length;

  const getUserName = (userId: string | undefined) =>
    allUsers.find((u) => u.id === userId)?.username ?? "\u2014";

  const getTemplateName = (tmplId: string | undefined) =>
    templates.find((t) => t.id === tmplId)?.name ?? "\u2014";

  const openAdd = () => {
    setEditSite(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (site: Site) => {
    setEditSite(site);
    setForm({
      name: site.name,
      siteCode: site.siteCode ?? "",
      address: site.address ?? "",
      locationType: site.locationType ?? "",
      scheduledDate: site.scheduledDate ?? "",
      assignedAuditorId: site.assignedAuditorId ?? "",
      assignedReviewerId: site.assignedReviewerId ?? "",
      assignedManagerId: site.assignedManagerId ?? "",
      templateId: site.templateId ?? "",
      area: site.area !== undefined ? String(site.area) : "",
      city: site.city ?? "",
      state: site.state ?? "",
      district: site.district ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !clientId) return;
    const now = Date.now();
    const allSites = getList<Site>(SITES_KEY);
    const parsedArea = form.area.trim() ? Number(form.area.trim()) : undefined;
    let updatedAll: Site[];
    let savedSite: Site;
    if (editSite) {
      const next: Site = {
        ...editSite,
        name: form.name.trim(),
        siteCode: form.siteCode.trim() || undefined,
        address: form.address.trim() || undefined,
        locationType: (form.locationType as Site["locationType"]) || undefined,
        scheduledDate: form.scheduledDate || undefined,
        assignedAuditorId: form.assignedAuditorId || undefined,
        assignedReviewerId: form.assignedReviewerId || undefined,
        assignedManagerId: form.assignedManagerId || undefined,
        templateId: form.templateId || undefined,
        area: parsedArea,
        city: form.city.trim() || undefined,
        state: form.state || undefined,
        district: form.district.trim() || undefined,
        updatedAt: now,
      };
      updatedAll = allSites.map((s) => (s.id === editSite.id ? next : s));
      savedSite = next;
    } else {
      const newSite: Site = {
        id: `site-${now}`,
        clientId,
        name: form.name.trim(),
        siteCode: form.siteCode.trim() || undefined,
        address: form.address.trim() || undefined,
        locationType: (form.locationType as Site["locationType"]) || undefined,
        scheduledDate: form.scheduledDate || undefined,
        assignedAuditorId: form.assignedAuditorId || undefined,
        assignedReviewerId: form.assignedReviewerId || undefined,
        assignedManagerId: form.assignedManagerId || undefined,
        templateId: form.templateId || undefined,
        area: parsedArea,
        city: form.city.trim() || undefined,
        state: form.state || undefined,
        district: form.district.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };
      updatedAll = [...allSites, newSite];
      savedSite = newSite;
    }
    saveList(SITES_KEY, updatedAll);
    setSites(updatedAll.filter((s) => s.clientId === clientId));
    setDialogOpen(false);
    toast.success(editSite ? "Site updated" : "Site added");
    pushSiteToBackend(savedSite).catch((e) =>
      console.warn("[Sites] pushSiteToBackend failed:", e),
    );
  };

  const handleDelete = (id: string) => {
    const allSites = getList<Site>(SITES_KEY);
    const updated = allSites.filter((s) => s.id !== id);
    saveList(SITES_KEY, updated);
    setSites(updated.filter((s) => s.clientId === clientId));
    setDeleteId(null);
    toast.success("Site deleted");
    deleteSiteFromBackend(id).catch((e) =>
      console.warn("[Sites] deleteSiteFromBackend failed:", e),
    );
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
        {canEdit && (
          <Button
            onClick={openAdd}
            style={{ backgroundColor: "#96BB1A", color: "#111" }}
            className="font-semibold"
            data-ocid="sites.primary_button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Site
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden overflow-x-auto">
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
                <TableHead className="whitespace-nowrap">Site Name</TableHead>
                <TableHead className="whitespace-nowrap">Site Code</TableHead>
                <TableHead className="whitespace-nowrap">
                  City / State
                </TableHead>
                <TableHead className="whitespace-nowrap">
                  Area (sq ft)
                </TableHead>
                <TableHead className="whitespace-nowrap">
                  Location Type
                </TableHead>
                <TableHead className="whitespace-nowrap">
                  Scheduled Date
                </TableHead>
                <TableHead className="whitespace-nowrap">
                  Assigned Auditor
                </TableHead>
                <TableHead className="whitespace-nowrap">Template</TableHead>
                <TableHead className="whitespace-nowrap">Audits</TableHead>
                <TableHead className="text-right whitespace-nowrap">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((site, idx) => (
                <TableRow key={site.id} data-ocid={`sites.item.${idx + 1}`}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {site.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {site.siteCode ?? "\u2014"}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {site.city && site.state
                      ? `${site.city}, ${site.state}`
                      : (site.city ?? site.state ?? "\u2014")}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {site.area !== undefined
                      ? site.area.toLocaleString()
                      : "\u2014"}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {site.locationType ?? "\u2014"}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDate(site.scheduledDate)}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {getUserName(site.assignedAuditorId)}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {getTemplateName(site.templateId)}
                  </TableCell>
                  <TableCell>{getAuditCount(site.id)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/questionnaire/${site.id}`)}
                        className="flex items-center gap-1 text-xs font-medium hover:opacity-80 transition-opacity"
                        style={{ color: "#96BB1A" }}
                        data-ocid={`sites.primary_button.${idx + 1}`}
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        Start Audit
                      </button>
                      {canEdit && (
                        <>
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
                        </>
                      )}
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
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          data-ocid="site.dialog"
        >
          <DialogHeader>
            <DialogTitle>{editSite ? "Edit Site" : "Add Site"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Site Name */}
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

            {/* Site Code */}
            <div className="space-y-1.5">
              <Label>Site Code</Label>
              <Input
                value={form.siteCode}
                onChange={(e) =>
                  setForm((f) => ({ ...f, siteCode: e.target.value }))
                }
                placeholder="e.g. ACM-WH-A"
                data-ocid="site.input"
              />
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label>Site Address</Label>
              <Input
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                placeholder="Street address"
                data-ocid="site.input"
              />
            </div>

            {/* City + District row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input
                  value={form.city}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, city: e.target.value }))
                  }
                  placeholder="e.g. Mumbai"
                  data-ocid="site.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>District</Label>
                <Input
                  value={form.district}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, district: e.target.value }))
                  }
                  placeholder="e.g. Andheri"
                  data-ocid="site.input"
                />
              </div>
            </div>

            {/* State */}
            <div className="space-y-1.5">
              <Label>State / UT</Label>
              <Select
                value={form.state}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, state: v === "__none__" ? "" : v }))
                }
              >
                <SelectTrigger data-ocid="site.select">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="__none__">— None —</SelectItem>
                  {INDIAN_STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Area */}
            <div className="space-y-1.5">
              <Label>Area (sq ft)</Label>
              <Input
                type="number"
                min="0"
                value={form.area}
                onChange={(e) =>
                  setForm((f) => ({ ...f, area: e.target.value }))
                }
                placeholder="e.g. 45000"
                data-ocid="site.input"
              />
            </div>

            {/* Type of Location */}
            <div className="space-y-1.5">
              <Label>Type of Location</Label>
              <Select
                value={form.locationType}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, locationType: v }))
                }
              >
                <SelectTrigger data-ocid="site.select">
                  <SelectValue placeholder="Select location type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Metro">Metro</SelectItem>
                  <SelectItem value="Urban">Urban</SelectItem>
                  <SelectItem value="Semi Urban">Semi Urban</SelectItem>
                  <SelectItem value="Rural">Rural</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Scheduled Date */}
            <div className="space-y-1.5">
              <Label>Scheduled Date</Label>
              <input
                type="date"
                value={form.scheduledDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, scheduledDate: e.target.value }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                data-ocid="site.input"
              />
            </div>

            {/* Assigned Auditor */}
            <div className="space-y-1.5">
              <Label>Assigned Auditor</Label>
              <Select
                value={form.assignedAuditorId}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    assignedAuditorId: v === "__none__" ? "" : v,
                  }))
                }
              >
                <SelectTrigger data-ocid="site.select">
                  <SelectValue placeholder="\u2014 None \u2014" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {auditors.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assigned Reviewer */}
            <div className="space-y-1.5">
              <Label>Assigned Reviewer</Label>
              <Select
                value={form.assignedReviewerId}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    assignedReviewerId: v === "__none__" ? "" : v,
                  }))
                }
              >
                <SelectTrigger data-ocid="site.select">
                  <SelectValue placeholder="\u2014 None \u2014" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {reviewers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assigned Manager */}
            <div className="space-y-1.5">
              <Label>Assigned Manager</Label>
              <Select
                value={form.assignedManagerId}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    assignedManagerId: v === "__none__" ? "" : v,
                  }))
                }
              >
                <SelectTrigger data-ocid="site.select">
                  <SelectValue placeholder="\u2014 None \u2014" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {managers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Template */}
            {canEdit && (
              <div className="space-y-1.5">
                <Label>Template</Label>
                <Select
                  value={form.templateId}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      templateId: v === "__none__" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger data-ocid="site.select">
                    <SelectValue placeholder="\u2014 None \u2014" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
