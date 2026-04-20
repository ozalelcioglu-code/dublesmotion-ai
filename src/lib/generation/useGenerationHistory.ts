"use client";

import { useEffect, useState } from "react";
import {
  fetchGenerationHistory,
  type GenerationHistoryItem,
  type GenerationHistoryType,
  type SessionUserForGenerationHistory,
} from "@/lib/generation/history-client";

export function useGenerationHistory(input: {
  user: SessionUserForGenerationHistory;
  type: GenerationHistoryType;
  limit?: number;
}) {
  const [items, setItems] = useState<GenerationHistoryItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    if (!input.user) {
      Promise.resolve().then(() => {
        if (!cancelled) setItems([]);
      });
      return;
    }

    fetchGenerationHistory({
      user: input.user,
      type: input.type,
      limit: input.limit ?? 8,
    })
      .then((nextItems) => {
        if (!cancelled) setItems(nextItems);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, [input.limit, input.type, input.user]);

  return items;
}
