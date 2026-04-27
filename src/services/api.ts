/**
 * API Service Layer
 *
 * Centralized API client for communicating with the FastAPI backend.
 * All backend calls go through this layer.
 */

import { supabase } from "@/integrations/supabase/client";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Get the current auth token for API calls.
 */
async function getAuthHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }
  return {};
}

/**
 * Generic fetch wrapper with auth.
 */
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const authHeaders = await getAuthHeader();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || error.message || "API request failed");
  }

  return response.json();
}

// ═══════════════════════════════════════════════════
// Analysis Endpoints
// ═══════════════════════════════════════════════════

export interface AnalysisInput {
  type: "text" | "image" | "video";
  content: string;
  file?: File;
}

export interface AnalysisResult {
  id: string;
  score: number;
  label: string;
  verdict: string;
  confidence: number;
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
  modules: { name: string; status: string; result?: string }[];
  language?: { language: string; model: string };
  modalities: string[];
}

/**
 * Submit content for analysis via the FastAPI backend.
 */
export async function analyzeContent(input: AnalysisInput): Promise<AnalysisResult> {
  const formData = new FormData();

  if (input.type === "text") {
    formData.append("text", input.content);
  } else if (input.file) {
    if (input.type === "image") {
      formData.append("image", input.file);
    } else {
      formData.append("video", input.file);
    }
    // Also send any text description
    if (input.content && input.type === "text") {
      formData.append("text", input.content);
    }
  }

  const authHeaders = await getAuthHeader();
  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: authHeaders,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Analysis failed" }));
    throw new Error(error.detail || "Analysis failed");
  }

  return response.json();
}

/**
 * Get analysis results by content ID.
 */
export async function getResults(contentId: string) {
  return apiFetch(`/api/results/${contentId}`);
}

// ═══════════════════════════════════════════════════
// Dashboard Endpoints
// ═══════════════════════════════════════════════════

export interface DashboardData {
  total_analyses: number;
  pending_reviews: number;
  verdict_distribution: Record<string, number>;
  recent_analyses: any[];
  average_score: number;
}

export async function getDashboard(): Promise<DashboardData> {
  return apiFetch("/api/dashboard");
}

// ═══════════════════════════════════════════════════
// Review Queue Endpoints
// ═══════════════════════════════════════════════════

export interface ReviewQueueItem {
  id: string;
  content_id: string;
  reason: string;
  priority: number;
  status: string;
  created_at: string;
  content?: any;
  analysis_results?: any;
}

export async function getReviewQueue(): Promise<{ items: ReviewQueueItem[] }> {
  return apiFetch("/api/review-queue");
}

export async function submitReviewAction(
  reviewId: string,
  action: "approve" | "reject" | "escalate",
  notes?: string
) {
  return apiFetch("/api/review-action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ review_id: reviewId, action, notes }),
  });
}

// ═══════════════════════════════════════════════════
// Feedback Endpoints
// ═══════════════════════════════════════════════════

export async function submitFeedback(
  contentId: string,
  reason: string,
  feedbackType: "dispute" | "correction" | "report" = "dispute"
) {
  return apiFetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content_id: contentId,
      reason,
      feedback_type: feedbackType,
    }),
  });
}

// ═══════════════════════════════════════════════════
// Audit Endpoints
// ═══════════════════════════════════════════════════

export async function getAuditReport(limit: number = 100) {
  return apiFetch(`/api/audit-report?limit=${limit}`);
}

// ═══════════════════════════════════════════════════
// Supabase Edge Functions (existing)
// ═══════════════════════════════════════════════════

/**
 * Analyze text via Supabase Edge Function (AI-powered).
 * This is the existing flow - kept for backward compatibility.
 */
export async function analyzeTextViaEdgeFunction(text: string) {
  const { data, error } = await supabase.functions.invoke("analyze-text", {
    body: { text },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

/**
 * Chat with the research agent via Supabase Edge Function.
 */
export async function chatWithResearchAgent(messages: { role: string; content: string }[]) {
  const { data, error } = await supabase.functions.invoke("research-agent", {
    body: { messages },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
