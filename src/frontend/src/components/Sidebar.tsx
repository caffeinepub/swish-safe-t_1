import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CloudOff,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  Shield,
  User,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  type SyncStatus,
  getSyncStatus,
  subscribeSyncStatus,
} from "../lib/backendSync";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ("Admin" | "Manager" | "Reviewer" | "Auditor")[];
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/tasks", label: "Tasks", icon: ClipboardList },
  { to: "/profile", label: "Profile", icon: User },
  {
    to: "/templates",
    label: "Templates",
    icon: FileText,
    roles: ["Admin", "Manager"],
  },
  { to: "/admin", label: "Admin", icon: Shield, roles: ["Admin", "Manager"] },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

function SyncIndicator({ collapsed }: { collapsed: boolean }) {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus);

  useEffect(() => {
    return subscribeSyncStatus(setStatus);
  }, []);

  if (status === "idle") return null;

  const icon = (() => {
    if (status === "syncing")
      return <Loader2 className="w-3 h-3 animate-spin" />;
    if (status === "offline") return <CloudOff className="w-3 h-3" />;
    if (status === "error") return <AlertCircle className="w-3 h-3" />;
    return <CheckCircle2 className="w-3 h-3" />;
  })();

  const label = (() => {
    if (status === "syncing") return "Syncing...";
    if (status === "offline") return "Offline";
    if (status === "error") return "Sync error";
    return "Synced";
  })();

  const color = (() => {
    if (status === "syncing") return "rgba(150,187,26,0.9)";
    if (status === "offline") return "rgba(255,200,50,0.9)";
    if (status === "error") return "rgba(255,100,100,0.9)";
    return "rgba(47,174,91,0.9)";
  })();

  return (
    <div
      className="flex items-center gap-1.5 rounded-md px-2 py-1 mx-1 mb-1 text-xs font-medium"
      style={{ backgroundColor: "rgba(0,0,0,0.2)", color }}
      title={label}
    >
      {icon}
      {!collapsed && <span className="truncate">{label}</span>}
    </div>
  );
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    return hasRole(...item.roles);
  });

  return (
    <aside
      className="flex flex-col min-h-screen flex-shrink-0 transition-all duration-200 relative"
      style={{
        backgroundColor: "#5F6368",
        width: collapsed ? "60px" : "240px",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center border-b border-white/10 overflow-hidden transition-all duration-200"
        style={{
          justifyContent: "center",
          padding: collapsed ? "12px 0" : "16px 12px",
          minHeight: "64px",
        }}
      >
        {!collapsed && (
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "8px",
              padding: "4px",
              display: "inline-flex",
            }}
          >
            <img
              src="/assets/safe_t_logo-019d5406-25c0-7178-967e-9ff0b95d2ae1.png"
              alt="SAFE-T"
              className="h-10 object-contain transition-opacity duration-150"
            />
          </div>
        )}
        {collapsed && (
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "8px",
              padding: "4px",
              display: "inline-flex",
            }}
          >
            <img
              src="/assets/safe_t_logo-019d5406-25c0-7178-967e-9ff0b95d2ae1.png"
              alt="SAFE-T"
              className="w-9 h-9 object-contain"
              title="SAFE-T"
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            data-ocid={`nav.${item.label.toLowerCase().replace(/\s+/g, "-")}.link`}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center rounded-lg text-sm font-medium transition-all ${
                collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
              } ${isActive ? "nav-active" : "nav-inactive"}`
            }
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Sync indicator */}
      <SyncIndicator collapsed={collapsed} />

      {/* User info + logout */}
      <div
        className="pb-4 border-t border-white/10 pt-3"
        style={{ padding: collapsed ? "12px 8px 16px" : "12px 12px 16px" }}
      >
        {user && (
          <div
            className="flex items-center rounded-lg bg-white/5 mb-2 overflow-hidden"
            style={{
              padding: collapsed ? "8px 0" : "8px 12px",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: collapsed ? "0" : "8px",
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: "#96BB1A", color: "#1a1a1a" }}
              title={collapsed ? `${user.username} (${user.role})` : undefined}
            >
              {user.username.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white truncate">
                  {user.username}
                </div>
                <div className="text-xs text-white/60">{user.role}</div>
              </div>
            )}
            {!collapsed &&
              user.elevatedUntil &&
              user.elevatedUntil > Date.now() && (
                <span className="text-xs bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded font-bold">
                  TEMP
                </span>
              )}
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          data-ocid="nav.logout.button"
          title={collapsed ? "Logout" : undefined}
          className={`flex items-center w-full rounded-lg text-sm nav-inactive transition-all ${
            collapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2"
          }`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* A Plus Automations branding */}
      <div
        className="border-t border-white/10 flex items-center overflow-hidden"
        style={{
          padding: collapsed ? "10px 0" : "10px 12px",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        {!collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <span className="text-white/40 text-xs">Powered by</span>
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "6px",
                padding: "4px",
                display: "inline-flex",
              }}
            >
              <img
                src="/assets/logo_aplus-019d58e0-df01-76da-bf58-862ddddba159.png"
                alt="A Plus Automations"
                className="h-7 object-contain opacity-80"
              />
            </div>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "6px",
              padding: "4px",
              display: "inline-flex",
            }}
          >
            <img
              src="/assets/logo_aplus-019d58e0-df01-76da-bf58-862ddddba159.png"
              alt="A Plus Automations"
              className="w-8 h-8 object-contain opacity-80"
              title="Powered by A Plus Automations"
            />
          </div>
        )}
      </div>

      {/* Toggle button */}
      <button
        type="button"
        onClick={onToggle}
        data-ocid="sidebar.toggle"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-[76px] w-6 h-6 rounded-full flex items-center justify-center shadow-md z-10 transition-colors duration-150"
        style={{
          backgroundColor: "#5F6368",
          border: "2px solid rgba(255,255,255,0.2)",
          color: "white",
        }}
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </aside>
  );
}
