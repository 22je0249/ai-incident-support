import { useLocation } from "react-router-dom";
import { Bell, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/incidents": "Incidents",
  "/knowledge": "Knowledge Base",
  "/repositories": "Repositories",
  "/settings": "Settings",
};

export default function Topbar() {
  const location = useLocation();
  const queryClient = useQueryClient();

  const title =
    PAGE_TITLES[location.pathname] ||
    (location.pathname.startsWith("/incidents/") ? "Incident Detail" : "AIOps Copilot");

  return (
    <header className="h-14 border-b border-[#1f2937] bg-[#0e1320]/80 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="text-[10px] text-[#475569]">
          Auto-refreshes every 30s
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => queryClient.invalidateQueries()}
          title="Refresh"
          className="btn btn-ghost p-2"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button className="btn btn-ghost p-2 relative" title="Notifications">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-purple-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}
