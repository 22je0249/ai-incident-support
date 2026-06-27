import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, BookOpen, CheckCircle, Star, Tag } from "lucide-react";
import { knowledgeApi } from "../api/client";
import { KnowledgeEntry } from "@aiops/types";
import { format, parseISO } from "date-fns";

export default function KnowledgeBasePage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["knowledge"],
    queryFn: knowledgeApi.list,
    refetchInterval: 60_000,
  });

  const entries: KnowledgeEntry[] = data?.data || [];

  const filtered = entries.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.title?.toLowerCase().includes(q) ||
      e.rootCause?.toLowerCase().includes(q) ||
      e.resolution?.toLowerCase().includes(q) ||
      e.errorType?.toLowerCase().includes(q) ||
      e.technology?.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            <span className="gradient-text">Knowledge Base</span>
          </h1>
          <p className="text-sm text-[#64748b] mt-1">
            {entries.length} verified resolution{entries.length !== 1 ? "s" : ""} — self-learning from every incident
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <BookOpen className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-blue-300 font-medium">{entries.length} Entries</span>
        </div>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
          <input
            type="text"
            id="kb-search"
            placeholder="Search knowledge base (root causes, resolutions, tech stack)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 text-base"
          />
        </div>
      </div>

      {/* Entries Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading && [...Array(6)].map((_, i) => (
          <div key={i} className="skeleton h-48 rounded-xl" />
        ))}
        {!isLoading && filtered.map((entry) => (
          <div key={entry.id} className="card card-hover group animate-fade-in">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white text-sm line-clamp-2 group-hover:text-purple-300 transition-colors">
                  {entry.title}
                </h3>
                {entry.errorType && (
                  <span className="badge badge-analyzing text-[10px] mt-1">
                    {entry.errorType.replace(/_/g, " ")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {entry.verified && (
                  <div className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center" title="Verified">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                )}
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Star className="w-3 h-3 text-amber-400" />
                  <span className="text-xs text-amber-400 font-semibold">{entry.successCount}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#475569] font-semibold mb-1">
                  Root Cause
                </p>
                <p className="text-xs text-[#94a3b8] line-clamp-2">{entry.rootCause}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#475569] font-semibold mb-1">
                  Resolution
                </p>
                <p className="text-xs text-[#94a3b8] line-clamp-3">{entry.resolution}</p>
              </div>
            </div>

            {entry.technology && entry.technology.length > 0 && (
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <Tag className="w-3 h-3 text-[#475569]" />
                {entry.technology.map((t) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1f2937] text-[#64748b] border border-[#374151]">
                    {t}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#1f2937]">
              <span className="text-[10px] text-[#475569]">
                Added {format(parseISO(entry.createdAt), "MMM d, yyyy")}
              </span>
              <span className="text-[10px] text-emerald-400 font-medium">
                Used {entry.successCount} time{entry.successCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        ))}
        {!isLoading && filtered.length === 0 && (
          <div className="col-span-2 card flex items-center justify-center py-16">
            <div className="text-center">
              <BookOpen className="w-10 h-10 text-[#374151] mx-auto mb-3" />
              <p className="text-[#64748b]">
                {search ? "No entries match your search" : "No knowledge base entries yet"}
              </p>
              <p className="text-xs text-[#374151] mt-1">
                Entries are added automatically when incidents are resolved
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
