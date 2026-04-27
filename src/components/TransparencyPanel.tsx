import { motion } from "framer-motion";
import { Info } from "lucide-react";

interface WordHighlight {
  word: string;
  weight: number; // -1 to 1
}

interface ShapFeature {
  feature: string;
  value: number;
}

interface TransparencyPanelProps {
  highlights: WordHighlight[];
  shapValues: ShapFeature[];
  isLoading?: boolean;
}

const TransparencyPanel = ({ highlights, shapValues, isLoading }: TransparencyPanelProps) => {
  const getHighlightColor = (weight: number) => {
    if (weight > 0.3) return "bg-destructive/30 text-destructive";
    if (weight > 0) return "bg-warning/20 text-warning";
    if (weight < -0.3) return "bg-success/30 text-success";
    return "bg-muted text-muted-foreground";
  };

  const maxAbsValue = Math.max(...shapValues.map((v) => Math.abs(v.value)), 0.01);

  return (
    <div className="rounded-lg bg-card border border-border p-6 space-y-6" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
        <h2 className="font-display text-lg font-semibold text-foreground">XAI Transparency</h2>
        <div className="ml-auto group relative">
          <Info className="w-4 h-4 text-muted-foreground cursor-help" />
          <div className="absolute right-0 top-6 bg-popover border border-border rounded-md p-3 text-xs text-popover-foreground w-56 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            LIME highlights show which words influenced the decision. SHAP values show feature importance.
          </div>
        </div>
      </div>

      {/* LIME Word Highlights */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 font-mono uppercase tracking-wider">
          LIME Highlights
        </h3>
        {isLoading ? (
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-6 rounded bg-muted animate-pulse" style={{ width: `${40 + Math.random() * 60}px` }} />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {highlights.map((h, i) => (
              <motion.span
                key={`${h.word}-${i}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                className={`px-2 py-0.5 rounded text-xs font-mono ${getHighlightColor(h.weight)}`}
              >
                {h.word}
              </motion.span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-success/30" /> Trustworthy</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-warning/20" /> Uncertain</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/30" /> Suspicious</span>
        </div>
      </div>

      {/* SHAP Force Plot */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 font-mono uppercase tracking-wider">
          SHAP Feature Impact
        </h3>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-24 h-4 bg-muted rounded animate-pulse" />
                <div className="flex-1 h-4 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {shapValues.map((sv, i) => (
              <motion.div
                key={sv.feature}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3"
              >
                <span className="text-xs font-mono text-secondary-foreground w-28 truncate text-right">{sv.feature}</span>
                <div className="flex-1 h-5 bg-muted rounded-sm relative overflow-hidden">
                  <motion.div
                    className="absolute top-0 h-full rounded-sm"
                    style={{
                      backgroundColor: sv.value > 0 ? "hsl(0, 72%, 55%)" : "hsl(160, 60%, 45%)",
                      left: sv.value > 0 ? "50%" : undefined,
                      right: sv.value <= 0 ? "50%" : undefined,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(Math.abs(sv.value) / maxAbsValue) * 50}%` }}
                    transition={{ duration: 0.6, delay: i * 0.08 }}
                  />
                  <div className="absolute top-0 left-1/2 w-px h-full bg-border" />
                </div>
                <span className={`text-xs font-mono w-12 text-right ${sv.value > 0 ? "text-destructive" : "text-success"}`}>
                  {sv.value > 0 ? "+" : ""}{sv.value.toFixed(2)}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransparencyPanel;
