/**
 * Content Detail / Results Page
 *
 * Shows detailed analysis results for a specific content item.
 * Reuses existing VeracityMeter, TransparencyPanel, EvidenceFeed components.
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import VeracityMeter from "@/components/VeracityMeter";
import TransparencyPanel from "@/components/TransparencyPanel";
import EvidenceFeed from "@/components/EvidenceFeed";
import DisputeButton from "@/components/DisputeButton";
import ThemeToggle from "@/components/ThemeToggle";
import { getResults, submitFeedback } from "@/services/api";
import { toast } from "sonner";

const ContentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    const fetchResults = async () => {
      try {
        const data = await getResults(id);
        setResult(data);
      } catch (err: any) {
        toast.error("Failed to load results");
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [id]);

  const handleDispute = async (reason: string) => {
    if (!id) return;
    try {
      await submitFeedback(id, reason);
      toast.success("Dispute submitted for review");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const analysis = result?.results;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="TruthLense" className="w-8 h-8 object-contain" />
              <div>
                <h1 className="font-display text-xl font-bold text-foreground tracking-tight">
                  Analysis Results
                </h1>
                <p className="text-[11px] text-muted-foreground tracking-widest uppercase font-mono">
                  {id?.substring(0, 8)}...
                </p>
              </div>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !analysis ? (
          <div className="text-center py-20 text-muted-foreground">
            Results not found.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-6">
              {/* Content preview */}
              {result?.content?.text_content && (
                <div
                  className="rounded-lg bg-card border border-border p-6"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <h2 className="font-display text-lg font-semibold text-foreground mb-3">
                    Analyzed Content
                  </h2>
                  <p className="text-sm text-muted-foreground font-mono leading-relaxed">
                    {result.content.text_content}
                  </p>
                </div>
              )}
              <DisputeButton onDispute={handleDispute} hasResult={!!analysis} />
            </div>

            <div className="lg:col-span-7 space-y-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <VeracityMeter
                  score={analysis.score ?? 0}
                  label={analysis.summary ?? ""}
                  isLoading={false}
                />
                <EvidenceFeed
                  evidence={analysis.evidence ?? []}
                  isLoading={false}
                />
              </motion.div>
              <TransparencyPanel
                highlights={analysis.highlights ?? []}
                shapValues={analysis.shap_values ?? []}
                isLoading={false}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ContentDetail;
