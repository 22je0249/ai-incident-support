import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, GitBranch, Trash2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { repositoriesApi } from "../api/client";
import { Repository } from "@aiops/types";
import { format, parseISO } from "date-fns";

export default function RepositoriesPage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ fullName: "", githubId: "", defaultBranch: "main", language: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["repositories"],
    queryFn: repositoriesApi.list,
    refetchInterval: 30_000,
  });

  const addMutation = useMutation({
    mutationFn: repositoriesApi.add,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
      setShowAdd(false);
      setForm({ fullName: "", githubId: "", defaultBranch: "main", language: "" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: repositoriesApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["repositories"] }),
  });

  const repos: Repository[] = (data?.data || []).filter((r: Repository) => r.monitored);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            <span className="gradient-text">Repositories</span>
          </h1>
          <p className="text-sm text-[#64748b] mt-1">
            {repos.length} repositor{repos.length !== 1 ? "ies" : "y"} being monitored
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="btn btn-primary"
          id="add-repo-btn"
        >
          <Plus className="w-4 h-4" />
          Add Repository
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card animate-fade-in">
          <h3 className="font-semibold text-white mb-4">Add Repository to Monitor</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-[#64748b] mb-1">Full Name (owner/repo) *</label>
              <input
                id="repo-fullname"
                placeholder="e.g. acme/my-service"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs text-[#64748b] mb-1">GitHub Repository ID *</label>
              <input
                id="repo-github-id"
                type="number"
                placeholder="e.g. 123456789"
                value={form.githubId}
                onChange={(e) => setForm({ ...form, githubId: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs text-[#64748b] mb-1">Default Branch</label>
              <input
                id="repo-branch"
                placeholder="main"
                value={form.defaultBranch}
                onChange={(e) => setForm({ ...form, defaultBranch: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs text-[#64748b] mb-1">Language (optional)</label>
              <input
                id="repo-language"
                placeholder="e.g. TypeScript"
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                className="input"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => addMutation.mutate({
                fullName: form.fullName,
                githubId: Number(form.githubId),
                defaultBranch: form.defaultBranch,
                language: form.language || undefined,
              })}
              disabled={!form.fullName || !form.githubId || addMutation.isPending}
              className="btn btn-primary"
            >
              {addMutation.isPending ? "Adding…" : "Add Repository"}
            </button>
            <button onClick={() => setShowAdd(false)} className="btn btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Repo Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading && [...Array(3)].map((_, i) => (
          <div key={i} className="skeleton h-40 rounded-xl" />
        ))}
        {!isLoading && repos.map((repo) => (
          <div key={repo.id} className="card card-hover group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 flex items-center justify-center">
                <GitBranch className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] text-emerald-400 font-medium">Monitored</span>
                </div>
                <button
                  onClick={() => removeMutation.mutate(repo.id)}
                  disabled={removeMutation.isPending}
                  className="opacity-0 group-hover:opacity-100 transition-opacity btn btn-ghost p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  id={`remove-repo-${repo.id}`}
                  title="Remove from monitoring"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <h3 className="font-semibold text-white text-sm mb-1">
              {repo.fullName}
            </h3>

            <div className="space-y-2 mt-3">
              {[
                { label: "Branch", value: repo.defaultBranch },
                { label: "Language", value: repo.language || "Unknown" },
                { label: "Added", value: format(parseISO(repo.createdAt), "MMM d, yyyy") },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-[#475569]">{label}</span>
                  <span className="text-[#94a3b8] font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {!isLoading && repos.length === 0 && (
          <div className="col-span-3 card flex items-center justify-center py-16">
            <div className="text-center">
              <GitBranch className="w-10 h-10 text-[#374151] mx-auto mb-3" />
              <p className="text-[#64748b]">No repositories yet</p>
              <p className="text-xs text-[#374151] mt-1">Click "Add Repository" to start monitoring</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
