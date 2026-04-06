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
import { Edit, KeyRound, Plus, Shield, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SyncButton } from "../components/SyncButton";
import { useAuth } from "../hooks/useAuth";
import {
  deleteUserFromBackend,
  pushUserToBackend,
} from "../lib/backendUserService";
import { USERS_KEY, getList, saveList } from "../lib/dataStore";
import type { AppUser } from "../types";

export function AdminPage() {
  const { user: currentUser, refresh } = useAuth();
  const [users, setUsers] = useState(() => getList<AppUser>(USERS_KEY));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<AppUser | null>(
    null,
  );
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "Auditor" as AppUser["role"],
    isEnabled: true,
    employeeId: "",
    name: "",
  });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handler = () => {
      setUsers(getList<AppUser>(USERS_KEY));
    };
    window.addEventListener("swish-sync", handler);
    return () => window.removeEventListener("swish-sync", handler);
  }, []);

  const openAdd = () => {
    setEditUser(null);
    setForm({
      username: "",
      password: "",
      role: "Auditor",
      isEnabled: true,
      employeeId: "",
      name: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (u: AppUser) => {
    setEditUser(u);
    setForm({
      username: u.username,
      password: "",
      role: u.role,
      isEnabled: u.isEnabled,
      employeeId: u.employeeId ?? "",
      name: u.name ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.username.trim()) return;
    const nowTs = Date.now();
    let updated: AppUser[];
    let savedUser: AppUser | null = null;
    if (editUser) {
      updated = users.map((u) => {
        if (u.id !== editUser.id) return u;
        const next: AppUser = {
          ...u,
          role: form.role,
          isEnabled: form.isEnabled,
          employeeId: form.employeeId.trim() || u.employeeId,
          name: form.name.trim() || u.name,
          ...(form.password ? { passwordHash: btoa(form.password) } : {}),
          updatedAt: nowTs,
        };
        savedUser = next;
        return next;
      });
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
        employeeId: form.employeeId.trim() || undefined,
        name: form.name.trim() || undefined,
        createdAt: nowTs,
        updatedAt: nowTs,
      };
      updated = [...users, newUser];
      savedUser = newUser;
    }
    saveList(USERS_KEY, updated);
    setUsers(updated);
    setDialogOpen(false);
    if (currentUser?.id === editUser?.id) refresh();
    toast.success(editUser ? "User updated" : "User added");
    if (savedUser) {
      pushUserToBackend(savedUser).catch((e) =>
        console.warn("[Admin] pushUserToBackend failed:", e),
      );
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmUser) return;
    const targetId = deleteConfirmUser.id;
    setDeleteConfirmUser(null);
    const updated = users.filter((u) => u.id !== targetId);
    saveList(USERS_KEY, updated);
    setUsers(updated);
    toast.success("User deleted");
    deleteUserFromBackend(targetId).catch((e) =>
      console.warn("[Admin] deleteUserFromBackend failed:", e),
    );
  };

  const toggleEnabled = (userId: string) => {
    let changedUser: AppUser | null = null;
    const updated = users.map((u) => {
      if (u.id !== userId) return u;
      const next = { ...u, isEnabled: !u.isEnabled, updatedAt: Date.now() };
      changedUser = next;
      return next;
    });
    saveList(USERS_KEY, updated);
    setUsers(updated);
    toast.success("User status updated");
    if (changedUser) {
      pushUserToBackend(changedUser).catch((e) =>
        console.warn("[Admin] pushUserToBackend failed:", e),
      );
    }
  };

  const grantTempAdmin = (userId: string) => {
    const elevated = Date.now() + 86400000;
    let changedUser: AppUser | null = null;
    const updated = users.map((u) => {
      if (u.id !== userId) return u;
      const next = { ...u, elevatedUntil: elevated, updatedAt: Date.now() };
      changedUser = next;
      return next;
    });
    saveList(USERS_KEY, updated);
    setUsers(updated);
    toast.success("Temporary Admin granted for 24 hours");
    if (changedUser) {
      pushUserToBackend(changedUser).catch((e) =>
        console.warn("[Admin] pushUserToBackend failed:", e),
      );
    }
  };

  const revokeTempAdmin = (userId: string) => {
    let changedUser: AppUser | null = null;
    const updated = users.map((u) => {
      if (u.id !== userId) return u;
      const next = { ...u, elevatedUntil: undefined, updatedAt: Date.now() };
      changedUser = next;
      return next;
    });
    saveList(USERS_KEY, updated);
    setUsers(updated);
    toast.success("Temporary Admin revoked");
    if (changedUser) {
      pushUserToBackend(changedUser).catch((e) =>
        console.warn("[Admin] pushUserToBackend failed:", e),
      );
    }
  };

  const handleResetPassword = (userId: string) => {
    const newPassword = window.prompt("Enter new password for this user:");
    if (newPassword === null || newPassword.trim() === "") return;
    let changedUser: AppUser | null = null;
    const updated = users.map((u) => {
      if (u.id !== userId) return u;
      const next = {
        ...u,
        passwordHash: btoa(newPassword.trim()),
        updatedAt: Date.now(),
      };
      changedUser = next;
      return next;
    });
    saveList(USERS_KEY, updated);
    setUsers(updated);
    toast.success("Password reset successfully");
    if (changedUser) {
      pushUserToBackend(changedUser).catch((e) =>
        console.warn("[Admin] pushUserToBackend (reset pw) failed:", e),
      );
    }
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
        <div className="flex items-center gap-2">
          <SyncButton />
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
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Employee ID</TableHead>
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
                    <div>
                      <div className="flex items-center gap-1.5">
                        {u.username}
                        {u.id === currentUser?.id && (
                          <span className="text-xs text-muted-foreground">
                            (you)
                          </span>
                        )}
                      </div>
                      {u.name && (
                        <div className="text-xs text-muted-foreground">
                          {u.name}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {u.employeeId ?? "\u2014"}
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
                      className={`text-xs ${
                        u.isEnabled ? "text-green-600" : "text-muted-foreground"
                      }`}
                    >
                      {u.isEnabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {u.elevatedUntil && u.elevatedUntil > now ? (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">
                        TEMP ADMIN &mdash; {getCountdown(u.elevatedUntil)}
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
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => handleResetPassword(u.id)}
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      title="Reset password"
                      data-ocid={`admin.edit_button.${idx + 1}`}
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Reset PW
                    </button>
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
                    {u.id !== currentUser?.id && (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmUser(u)}
                        className="flex items-center gap-1 text-xs font-medium text-destructive hover:text-red-700 transition-colors"
                        title="Delete user"
                        data-ocid={`admin.delete_button.${idx + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    )}
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Employee ID</Label>
                <Input
                  value={form.employeeId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, employeeId: e.target.value }))
                  }
                  placeholder="e.g. EMP-005"
                  data-ocid="admin_user.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Full name"
                  data-ocid="admin_user.input"
                />
              </div>
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmUser}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmUser(null);
        }}
      >
        <DialogContent data-ocid="admin_delete.dialog">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to permanently delete{" "}
              <span className="font-semibold text-foreground">
                {deleteConfirmUser?.username}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmUser(null)}
                className="flex-1"
                data-ocid="admin_delete.cancel_button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                variant="destructive"
                className="flex-1 font-semibold"
                data-ocid="admin_delete.confirm_button"
              >
                Delete User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
