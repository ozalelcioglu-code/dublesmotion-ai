import { useCallback, useMemo, useState } from "react";
import type { MyCompProps } from "types/constants";
import type { SSEMessage } from "types/schema";

export type RenderingState =
  | { status: "init" }
  | {
      status: "invoking";
      phase: string;
      progress: number;
      subtitle: string | null;
    }
  | {
      status: "error";
      error: Error;
    }
  | {
      status: "done";
      url: string;
      size: number;
    };

export const useRendering = (id: string, inputProps: MyCompProps) => {
  const [state, setState] = useState<RenderingState>({ status: "init" });

  const renderMedia = useCallback(async () => {
    setState({
      status: "invoking",
      phase: "Starting render...",
      progress: 0,
      subtitle: null,
    });

    try {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, inputProps }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to start render");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;

          const json = chunk.slice(6);
          const message = JSON.parse(json) as SSEMessage;

          if (message.type === "phase") {
            setState((prev) => {
              if (prev.status !== "invoking") return prev;
              return {
                ...prev,
                phase: message.phase,
                progress: message.progress,
                subtitle: message.subtitle ?? null,
              };
            });
            continue;
          }

          if (message.type === "done") {
            setState({
              status: "done",
              url: message.url,
              size: message.size,
            });
            continue;
          }

          if (message.type === "error") {
            setState({
              status: "error",
              error: new Error(message.message),
            });
          }
        }
      }
    } catch (err) {
      setState({
        status: "error",
        error: err instanceof Error ? err : new Error("Unknown render error"),
      });
    }
  }, [id, inputProps]);

  const undo = useCallback(() => {
    setState({ status: "init" });
  }, []);

  return useMemo(
    () => ({
      renderMedia,
      state,
      undo,
    }),
    [renderMedia, state, undo]
  );
};