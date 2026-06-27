import { Github, Zap, Brain, Shield } from "lucide-react";

export default function LoginPage() {
  const handleGithubLogin = () => {
    window.location.href = "/auth/github";
  };

  return (
    <div className="min-h-screen bg-[#080b14] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-violet-600/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-violet-700 shadow-lg shadow-purple-900/40 mb-4 animate-glow">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">AIOps Copilot</h1>
          <p className="text-[#64748b] mt-2 text-sm">AI Incident Response Platform</p>
        </div>

        {/* Card */}
        <div className="card card-glow">
          <h2 className="text-xl font-bold text-white mb-2 text-center">Sign in</h2>
          <p className="text-sm text-[#64748b] text-center mb-8">
            Connect with GitHub to start monitoring your repositories
          </p>

          <button
            onClick={handleGithubLogin}
            id="github-login-btn"
            className="btn btn-primary w-full justify-center py-3 text-base mb-6"
          >
            <Github className="w-5 h-5" />
            Continue with GitHub
          </button>

          {/* Feature list */}
          <div className="space-y-3 border-t border-[#1f2937] pt-6">
            {[
              { icon: Brain, text: "AI-powered failure diagnosis with Groq", color: "text-purple-400 bg-purple-500/15" },
              { icon: Shield, text: "Risk-classified automatic fixes & PRs", color: "text-emerald-400 bg-emerald-500/15" },
              { icon: Zap, text: "Serverless — runs on AWS free tier", color: "text-amber-400 bg-amber-500/15" },
            ].map(({ icon: Icon, text, color }) => (
              <div key={text} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-sm text-[#94a3b8]">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-[#374151] mt-6">
          Powered by Groq · AWS Lambda · Amazon SES · Supabase
        </p>
      </div>
    </div>
  );
}
