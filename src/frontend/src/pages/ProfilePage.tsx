import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Edit2, Save, X } from "lucide-react";
import { useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { IndiaMap } from "../components/IndiaMap";
import { useAuth } from "../hooks/useAuth";
import { pushUserToBackend } from "../lib/backendUserService";
import {
  AUDITS_KEY,
  CLIENTS_KEY,
  SITES_KEY,
  USERS_KEY,
  getList,
  saveList,
} from "../lib/dataStore";
import type { AppUser, Audit, Client, Site } from "../types";

const ROLE_COLORS: Record<string, string> = {
  Admin: "bg-purple-100 text-purple-800",
  Manager: "bg-blue-100 text-blue-800",
  Reviewer: "bg-yellow-100 text-yellow-800",
  Auditor: "bg-green-100 text-green-800",
};

const CHART_COLORS = [
  "#96BB1A",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

function monthLabel(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString("default", { month: "short", year: "numeric" });
}

function monthKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function ProfilePage() {
  const { user: currentUser } = useAuth();
  const [allUsers, setAllUsers] = useState<AppUser[]>(() =>
    getList<AppUser>(USERS_KEY),
  );
  const [selectedUserId, setSelectedUserId] = useState<string>(
    currentUser?.id ?? "",
  );
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    department: "",
    contactDetails: "",
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const sites = getList<Site>(SITES_KEY);
  const clients = getList<Client>(CLIENTS_KEY);
  const audits = getList<Audit>(AUDITS_KEY);

  // RBAC: who can view whom
  const viewableUsers = (() => {
    if (!currentUser) return [];
    if (currentUser.role === "Admin") return allUsers;
    if (currentUser.role === "Manager")
      return allUsers.filter((u) => u.role === "Reviewer");
    return allUsers.filter((u) => u.id === currentUser.id);
  })();

  const selectedUser =
    allUsers.find((u) => u.id === selectedUserId) ??
    allUsers.find((u) => u.id === currentUser?.id);
  const isOwnProfile = selectedUser?.id === currentUser?.id;

  // Performance data — audits assigned to this user via site assignment
  const userSiteIds = new Set(
    sites
      .filter(
        (s) =>
          s.assignedAuditorId === selectedUser?.id ||
          s.assignedReviewerId === selectedUser?.id ||
          s.assignedManagerId === selectedUser?.id,
      )
      .map((s) => s.id),
  );

  const userAudits = audits.filter((a) => userSiteIds.has(a.siteId));
  const completedAudits = userAudits.filter((a) => a.status === "Completed");

  const getClientName = (siteId: string) => {
    const site = sites.find((s) => s.id === siteId);
    if (!site) return "Unknown";
    return clients.find((c) => c.id === site.clientId)?.name ?? "Unknown";
  };

  // Metric 1: audits completed per month per client
  const metric1 = (() => {
    const map: Record<string, Record<string, number>> = {};
    const clientSet = new Set<string>();
    for (const a of completedAudits) {
      const ts = a.completedAt ?? a.updatedAt;
      const mk = monthKey(ts);
      const client = getClientName(a.siteId);
      clientSet.add(client);
      if (!map[mk]) map[mk] = {};
      map[mk][client] = (map[mk][client] ?? 0) + 1;
    }
    const months = Object.keys(map).sort();
    const clientList = Array.from(clientSet);
    const chartData = months.map((mk) => {
      const row: Record<string, string | number> = {
        month: monthLabel(new Date(`${mk}-01`).getTime()),
      };
      for (const c of clientList) row[c] = map[mk][c] ?? 0;
      return row;
    });
    const tableData = months.flatMap((mk) =>
      Object.entries(map[mk]).map(([client, count]) => ({
        month: monthLabel(new Date(`${mk}-01`).getTime()),
        client,
        count,
      })),
    );
    return { chartData, clients: clientList, tableData };
  })();

  // Metric 2: area per month per client
  const metric2 = (() => {
    const map: Record<string, Record<string, number>> = {};
    const clientSet = new Set<string>();
    for (const a of completedAudits) {
      const site = sites.find((s) => s.id === a.siteId);
      if (!site?.area) continue;
      const ts = a.completedAt ?? a.updatedAt;
      const mk = monthKey(ts);
      const client = getClientName(a.siteId);
      clientSet.add(client);
      if (!map[mk]) map[mk] = {};
      map[mk][client] = (map[mk][client] ?? 0) + site.area;
    }
    const months = Object.keys(map).sort();
    const clientList = Array.from(clientSet);
    const chartData = months.map((mk) => {
      const row: Record<string, string | number> = {
        month: monthLabel(new Date(`${mk}-01`).getTime()),
      };
      for (const c of clientList) row[c] = map[mk][c] ?? 0;
      return row;
    });
    const tableData = months.flatMap((mk) =>
      Object.entries(map[mk]).map(([client, area]) => ({
        month: monthLabel(new Date(`${mk}-01`).getTime()),
        client,
        area: Math.round(area),
      })),
    );
    return { chartData, clients: clientList, tableData };
  })();

  // Metric 3: state-wise audits
  const metric3 = (() => {
    const stateCounts: Record<string, number> = {};
    for (const a of userAudits) {
      const site = sites.find((s) => s.id === a.siteId);
      if (!site?.state) continue;
      stateCounts[site.state] = (stateCounts[site.state] ?? 0) + 1;
    }
    const tableData = Object.entries(stateCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([state, count]) => ({ state, count }));
    return { stateCounts, tableData };
  })();

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUser) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      const users = getList<AppUser>(USERS_KEY);
      const updated = users.map((u) =>
        u.id === selectedUser.id
          ? { ...u, profilePictureUrl: url, updatedAt: Date.now() }
          : u,
      );
      saveList(USERS_KEY, updated);
      setAllUsers(updated);
      toast.success("Profile photo updated");
      const savedUser = updated.find((u) => u.id === selectedUser.id);
      if (savedUser) {
        pushUserToBackend(savedUser).catch((e) =>
          console.warn("[Profile] pushUserToBackend failed:", e),
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const startEdit = () => {
    setEditForm({
      name: selectedUser?.name ?? "",
      department: selectedUser?.department ?? "",
      contactDetails: selectedUser?.contactDetails ?? "",
    });
    setEditing(true);
  };

  const saveEdit = () => {
    if (!selectedUser) return;
    const users = getList<AppUser>(USERS_KEY);
    const updated = users.map((u) =>
      u.id === selectedUser.id
        ? {
            ...u,
            name: editForm.name || u.name,
            department: editForm.department || u.department,
            contactDetails: editForm.contactDetails || u.contactDetails,
            updatedAt: Date.now(),
          }
        : u,
    );
    saveList(USERS_KEY, updated);
    setAllUsers(updated);
    setEditing(false);
    toast.success("Profile updated");
    const savedUser = updated.find((u) => u.id === selectedUser.id);
    if (savedUser) {
      pushUserToBackend(savedUser).catch((e) =>
        console.warn("[Profile] pushUserToBackend failed:", e),
      );
    }
  };

  if (!currentUser || !selectedUser) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
          <p className="text-sm text-muted-foreground">
            Employee information and performance dashboard
          </p>
        </div>
        {(currentUser.role === "Admin" || currentUser.role === "Manager") &&
          viewableUsers.length > 1 && (
            <div className="w-64">
              <Select
                value={selectedUserId}
                onValueChange={(v) => {
                  setSelectedUserId(v);
                  setEditing(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {viewableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.username} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Employee Info Card */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Employee Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={selectedUser.profilePictureUrl} />
                    <AvatarFallback
                      className="text-2xl font-bold text-white"
                      style={{ backgroundColor: "#96BB1A" }}
                    >
                      {(selectedUser.name ?? selectedUser.username)
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isOwnProfile && (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="absolute -bottom-1 -right-1 bg-white border border-gray-200 rounded-full p-1.5 shadow hover:bg-gray-50 transition-colors"
                      title="Upload photo"
                    >
                      <Camera className="w-3 h-3 text-gray-600" />
                    </button>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground">
                    {selectedUser.name ?? selectedUser.username}
                  </p>
                  <Badge
                    variant="secondary"
                    className={`text-xs mt-1 ${
                      ROLE_COLORS[selectedUser.role] ?? ""
                    }`}
                  >
                    {selectedUser.role}
                  </Badge>
                </div>
              </div>

              {/* Edit form or info display */}
              {editing && isOwnProfile ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="Full name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Department</Label>
                    <Input
                      value={editForm.department}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          department: e.target.value,
                        }))
                      }
                      placeholder="Department"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Contact Details</Label>
                    <Input
                      value={editForm.contactDetails}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          contactDetails: e.target.value,
                        }))
                      }
                      placeholder="Phone / email"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={saveEdit}
                      style={{ background: "#96BB1A", color: "#111" }}
                      className="flex-1 font-semibold"
                    >
                      <Save className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(false)}
                      className="flex-1"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <InfoRow label="Username" value={selectedUser.username} />
                  <InfoRow
                    label="Employee ID"
                    value={selectedUser.employeeId}
                  />
                  <InfoRow label="Department" value={selectedUser.department} />
                  <InfoRow
                    label="Contact"
                    value={selectedUser.contactDetails}
                  />
                  {isOwnProfile && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={startEdit}
                      className="w-full mt-3"
                    >
                      <Edit2 className="w-3 h-3 mr-1.5" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Performance Dashboard */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="audits">
            <TabsList className="mb-4">
              <TabsTrigger value="audits">Audits / Month</TabsTrigger>
              <TabsTrigger value="area">Area / Month</TabsTrigger>
              <TabsTrigger value="states">State-wise</TabsTrigger>
            </TabsList>

            {/* Metric 1 */}
            <TabsContent value="audits">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Audits Completed per Month, per Client
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {metric1.chartData.length === 0 ? (
                    <EmptyMetric text="No completed audits found" />
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={metric1.chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          {metric1.clients.map((c, i) => (
                            <Bar
                              key={c}
                              dataKey={c}
                              fill={CHART_COLORS[i % CHART_COLORS.length]}
                              radius={[3, 3, 0, 0]}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                      <Table className="mt-4 text-xs">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Month</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Audits</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {metric1.tableData.map((row) => (
                            <TableRow key={`${row.month}-${row.client}-area`}>
                              <TableCell>{row.month}</TableCell>
                              <TableCell>{row.client}</TableCell>
                              <TableCell className="font-medium">
                                {row.count}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Metric 2 */}
            <TabsContent value="area">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Area (sq ft) Covered per Month, per Client
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {metric2.chartData.length === 0 ? (
                    <EmptyMetric text="No area data for completed audits" />
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={metric2.chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          {metric2.clients.map((c, i) => (
                            <Line
                              key={c}
                              type="monotone"
                              dataKey={c}
                              stroke={CHART_COLORS[i % CHART_COLORS.length]}
                              strokeWidth={2}
                              dot={{ r: 4 }}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                      <Table className="mt-4 text-xs">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Month</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Area (sq ft)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {metric2.tableData.map((row) => (
                            <TableRow key={`${row.month}-${row.client}-area`}>
                              <TableCell>{row.month}</TableCell>
                              <TableCell>{row.client}</TableCell>
                              <TableCell className="font-medium">
                                {row.area.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Metric 3 */}
            <TabsContent value="states">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    State-wise Audits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(metric3.stateCounts).length === 0 ? (
                    <EmptyMetric text="No audit data by state yet" />
                  ) : (
                    <>
                      <IndiaMap stateCounts={metric3.stateCounts} />
                      {metric3.tableData.length > 0 && (
                        <Table className="mt-4 text-xs">
                          <TableHeader>
                            <TableRow>
                              <TableHead>State</TableHead>
                              <TableHead>Audits</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {metric3.tableData.map((row) => (
                              <TableRow key={row.state}>
                                <TableCell>{row.state}</TableCell>
                                <TableCell className="font-medium">
                                  {row.count}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right truncate">{value ?? "—"}</span>
    </div>
  );
}

function EmptyMetric({ text }: { text: string }) {
  return (
    <div className="py-12 text-center text-muted-foreground text-sm">
      {text}
    </div>
  );
}
