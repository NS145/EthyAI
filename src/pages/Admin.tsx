/**
 * Admin Panel Page
 *
 * Admin-only page for audit logs and system management.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield,
  ArrowLeft,
  FileText,
  Users,
  Activity,
  AlertTriangle,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { getAuditReport } from "@/services/api";
import { toast } from "sonner";

const Admin = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchLogs = useCallback(async () => {
    try {
      const result = await getAuditReport();
      setLogs(result.logs);
    } catch (err: any) {
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
          <h1 className="text-xl font-display font-bold text-foreground mb-2">
            Admin Access Required
          </h1>
          <p className="text-muted-foreground mb-4">
            This page is restricted to administrators.
          </p>
          <Button onClick={() => navigate("/")} variant="outline">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  const filteredLogs = logs.filter(
    (log) =>
      !searchTerm ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const actionColor = (action: string) => {
    if (action?.includes("approve")) return "text-success bg-success/10";
    if (action?.includes("reject")) return "text-destructive bg-destructive/10";
    if (action?.includes("analyze")) return "text-primary bg-primary/10";
    if (action?.includes("feedback")) return "text-warning bg-warning/10";
    return "text-muted-foreground bg-muted";
  };

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
              <img src="/logo.png" alt="TruthLense" className="w-8 h-8 object-contain" />
              <div>
                <h1 className="font-display text-xl font-bold text-foreground tracking-tight">
                  Admin Panel
                </h1>
                <p className="text-[11px] text-muted-foreground tracking-widest uppercase">
                  System Administration
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
              <Shield className="w-3 h-3 inline mr-1" />
              {user?.role}
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-lg bg-card border border-border p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground font-mono uppercase">Audit Logs</span>
            </div>
            <p className="text-2xl font-display font-bold text-foreground">{logs.length}</p>
          </div>
          <div className="rounded-lg bg-card border border-border p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground font-mono uppercase">Users</span>
            </div>
            <p className="text-2xl font-display font-bold text-foreground">
              {new Set(logs.map((l) => l.user_id).filter(Boolean)).size}
            </p>
          </div>
          <div className="rounded-lg bg-card border border-border p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground font-mono uppercase">Status</span>
            </div>
            <p className="text-2xl font-display font-bold text-success">Online</p>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="rounded-lg bg-card border border-border p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
              <h2 className="font-display text-lg font-semibold text-foreground">Audit Trail</h2>
            </div>
            <div className="relative ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="admin-search"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64 bg-muted border-border text-sm"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded bg-muted animate-pulse" />
              ))
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No audit logs found.
              </div>
            ) : (
              filteredLogs.map((log, i) => (
                <motion.div
                  key={log.id || i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-4 p-3 rounded-md bg-muted/30 border border-border text-sm"
                >
                  <span className={`px-2 py-0.5 rounded text-xs font-mono ${actionColor(log.action)}`}>
                    {log.action}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {log.resource_type}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono truncate flex-1">
                    {log.resource_id?.substring(0, 8)}...
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Admin;
