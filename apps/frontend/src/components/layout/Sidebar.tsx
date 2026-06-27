import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, AlertTriangle, BookOpen, GitBranch,
  Settings, Zap, LogOut, ChevronRight, Activity
} from "lucide-react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/incidents", icon: AlertTriangle, label: "Incidents" },
  { to: "/knowledge", icon: BookOpen, label: "Knowledge Base" },
  { to: "/repositories", icon: GitBranch, label: "Repositories" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 bg-[#0e1320] border-r border-[#1f2937] flex flex-col h-screen sticky top-0">
      {/* ── Logo ──────────────────────────────────────────────────── */}
      <div className="px-6 py-5 border-b border-[#1f2937]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center shadow-lg shadow-purple-900/30">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">AIOps Copilot</h1>
            <p className="text-[10px] text-purple-400 font-medium tracking-wide uppercase">Incident Response</p>
          </div>
        </div>
      </div>

      {/* ── Live Indicator ─────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-[#1f2937]">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="pulse-dot">
            <span className="bg-emerald-400" />
            <span className="dot-inner bg-emerald-400" />
          </div>
          <span className="text-xs text-emerald-400 font-medium">System Online</span>
          <Activity className="w-3 h-3 text-emerald-400 ml-auto" />
        </div>
      </div>

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#475569]">
          Navigation
        </p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `nav-link ${isActive ? "active" : ""}`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </NavLink>
        ))}
      </nav>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <div className="px-3 py-4 border-t border-[#1f2937]">
        <button
          onClick={() => {
            localStorage.removeItem("aiops_token");
            window.location.href = "/login";
          }}
          className="nav-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
        <p className="mt-3 px-3 text-[10px] text-[#374151] text-center">
          Powered by Groq · AWS Lambda
        </p>
      </div>
    </aside>
  );
}
