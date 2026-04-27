/**
 * Review Queue Page
 *
 * Shows content items flagged for human review.
 * Reviewers can approve, reject, or escalate items.
 * Updates live via Supabase Realtime.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Flag,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  Clock,
  ArrowLeft,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useReviewQueueRealtime } from "@/hooks/useRealtime";
import { getReviewQueue, submitReviewAction, type ReviewQueueItem } from "@/services/api";
import { toast } from "sonner";

const ReviewQueue = () => {
  const navigate = useNavigate();
  const { user, isReviewer } = useAuth();
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReview, setActiveReview] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchQueue = useCallback(async () => {
    try {
      const result = await getReviewQueue();
      setItems(result.items);
    } catch (err: any) {
      toast.error("Failed to load review queue");
    } finally {
      setLoading(false);
    }
  }, []);

  // Realtime updates
  useReviewQueueRealtime(fetchQueue);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleReviewAction = async (
    reviewId: string,
    action: "approve" | "reject" | "escalate"
  ) => {
    setSubmitting(true);
    try {
      await submitReviewAction(reviewId, action, reviewNotes);
      toast.success(`Item ${action}d successfully`);
      setActiveReview(null);
      setReviewNotes("");
      fetchQueue();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isReviewer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
          <h1 className="text-xl font-display font-bold text-foreground mb-2">
            Access Restricted
          </h1>
          <p className="text-muted-foreground mb-4">
            You need reviewer permissions to access this page.
          </p>
          <Button onClick={() => navigate("/")} variant="outline">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

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
                  Review Queue
                </h1>
                <p className="text-[11px] text-muted-foreground tracking-widest uppercase">
                  Human-in-the-Loop
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Activity className="w-3 h-3 text-success animate-pulse" />
              <span>Live</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
              {items.length} pending
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-6">
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
            ))
          ) : items.length === 0 ? (
            <div
              className="rounded-lg bg-card border border-border p-12 text-center"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <CheckCircle className="w-12 h-12 text-success mx-auto mb-4 opacity-50" />
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">
                Queue Empty
              </h2>
              <p className="text-sm text-muted-foreground">
                No items pending review. All caught up!
              </p>
            </div>
          ) : (
            items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-lg bg-card border border-border p-6"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded bg-warning/10">
                    <Flag className="w-5 h-5 text-warning" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        Priority: {item.priority}/10
                      </span>
                      <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground mb-3">{item.reason}</p>

                    {activeReview === item.id ? (
                      <div className="space-y-3 mt-4 pt-4 border-t border-border">
                        <Textarea
                          placeholder="Review notes (optional)..."
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          className="min-h-[60px] bg-muted border-border text-sm font-mono"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleReviewAction(item.id, "approve")}
                            disabled={submitting}
                            className="bg-success text-success-foreground hover:bg-success/90 text-xs font-mono"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReviewAction(item.id, "reject")}
                            disabled={submitting}
                            className="text-xs font-mono"
                          >
                            <XCircle className="w-3 h-3 mr-1" /> Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReviewAction(item.id, "escalate")}
                            disabled={submitting}
                            className="text-xs font-mono"
                          >
                            <ArrowUpRight className="w-3 h-3 mr-1" /> Escalate
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setActiveReview(null)}
                            className="text-xs font-mono ml-auto"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveReview(item.id)}
                        className="text-xs font-mono"
                      >
                        Review
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default ReviewQueue;
