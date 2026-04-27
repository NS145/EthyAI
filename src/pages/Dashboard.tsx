/**
 * Dashboard Page
 *
 * Shows analysis statistics, recent results, and system health.
 * Auto-refreshes via Supabase Realtime subscriptions.
 */

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Clock,
  TrendingUp,
  Users,
  FileSearch,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardRealtime } from "@/hooks/useRealtime";
import { getDashboard, type DashboardData } from "@/services/api";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const result = await getDashboard();
      setData(result);
    } catch (err: any) {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  // Realtime auto-refresh
  useDashboardRealtime(fetchDashboard);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const stats = [
    {
      label: "Total Analyses",
      value: data?.total_analyses ?? 0,
      icon: BarChart3,
      color: "text-primary",
    },
    {
      label: "Pending Reviews",
      value: data?.pending_reviews ?? 0,
      icon: Clock,
      color: "text-warning",
    },
    {
      label: "Avg Score",
      value: `${data?.average_score ?? 0}%`,
      icon: TrendingUp,
      color: "text-success",
    },
    {
      label: "Authentic",
      value: data?.verdict_distribution?.authentic ?? 0,
      icon: ShieldCheck,
      color: "text-success",
    },
    {
      label: "Suspicious",
      value: data?.verdict_distribution?.suspicious ?? 0,
      icon: Shield,
      color: "text-warning",
    },
    {
      label: "Misinformation",
      value: data?.verdict_distribution?.misinformation ?? 0,
      icon: ShieldAlert,
      color: "text-destructive",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="EthyAI" className="w-8 h-8 object-contain" />
              <div>
                <h1 className="font-display text-xl font-bold text-foreground tracking-tight">
                  Dashboard
                </h1>
                <p className="text-[11px] text-muted-foreground tracking-widest uppercase">
                  System Overview
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Activity className="w-3 h-3 text-success animate-pulse" />
              <span>Live</span>
            </div>
            {user && (
              <span className="text-xs text-muted-foreground font-mono">
                {user.displayName}
              </span>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-lg bg-card border border-border p-4"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                  {stat.label}
                </span>
              </div>
              <p className="text-2xl font-display font-bold text-foreground">
                {loading ? "—" : stat.value}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Recent Analyses */}
        <div
          className="rounded-lg bg-card border border-border p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
            <h2 className="font-display text-lg font-semibold text-foreground">
              Recent Analyses
            </h2>
            <span className="ml-auto text-xs font-mono text-muted-foreground">
              {data?.recent_analyses?.length ?? 0} items
            </span>
          </div>

          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-md bg-muted animate-pulse" />
              ))
            ) : (data?.recent_analyses?.length ?? 0) === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <FileSearch className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No analyses yet. Submit content to get started.
              </div>
            ) : (
              data?.recent_analyses?.map((analysis: any, i: number) => {
                const score = analysis.score ?? 0;
                const color =
                  score >= 75
                    ? "text-success"
                    : score >= 50
                    ? "text-warning"
                    : "text-destructive";

                return (
                  <motion.div
                    key={analysis.id || i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-4 p-3 rounded-md bg-muted/50 border border-border hover:border-primary/30 transition-all cursor-pointer"
                    onClick={() => navigate(`/results/${analysis.content_id}`)}
                  >
                    <div className={`text-lg font-display font-bold ${color}`}>
                      {score}%
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {analysis.summary || analysis.verdict || "Analysis"}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {analysis.modalities?.join(", ") || "text"} •{" "}
                        {new Date(analysis.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded ${
                        analysis.verdict === "authentic"
                          ? "bg-success/10 text-success"
                          : analysis.verdict === "suspicious"
                          ? "bg-warning/10 text-warning"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {analysis.verdict}
                    </span>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
