import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, CheckCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface DisputeButtonProps {
  onDispute: (reason: string) => void;
  hasResult: boolean;
}

const DisputeButton = ({ onDispute, hasResult }: DisputeButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (reason.trim()) {
      onDispute(reason);
      setSubmitted(true);
      setTimeout(() => { setIsOpen(false); setSubmitted(false); setReason(""); }, 2000);
    }
  };

  if (!hasResult) return null;

  return (
    <div className="rounded-lg bg-card border border-border p-4" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-warning" />
          <span className="text-sm font-display font-medium text-foreground">Human-in-the-Loop</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs font-mono border-border text-muted-foreground hover:text-foreground hover:border-primary"
        >
          <MessageSquare className="w-3 h-3 mr-1.5" />
          Dispute Flag
        </Button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-3">
              {submitted ? (
                <div className="flex items-center gap-2 text-success text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-mono">Dispute submitted for review</span>
                </div>
              ) : (
                <>
                  <Textarea
                    placeholder="Explain why you believe this assessment is incorrect..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="min-h-[80px] bg-muted border-border text-foreground text-sm font-mono resize-none"
                  />
                  <Button
                    onClick={handleSubmit}
                    disabled={!reason.trim()}
                    size="sm"
                    className="bg-warning text-warning-foreground hover:bg-warning/90 text-xs font-mono"
                  >
                    Submit Dispute
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DisputeButton;
