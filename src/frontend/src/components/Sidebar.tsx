import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Shield,
  Users,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

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
  {
    to: "/templates",
    label: "Templates",
    icon: FileText,
    roles: ["Admin", "Manager"],
  },
  { to: "/admin", label: "Admin", icon: Shield, roles: ["Admin", "Manager"] },
];

export function Sidebar() {
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
      className="flex flex-col w-[240px] min-h-screen flex-shrink-0"
      style={{ backgroundColor: "#5F6368" }}
    >
      {/* Logo */}
      <div className="flex items-center justify-center px-4 py-5 border-b border-white/10">
        <img
          src="/assets/generated/swish-safet-logo-transparent.dim_400x120.png"
          alt="SWiSH SAFE-T"
          className="h-10 object-contain"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            data-ocid={`nav.${item.label.toLowerCase().replace(/\s+/g, "-")}.link`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive ? "nav-active" : "nav-inactive"
              }`
            }
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="px-3 pb-4 border-t border-white/10 pt-3">
        {user && (
          <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg bg-white/5">
            <div className="w-8 h-8 rounded-full bg-brand-green flex items-center justify-center text-xs font-bold text-brand-dark flex-shrink-0">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white truncate">
                {user.username}
              </div>
              <div className="text-xs text-white/60">{user.role}</div>
            </div>
            {user.elevatedUntil && user.elevatedUntil > Date.now() && (
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
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm nav-inactive transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
