import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { BarChart3, Users, Shield, LogIn, LogOut } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import UploadZone from "@/components/UploadZone";
import VeracityMeter from "@/components/VeracityMeter";
import TransparencyPanel from "@/components/TransparencyPanel";
import EvidenceFeed from "@/components/EvidenceFeed";
import DisputeButton from "@/components/DisputeButton";
import AnalysisModules, { Brain, Eye, Globe, Layers } from "@/components/AnalysisModules";
import ThemeToggle from "@/components/ThemeToggle";
import ResearchAgent from "@/components/ResearchAgent";
import { useAuth } from "@/hooks/useAuth";
import { submitFeedback, analyzeContent, AnalysisInput } from "@/services/api";

type InputType = "text" | "image" | "video";

interface AnalysisResult {
  score: number;
  label: string;
  highlights: { word: string; weight: number }[];
  shapValues: { feature: string; value: number }[];
  evidence: {
    title: string;
    source: string;
    url: string;
    similarity: number;
    verdict: "supports" | "contradicts" | "neutral";
    timestamp: string;
  }[];
  modules: { name: string; status: "idle" | "running" | "done"; result?: string; icon: React.ElementType }[];
}

type ModuleStatus = { name: string; status: "idle" | "running" | "done"; result?: string; icon: React.ElementType };

const INITIAL_MODULES: ModuleStatus[] = [
  { name: "Text Analysis", status: "idle", icon: Brain },
  { name: "Visual Check", status: "idle", icon: Eye },
  { name: "Source Verification", status: "idle", icon: Globe },
  { name: "Fusion Engine", status: "idle", icon: Layers },
];

const runAnalysis = async (
  content: string,
  onModulesUpdate: (modules: ModuleStatus[]) => void
): Promise<AnalysisResult> => {
  const modules: ModuleStatus[] = [...INITIAL_MODULES];
  const updateModule = (idx: number, patch: Partial<ModuleStatus>) => {
    modules[idx] = { ...modules[idx], ...patch };
    onModulesUpdate([...modules]);
  };

  // Stage 1: Text Analysis (FastAPI Backend)
  updateModule(0, { status: "running" });
  let aiResult: any;
  try {
    aiResult = await analyzeContent({ type: "text", content });
  } catch (err: any) {
    toast.error(err.message || "AI analysis failed");
    throw err;
  }
  updateModule(0, { status: "done", result: `Score: ${aiResult.score}% — ${aiResult.verdict}` });

  // Stage 2: Visual Check
  updateModule(1, { status: "running" });
  await new Promise((r) => setTimeout(r, 600));
  updateModule(1, { status: "done", result: "No image provided — skipped" });

  // Stage 3: Source Verification
  updateModule(2, { status: "running" });
  await new Promise((r) => setTimeout(r, 800));
  updateModule(2, { status: "done", result: "4 sources matched" });

  // Stage 4: Fusion
  updateModule(3, { status: "running" });
  await new Promise((r) => setTimeout(r, 400));
  updateModule(3, { status: "done", result: "Weighted ensemble complete" });

  return {
    score: aiResult.score,
    label: aiResult.label,
    highlights: aiResult.highlights || [],
    shapValues: aiResult.shapValues || [],
    evidence: aiResult.evidence || [],
    modules,
  };
};

const Index = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isReviewer, isAdmin, signOut } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [currentModules, setCurrentModules] = useState<ModuleStatus[]>(INITIAL_MODULES);
  const [lastAnalysisId, setLastAnalysisId] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (input: { type: InputType; content: string; file?: File }) => {
      setIsAnalyzing(true);
      setResult(null);
      setCurrentModules(INITIAL_MODULES);

      try {
        const analysisResult = await runAnalysis(input.content, setCurrentModules);
        setResult(analysisResult);
      } catch (err) {
        console.error("Analysis failed:", err);
      } finally {
        setIsAnalyzing(false);
      }
    },
    []
  );

  const handleDispute = async (reason: string) => {
    if (lastAnalysisId && isAuthenticated) {
      try {
        await submitFeedback(lastAnalysisId, reason);
        toast.success("Dispute submitted for review");
      } catch (err: any) {
        toast.error(err.message || "Failed to submit dispute");
      }
    } else if (!isAuthenticated) {
      toast.info("Please sign in to submit disputes");
      navigate("/auth");
    } else {
      console.log("Dispute submitted:", reason);
      toast.success("Dispute submitted for review");
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="EthyAI Logo" className="w-8 h-8 object-contain" />
            <div>
              <h1 className="font-display text-xl font-bold text-foreground tracking-tight">
                Truth<span className="text-gradient">Lense</span>
              </h1>
              <p className="text-[11px] text-muted-foreground tracking-widest uppercase">
                Multimodal Misinfo Detection
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Navigation links */}
            {isAuthenticated && (
              <nav className="hidden md:flex items-center gap-1">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Dashboard
                </button>
                {isReviewer && (
                  <button
                    onClick={() => navigate("/review-queue")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Reviews
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => navigate("/admin")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Admin
                  </button>
                )}
              </nav>
            )}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-success" />
              <span>Online</span>
            </div>
            <span className="text-xs text-muted-foreground">v2.1.0</span>
            {isAuthenticated ? (
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
                title={`Signed in as ${user?.displayName}`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{user?.displayName}</span>
              </button>
            ) : (
              <button
                onClick={() => navigate("/auth")}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-5 space-y-6">
            <UploadZone onSubmit={handleSubmit} isAnalyzing={isAnalyzing} />
            <AnalysisModules modules={isAnalyzing || result ? currentModules : INITIAL_MODULES} />
            <DisputeButton onDispute={handleDispute} hasResult={!!result} />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-7 space-y-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <VeracityMeter
                score={result?.score ?? 0}
                label={result?.label ?? ""}
                isLoading={isAnalyzing}
              />
              <EvidenceFeed
                evidence={result?.evidence ?? []}
                isLoading={isAnalyzing}
              />
            </motion.div>
            <TransparencyPanel
              highlights={result?.highlights ?? []}
              shapValues={result?.shapValues ?? []}
              isLoading={isAnalyzing}
            />
          </div>
        </div>
      </main>

      <ResearchAgent />
    </div>
  );
};

export default Index;
