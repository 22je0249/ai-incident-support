import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Search, Filter, RefreshCw, ArrowUpRight } from "lucide-react";
import { incidentsApi } from "../api/client";
import { Incident, IncidentStatus, Severity } from "@aiops/types";
import { format, parseISO, formatDistanceToNow } from "date-fns";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "analyzing", label: "Analyzing" },
  { value: "resolved", label: "Resolved" },
  { value: "pr_created", label: "PR Created" },
  { value: "rejected", label: "Rejected" },
];

function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`badge badge-${severity} capitalize`}>{severity}</span>;
}

function StatusBadge({ status }: { status: IncidentStatus }) {
  const labels: Record<string, string> = {
    open: "Open", analyzing: "Analyzing…", resolved: "Resolved",
    rejected: "Rejected", pr_created: "PR Created",
  };
  return <span className={`badge badge-${status}`}>{labels[status] || status}</span>;
}

function ConfidenceBar({ value }: { value?: number }) {
  if (value === undefined) return <span className="text-[#475569] text-xs">N/A</span>;
  const color = value >= 85 ? "#10b981" : value >= 65 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-[#1f2937]">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs font-medium" style={{ color }}>{value}%</span>
    </div>
  );
}

export default function IncidentsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["incidents", statusFilter],
    queryFn: () => incidentsApi.list({ status: statusFilter || undefined }),
    refetchInterval: 30_000,
  });

  const incidents: Incident[] = data?.data || [];

  const filtered = incidents.filter((i) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      i.title?.toLowerCase().includes(q) ||
      i.repositoryName?.toLowerCase().includes(q) ||
      i.rootCause?.toLowerCase().includes(q) ||
      i.errorType?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            <span className="gradient-text">Incidents</span>
          </h1>
          <p className="text-sm text-[#64748b] mt-1">
            {filtered.length} incident{filtered.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <button onClick={() => refetch()} className="btn btn-secondary">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="card flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
          <input
            type="text"
            placeholder="Search incidents, repositories, error types…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
            id="incident-search"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#475569]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-44"
            id="status-filter"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1f2937]">
              {["Incident", "Repository", "Severity", "Risk", "Status", "Confidence", "Time", ""].map((h) => (
                <th key={h} className="table-cell text-left text-xs font-semibold uppercase tracking-wider text-[#475569]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && [...Array(5)].map((_, i) => (
              <tr key={i}>
                {[...Array(8)].map((_, j) => (
                  <td key={j} className="table-cell">
                    <div className="skeleton h-4 rounded w-full" />
                  </td>
                ))}
              </tr>
            ))}
            {!isLoading && filtered.map((incident) => (
              <tr
                key={incident.id}
                className="table-row"
                onClick={() => navigate(`/incidents/${incident.id}`)}
              >
                <td className="table-cell max-w-xs">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${
                      incident.severity === "high" || incident.severity === "critical"
                        ? "text-red-400"
                        : incident.severity === "medium"
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-white line-clamp-1">{incident.title}</p>
                      {incident.rootCause && (
                        <p className="text-xs text-[#64748b] mt-0.5 line-clamp-1">{incident.rootCause}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="table-cell">
                  <code className="text-xs text-purple-300 font-mono">{incident.repositoryName}</code>
                </td>
                <td className="table-cell">
                  <SeverityBadge severity={incident.severity} />
                </td>
                <td className="table-cell">
                  {incident.riskLevel ? (
                    <span className={`badge badge-${incident.riskLevel}`}>{incident.riskLevel}</span>
                  ) : (
                    <span className="text-[#475569] text-xs">—</span>
                  )}
                </td>
                <td className="table-cell">
                  <StatusBadge status={incident.status} />
                </td>
                <td className="table-cell">
                  <ConfidenceBar value={incident.confidence} />
                </td>
                <td className="table-cell">
                  <span className="text-xs text-[#64748b]">
                    {formatDistanceToNow(parseISO(incident.createdAt), { addSuffix: true })}
                  </span>
                </td>
                <td className="table-cell">
                  <ArrowUpRight className="w-4 h-4 text-[#475569] group-hover:text-purple-400" />
                </td>
              </tr>
            ))}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="table-cell text-center py-16 text-[#475569]">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No incidents found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
