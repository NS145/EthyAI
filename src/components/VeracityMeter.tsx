import { motion } from "framer-motion";

interface VeracityMeterProps {
  score: number; // 0-100
  label: string;
  isLoading?: boolean;
}

const VeracityMeter = ({ score, label, isLoading }: VeracityMeterProps) => {
  const getColor = (s: number) => {
    if (s >= 75) return { color: "hsl(160, 60%, 45%)", label: "Likely Authentic" };
    if (s >= 50) return { color: "hsl(38, 92%, 50%)", label: "Uncertain" };
    if (s >= 25) return { color: "hsl(25, 80%, 55%)", label: "Suspicious" };
    return { color: "hsl(0, 72%, 55%)", label: "Likely Misinformation" };
  };

  const { color, label: statusLabel } = getColor(score);
  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (score / 100) * circumference * 0.75; // 270 degree arc

  return (
    <div className="rounded-lg bg-card border border-border p-6 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
        <h2 className="font-display text-lg font-semibold text-foreground">Veracity Score</h2>
      </div>

      <div className="relative w-48 h-48 mx-auto">
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-[135deg]">
          {/* Background arc */}
          <circle
            cx="80" cy="80" r="70"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * 0.25}
            strokeLinecap="round"
          />
          {/* Score arc */}
          <motion.circle
            cx="80" cy="80" r="70"
            fill="none"
            stroke={isLoading ? "hsl(var(--muted-foreground))" : color}
            strokeWidth="8"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: isLoading ? circumference : strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            strokeLinecap="round"
            style={{
              filter: isLoading ? "none" : `drop-shadow(0 0 8px ${color})`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-4xl font-display font-bold"
            style={{ color: isLoading ? "hsl(var(--muted-foreground))" : color }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {isLoading ? "—" : `${score}%`}
          </motion.span>
          <span className="text-xs text-muted-foreground font-mono mt-1 uppercase tracking-wider">
            {isLoading ? "Analyzing" : "Truth Probability"}
          </span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="mt-2"
      >
        <span
          className="inline-block px-3 py-1 rounded-full text-xs font-semibold font-mono uppercase tracking-wider"
          style={{
            backgroundColor: isLoading ? "hsl(var(--muted))" : `${color}20`,
            color: isLoading ? "hsl(var(--muted-foreground))" : color,
          }}
        >
          {isLoading ? "Processing..." : statusLabel}
        </span>
        {!isLoading && (
          <p className="text-xs text-muted-foreground mt-2 font-mono">{label}</p>
        )}
      </motion.div>
    </div>
  );
};

export default VeracityMeter;
