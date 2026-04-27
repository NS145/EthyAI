/**
 * useRealtime Hook
 *
 * Subscribes to Supabase Realtime channels for live updates:
 * - Dashboard auto-refresh when new analysis arrives
 * - Review queue updates live
 * - Content status changes
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface RealtimeEvent {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: any;
  old_record?: any;
  timestamp: string;
}

/**
 * Subscribe to realtime updates on a specific table.
 */
export function useRealtimeTable<T = any>(
  table: string,
  options?: {
    event?: "INSERT" | "UPDATE" | "DELETE" | "*";
    filter?: string;
    onEvent?: (event: RealtimeEvent) => void;
  }
) {
  const [latestEvent, setLatestEvent] = useState<RealtimeEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}-${Date.now()}`)
      .on(
        "postgres_changes" as any,
        {
          event: options?.event || "*",
          schema: "public",
          table,
          ...(options?.filter ? { filter: options.filter } : {}),
        },
        (payload: any) => {
          const event: RealtimeEvent = {
            type: payload.eventType,
            table,
            record: payload.new,
            old_record: payload.old,
            timestamp: new Date().toISOString(),
          };
          setLatestEvent(event);
          options?.onEvent?.(event);
        }
      )
      .subscribe((status: string) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [table, options?.event, options?.filter]);

  return { latestEvent, isConnected };
}

/**
 * Subscribe to dashboard updates.
 * Auto-refreshes when new analyses or reviews come in.
 */
export function useDashboardRealtime(onUpdate: () => void) {
  const [updateCount, setUpdateCount] = useState(0);

  // Listen for new analysis results
  useRealtimeTable("analysis_results", {
    event: "INSERT",
    onEvent: () => {
      setUpdateCount((c) => c + 1);
      onUpdate();
    },
  });

  // Listen for review queue changes
  useRealtimeTable("review_queue", {
    event: "*",
    onEvent: () => {
      setUpdateCount((c) => c + 1);
      onUpdate();
    },
  });

  return { updateCount };
}

/**
 * Subscribe to review queue updates.
 */
export function useReviewQueueRealtime(onUpdate: () => void) {
  return useRealtimeTable("review_queue", {
    event: "*",
    onEvent: onUpdate,
  });
}

/**
 * Subscribe to content analysis progress.
 */
export function useContentRealtime(contentId: string, onUpdate: (record: any) => void) {
  return useRealtimeTable("content", {
    event: "UPDATE",
    filter: `id=eq.${contentId}`,
    onEvent: (event) => onUpdate(event.record),
  });
}
