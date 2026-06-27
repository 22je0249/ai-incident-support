import { Zap, Brain, Mail, Github, Shield, Sliders, Info } from "lucide-react";

function SettingRow({ label, value, desc }: { label: string; value: string; desc?: string }) {
  return (
    <div className="flex items-start justify-between py-4 border-b border-[#1f2937] last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        {desc && <p className="text-xs text-[#475569] mt-1">{desc}</p>}
      </div>
      <div className="ml-8 font-mono text-xs text-purple-300 bg-purple-500/10 px-2 py-1 rounded">
        {value}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6 pb-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">
          <span className="gradient-text">Settings</span>
        </h1>
        <p className="text-sm text-[#64748b] mt-1">Platform configuration and integration status</p>
      </div>

      {/* AI Config */}
      <div className="card">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#1f2937]">
          <Brain className="w-5 h-5 text-purple-400" />
          <h2 className="font-semibold text-white">AI Configuration</h2>
        </div>
        <SettingRow label="LLM Provider" value="Groq API" desc="Using llama-3.3-70b-versatile" />
        <SettingRow label="LLM Model" value="llama-3.3-70b-versatile" desc="Best-in-class open model, free tier" />
        <SettingRow label="Embedding Model" value="nomic-embed-text-v1_5" desc="768-dimensional embeddings" />
        <SettingRow label="Confidence Threshold" value="85%" desc="Minimum confidence for auto-PR creation" />
        <SettingRow label="Max Context Tokens" value="7,000" desc="Log content sent to LLM per request" />
      </div>

      {/* AWS Config */}
      <div className="card">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#1f2937]">
          <Zap className="w-5 h-5 text-amber-400" />
          <h2 className="font-semibold text-white">AWS Configuration</h2>
        </div>
        <SettingRow label="Runtime" value="AWS Lambda" desc="Node.js 20 — serverless, pay-per-invocation" />
        <SettingRow label="Region" value="us-east-1" desc="US East (N. Virginia)" />
        <SettingRow label="Database" value="DynamoDB (PAY_PER_REQUEST)" desc="No provisioned capacity — free tier friendly" />
        <SettingRow label="Log Storage" value="Amazon S3" desc="30-day retention lifecycle policy" />
        <SettingRow label="Event Queue" value="Amazon SQS" desc="Decouples webhook from AI processing" />
      </div>

      {/* Email Config */}
      <div className="card">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#1f2937]">
          <Mail className="w-5 h-5 text-blue-400" />
          <h2 className="font-semibold text-white">Email Notifications (Amazon SES)</h2>
        </div>
        <SettingRow label="Provider" value="Amazon SES" desc="62,000 free emails/month from Lambda" />
        <SettingRow label="Incident Alerts" value="Medium + High risk" desc="Sent immediately on detection" />
        <SettingRow label="PR Notifications" value="Low risk auto-fix" desc="Sent when PR is auto-created" />
        <SettingRow label="Weekly Digest" value="Every Sunday" desc="Summary report with AI accuracy stats" />
        <SettingRow label="One-click Actions" value="Approve / Reject" desc="HMAC-signed tokens, valid 72h" />
      </div>

      {/* Risk Settings */}
      <div className="card">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#1f2937]">
          <Shield className="w-5 h-5 text-emerald-400" />
          <h2 className="font-semibold text-white">Risk Classification</h2>
        </div>
        <SettingRow label="Low Risk → Auto PR" value="≥85% confidence" desc="YAML fixes, dep bumps, docs" />
        <SettingRow label="Medium Risk → Email" value="Any confidence" desc="Dockerfiles, workflow changes, env vars" />
        <SettingRow label="High Risk → Email + Flag" value="Always human review" desc="Migrations, IAM, Terraform, prod deploys" />
        <SettingRow label="Rule Engine" value="Deterministic (cannot be overridden by LLM)" desc="Pattern-based detection runs first" />
      </div>

      {/* Free Tier Summary */}
      <div className="card border-purple-500/20 bg-gradient-to-br from-purple-900/10 to-violet-900/5">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-purple-500/20">
          <Info className="w-5 h-5 text-purple-400" />
          <h2 className="font-semibold text-white">Free Tier Status</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { service: "AWS Lambda", limit: "1M req/mo", status: "✅ Free" },
            { service: "API Gateway", limit: "1M calls/mo", status: "✅ Free" },
            { service: "DynamoDB", limit: "25 GB", status: "✅ Free" },
            { service: "S3", limit: "5 GB", status: "✅ Free" },
            { service: "SQS", limit: "1M req/mo", status: "✅ Free" },
            { service: "Amazon SES", limit: "62K emails/mo", status: "✅ Free" },
            { service: "Groq API", limit: "Rate-limited", status: "✅ Free tier" },
            { service: "Supabase", limit: "500 MB DB", status: "✅ Free tier" },
          ].map(({ service, limit, status }) => (
            <div key={service} className="flex justify-between items-center p-3 rounded-lg bg-[#0e1320] border border-[#1f2937]">
              <div>
                <p className="text-xs font-medium text-white">{service}</p>
                <p className="text-[10px] text-[#475569]">{limit}</p>
              </div>
              <span className="text-[10px] font-semibold text-emerald-400">{status}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-xs text-emerald-300 font-semibold text-center">
            💰 Estimated monthly cost: $0 (within all free tiers)
          </p>
        </div>
      </div>
    </div>
  );
}
