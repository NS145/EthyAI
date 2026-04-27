import { motion } from "framer-motion";
import { Brain, Eye, Globe, Layers, CheckCircle, Loader2, Clock } from "lucide-react";

interface ModuleStatus {
  name: string;
  status: "idle" | "running" | "done";
  result?: string;
  icon: React.ElementType;
}

interface AnalysisModulesProps {
  modules: ModuleStatus[];
}

const AnalysisModules = ({ modules }: AnalysisModulesProps) => {
  const statusIcon = (status: string) => {
    switch (status) {
      case "running": return <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />;
      case "done": return <CheckCircle className="w-3.5 h-3.5 text-success" />;
      default: return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="rounded-lg bg-card border border-border p-6" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
        <h2 className="font-display text-lg font-semibold text-foreground">Analysis Pipeline</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {modules.map((mod, i) => {
          const Icon = mod.icon;
          return (
            <motion.div
              key={mod.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`p-3 rounded-md border transition-all ${
                mod.status === "running"
                  ? "border-primary/40 bg-accent/20"
                  : mod.status === "done"
                  ? "border-success/30 bg-success/5"
                  : "border-border bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <Icon className={`w-4 h-4 ${mod.status === "running" ? "text-primary" : mod.status === "done" ? "text-success" : "text-muted-foreground"}`} />
                {statusIcon(mod.status)}
              </div>
              <p className="text-xs font-display font-medium text-foreground">{mod.name}</p>
              {mod.result && (
                <p className="text-xs font-mono text-muted-foreground mt-1 truncate">{mod.result}</p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export { Brain, Eye, Globe, Layers };
export default AnalysisModules;
