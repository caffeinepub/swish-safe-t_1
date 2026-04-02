import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Plus, Shield, UserCheck, UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";
import { USERS_KEY, getList, saveList } from "../lib/dataStore";
import type { AppUser } from "../types";

export function AdminPage() {
  const { user: currentUser, refresh } = useAuth();
  const [users, setUsers] = useState(() => getList<AppUser>(USERS_KEY));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "Auditor" as AppUser["role"],
    isEnabled: true,
  });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const openAdd = () => {
    setEditUser(null);
    setForm({ username: "", password: "", role: "Auditor", isEnabled: true });
    setDialogOpen(true);
  };

  const openEdit = (u: AppUser) => {
    setEditUser(u);
    setForm({
      username: u.username,
      password: "",
      role: u.role,
      isEnabled: u.isEnabled,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.username.trim()) return;
    const nowTs = Date.now();
    let updated: AppUser[];
    if (editUser) {
      updated = users.map((u) =>
        u.id === editUser.id
          ? {
              ...u,
              role: form.role,
              isEnabled: form.isEnabled,
              ...(form.password ? { passwordHash: btoa(form.password) } : {}),
              updatedAt: nowTs,
            }
          : u,
      );
    } else {
      if (!form.password) {
        toast.error("Password is required");
        return;
      }
      const newUser: AppUser = {
        id: `user-${nowTs}`,
        username: form.username.trim(),
        passwordHash: btoa(form.password),
        role: form.role,
        isEnabled: form.isEnabled,
        createdAt: nowTs,
        updatedAt: nowTs,
      };
      updated = [...users, newUser];
    }
    saveList(USERS_KEY, updated);
    setUsers(updated);
    setDialogOpen(false);
    if (currentUser?.id === editUser?.id) refresh();
    toast.success(editUser ? "User updated" : "User added");
  };

  const toggleEnabled = (userId: string) => {
    const updated = users.map((u) =>
      u.id === userId
        ? { ...u, isEnabled: !u.isEnabled, updatedAt: Date.now() }
        : u,
    );
    saveList(USERS_KEY, updated);
    setUsers(updated);
    toast.success("User status updated");
  };

  const grantTempAdmin = (userId: string) => {
    const elevated = Date.now() + 86400000; // 24 hours
    const updated = users.map((u) =>
      u.id === userId
        ? { ...u, elevatedUntil: elevated, updatedAt: Date.now() }
        : u,
    );
    saveList(USERS_KEY, updated);
    setUsers(updated);
    toast.success("Temporary Admin granted for 24 hours");
  };

  const revokeTempAdmin = (userId: string) => {
    const updated = users.map((u) =>
      u.id === userId
        ? { ...u, elevatedUntil: undefined, updatedAt: Date.now() }
        : u,
    );
    saveList(USERS_KEY, updated);
    setUsers(updated);
    toast.success("Temporary Admin revoked");
  };

  const getCountdown = (elevatedUntil: number): string => {
    const remaining = elevatedUntil - now;
    if (remaining <= 0) return "Expired";
    const hours = Math.floor(remaining / 3600000);
    const mins = Math.floor((remaining % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground">
            {users.length} user{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={openAdd}
          style={{ backgroundColor: "#96BB1A", color: "#111" }}
          className="font-semibold"
          data-ocid="admin.primary_button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Temp Admin</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u, idx) => (
              <TableRow key={u.id} data-ocid={`admin.item.${idx + 1}`}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: "#96BB1A" }}
                    >
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    {u.username}
                    {u.id === currentUser?.id && (
                      <span className="text-xs text-muted-foreground">
                        (you)
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={u.role === "Admin" ? "default" : "secondary"}>
                    {u.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={u.isEnabled}
                      onCheckedChange={() => toggleEnabled(u.id)}
                      data-ocid={`admin.switch.${idx + 1}`}
                    />
                    <span
                      className={`text-xs ${u.isEnabled ? "text-green-600" : "text-muted-foreground"}`}
                    >
                      {u.isEnabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {u.elevatedUntil && u.elevatedUntil > now ? (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">
                        TEMP ADMIN — {getCountdown(u.elevatedUntil)}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => revokeTempAdmin(u.id)}
                        className="text-xs text-destructive hover:underline"
                        data-ocid={`admin.delete_button.${idx + 1}`}
                      >
                        Revoke
                      </button>
                    </div>
                  ) : (
                    u.role !== "Admin" && (
                      <button
                        type="button"
                        onClick={() => grantTempAdmin(u.id)}
                        className="flex items-center gap-1 text-xs font-medium hover:underline"
                        style={{ color: "#96BB1A" }}
                        data-ocid={`admin.secondary_button.${idx + 1}`}
                      >
                        <Shield className="w-3.5 h-3.5" />
                        Grant 24h Admin
                      </button>
                    )
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => openEdit(u)}
                      className="flex items-center gap-1 text-xs font-medium hover:text-primary transition-colors"
                      style={{ color: "#96BB1A" }}
                      data-ocid={`admin.edit_button.${idx + 1}`}
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="admin_user.dialog">
          <DialogHeader>
            <DialogTitle>{editUser ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Username *</Label>
              <Input
                value={form.username}
                onChange={(e) =>
                  setForm((f) => ({ ...f, username: e.target.value }))
                }
                disabled={!!editUser}
                data-ocid="admin_user.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                {editUser ? "New Password (leave blank to keep)" : "Password *"}
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                placeholder={editUser ? "Leave blank to keep current" : ""}
                data-ocid="admin_user.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, role: v as AppUser["role"] }))
                }
              >
                <SelectTrigger data-ocid="admin_user.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Reviewer">Reviewer</SelectItem>
                  <SelectItem value="Auditor">Auditor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isEnabled}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, isEnabled: v }))
                }
                data-ocid="admin_user.switch"
              />
              <Label>Account enabled</Label>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1"
                data-ocid="admin_user.cancel_button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                style={{ backgroundColor: "#96BB1A", color: "#111" }}
                className="flex-1 font-semibold"
                data-ocid="admin_user.save_button"
              >
                {editUser ? "Update" : "Add User"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
