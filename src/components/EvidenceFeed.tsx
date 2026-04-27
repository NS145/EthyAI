import { motion } from "framer-motion";
import { ExternalLink, Shield, ShieldAlert, ShieldCheck, Clock } from "lucide-react";

interface EvidenceItem {
  title: string;
  source: string;
  url: string;
  similarity: number;
  verdict: "supports" | "contradicts" | "neutral";
  timestamp: string;
}

interface EvidenceFeedProps {
  evidence: EvidenceItem[];
  isLoading?: boolean;
}

const EvidenceFeed = ({ evidence, isLoading }: EvidenceFeedProps) => {
  const getVerdictStyle = (verdict: string) => {
    switch (verdict) {
      case "supports": return { icon: ShieldCheck, color: "text-success", bg: "bg-success/10", label: "Supports" };
      case "contradicts": return { icon: ShieldAlert, color: "text-destructive", bg: "bg-destructive/10", label: "Contradicts" };
      default: return { icon: Shield, color: "text-warning", bg: "bg-warning/10", label: "Neutral" };
    }
  };

  return (
    <div className="rounded-lg bg-card border border-border p-6" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
        <h2 className="font-display text-lg font-semibold text-foreground">Evidence Feed</h2>
        <span className="ml-auto text-xs font-mono text-muted-foreground">{evidence.length} sources</span>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-3 rounded-md bg-muted animate-pulse h-20" />
          ))
        ) : evidence.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-40" />
            Submit content to see verification sources
          </div>
        ) : (
          evidence.map((item, i) => {
            const style = getVerdictStyle(item.verdict);
            const Icon = style.icon;
            return (
              <motion.a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="block p-3 rounded-md bg-muted/50 border border-border hover:border-primary/30 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-1.5 rounded ${style.bg}`}>
                    <Icon className={`w-4 h-4 ${style.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-mono text-muted-foreground">{item.source}</span>
                      <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />{item.timestamp}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${style.bg} ${style.color}`}>
                        {style.label}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {Math.round(item.similarity * 100)}% match
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                </div>
              </motion.a>
            );
          })
        )}
      </div>
    </div>
  );
};

export default EvidenceFeed;
