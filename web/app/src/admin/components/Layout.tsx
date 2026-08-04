import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  TerminalSquare,
  BookOpenText,
  ShieldCheck,
  HelpCircle,
  Workflow,
  Languages,
  LogOut,
} from "lucide-react";
import {
  clearSession,
  getEffectiveKnowledgeRole,
  getStoredUser,
} from "../../lib/auth";
import { can, canAutomation, roleLabel } from "../lib/permissions";

function linkClass(isActive: boolean) {
  return `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive
      ? "bg-brand-50 text-brand-700"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;
}

function initials(label: string) {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function Layout() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const role = getEffectiveKnowledgeRole(user);

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: true },
    {
      to: "/knowledge",
      label: "Fuente de conocimiento",
      icon: BookOpenText,
      show: true,
    },
    {
      to: "/knowledge/audit",
      label: "Auditoría",
      icon: ShieldCheck,
      show: can("view_audit"),
    },
    {
      to: "/knowledge/unanswered",
      label: "Preguntas sin respuesta",
      icon: HelpCircle,
      show: can("supervise_tools"),
    },
    {
      to: "/automation",
      label: "Automatización",
      icon: Workflow,
      show: canAutomation("view_process"),
    },
    {
      to: "/translations/cache",
      label: "Cache de traducciones",
      icon: Languages,
      show: user?.role === "ADMIN",
    },
    {
      to: "/admin-dev",
      label: "Admin Dev",
      icon: TerminalSquare,
      show: user?.role === "ADMIN",
    },
  ].filter((item) => item.show);

  function handleLogout() {
    clearSession();
    navigate("/login");
  }

  const displayName = user?.name ?? user?.email ?? "";

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-6">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            O
          </div>
          <div>
            <div className="text-sm font-bold leading-tight text-slate-800">
              Centro de Conocimiento
            </div>
          </div>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => item.to === "/admin-dev" ? (
            <a key={item.to} href={item.to} className={linkClass(false)}>
              <item.icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              {item.label}
            </a>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/knowledge" || item.to === "/automation"}
              className={({ isActive }) => linkClass(isActive)}
            >
              <item.icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="text-sm text-slate-500">
            Gateway: <span className="font-medium text-slate-700">ACoreAI AI</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
              {initials(displayName) || "?"}
            </div>
            <div className="leading-tight">
              <div className="font-medium text-slate-700">{displayName}</div>
              <div className="text-xs text-slate-400">{roleLabel(role)}</div>
            </div>
            <button
              onClick={handleLogout}
              className="ml-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
