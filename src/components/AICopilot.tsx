"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type BotIntent = "prompt" | "support" | "bug" | "sales" | "general";
type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  intent?: BotIntent;
};

type AICopilotProps = {
  page?: string;
  plan?: string;
  userName?: string;
  language?: string;
  lastError?: string | null;
  uploadedImage?: boolean;
  uploadedVideo?: boolean;
  adminMode?: boolean;
};

type ChatApiResponse = {
  ok: boolean;
  reply: string;
  intent: BotIntent;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function getPlanLabel(plan?: string) {
  if (!plan) return "Free";
  if (plan === "free") return "Free";
  if (plan === "pro") return "Pro";
  if (plan === "agency") return "Agency";
  return plan;
}

export default function AICopilot({
  page = "unknown",
  plan = "free",
  userName = "Kullanıcı",
  language = "tr",
  lastError = null,
  uploadedImage = false,
  uploadedVideo = false,
  adminMode = false,
}: AICopilotProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid(),
      role: "assistant",
      content:
        "Merhaba, ben Dubles AI Copilot. Prompt üretimi, hata analizi, plan önerisi ve teknik destek konularında yardımcı olabilirim.",
    },
  ]);

  const listRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!open) return;

    setTimeout(() => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
      textareaRef.current?.focus();
    }, 80);
  }, [open, messages, loading]);

  const context = useMemo(
    () => ({
      page,
      plan,
      userName,
      language,
      lastError,
      uploadedImage,
      uploadedVideo,
      adminMode,
    }),
    [
      page,
      plan,
      userName,
      language,
      lastError,
      uploadedImage,
      uploadedVideo,
      adminMode,
    ]
  );

  async function sendMessage(customText?: string) {
    const text = (customText ?? input).trim();
    if (!text || loading) return;

    const nextUserMessage: ChatMessage = {
      id: uid(),
      role: "user",
      content: text,
    };

    const nextMessages = [...messages, nextUserMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context,
        }),
      });

      const data: ChatApiResponse = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.reply || "AI cevap üretilemedi.");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          content: data.reply,
          intent: data.intent,
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Bir hata oluştu. Lütfen tekrar deneyin.";

      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          content:
            "Şu an cevap üretirken bir sorun oluştu.\n\nHata: " + message,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleQuickAction(type: "prompt" | "bug" | "sales" | "support") {
    if (type === "prompt") {
      void sendMessage(
        "Bulunduğum ekrana uygun, daha kaliteli ve profesyonel bir prompt hazırla."
      );
      return;
    }

    if (type === "bug") {
      void sendMessage(
        "Mevcut sayfadaki son hatayı analiz et, muhtemel sebebi ve çözümü yaz."
      );
      return;
    }

    if (type === "sales") {
      void sendMessage(
        "Kullanımıma göre hangi planın daha uygun olduğunu öner."
      );
      return;
    }

    void sendMessage(
      "Bulunduğum sayfada ne yapmam gerektiğini adım adım açıkla."
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          ...styles.fab,
          ...(open ? styles.fabOpen : {}),
        }}
        aria-label="Open Dubles AI Copilot"
      >
        <span style={styles.fabInner}>AI</span>
      </button>

      {open && (
        <div
          style={{
            ...styles.panel,
            ...(isMobile ? styles.panelMobile : {}),
          }}
        >
          <div style={styles.header}>
            <div style={styles.headerLeft}>
              <div style={styles.headerBadge}>DUBLES AI</div>
              <div style={styles.headerTitle}>AI Copilot</div>
              <div style={styles.headerSub}>
                {getPlanLabel(plan)} • {page} {adminMode ? "• admin" : ""}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              style={styles.closeBtn}
              aria-label="Close AI Copilot"
            >
              ×
            </button>
          </div>

          <div style={styles.contextStrip}>
            <div style={styles.contextPill}>
              <span style={styles.contextLabel}>User</span>
              <span style={styles.contextValue}>{userName}</span>
            </div>
            <div style={styles.contextPill}>
              <span style={styles.contextLabel}>Image</span>
              <span style={styles.contextValue}>
                {uploadedImage ? "Loaded" : "None"}
              </span>
            </div>
            <div style={styles.contextPill}>
              <span style={styles.contextLabel}>Video</span>
              <span style={styles.contextValue}>
                {uploadedVideo ? "Ready" : "None"}
              </span>
            </div>
          </div>

          {lastError ? (
            <div style={styles.errorContextBox}>
              <div style={styles.errorContextTitle}>Son hata</div>
              <div style={styles.errorContextText}>{lastError}</div>
            </div>
          ) : null}

          <div style={styles.quickActionsWrap}>
            <button
              type="button"
              style={styles.quickBtn}
              onClick={() => handleQuickAction("prompt")}
            >
              Prompt oluştur
            </button>
            <button
              type="button"
              style={styles.quickBtn}
              onClick={() => handleQuickAction("bug")}
            >
              Hata analiz et
            </button>
            <button
              type="button"
              style={styles.quickBtn}
              onClick={() => handleQuickAction("support")}
            >
              Yönlendir
            </button>
            <button
              type="button"
              style={styles.quickBtn}
              onClick={() => handleQuickAction("sales")}
            >
              Plan öner
            </button>
          </div>

          <div ref={listRef} style={styles.messages}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  ...styles.messageRow,
                  ...(msg.role === "user"
                    ? styles.messageRowUser
                    : styles.messageRowAssistant),
                }}
              >
                <div
                  style={{
                    ...styles.messageBubble,
                    ...(msg.role === "user"
                      ? styles.messageBubbleUser
                      : styles.messageBubbleAssistant),
                  }}
                >
                  <div style={styles.messageMeta}>
                    {msg.role === "user" ? "Sen" : "Dubles AI"}
                  </div>
                  <div style={styles.messageText}>{msg.content}</div>
                </div>
              </div>
            ))}

            {loading && (
              <div style={styles.messageRow}>
                <div
                  style={{
                    ...styles.messageBubble,
                    ...styles.messageBubbleAssistant,
                  }}
                >
                  <div style={styles.messageMeta}>Dubles AI</div>
                  <div style={styles.thinkingRow}>
                    <span style={styles.thinkingDot} />
                    <span style={styles.thinkingDot} />
                    <span style={styles.thinkingDot} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={styles.footer}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Mesajını yaz..."
              rows={3}
              style={styles.textarea}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
            />

            <div style={styles.footerActions}>
              <button
                type="button"
                style={styles.sendBtn}
                onClick={() => void sendMessage()}
                disabled={loading || !input.trim()}
              >
                Gönder
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  fab: {
    position: "fixed",
    right: 20,
    bottom: 20,
    zIndex: 1000,
    width: 62,
    height: 62,
    borderRadius: 999,
    border: "1px solid rgba(15,23,42,0.14)",
    background: "linear-gradient(180deg, #7a818a 0%, #5f6670 100%)",
    color: "#fff",
    cursor: "pointer",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.2), 0 10px 24px rgba(15,23,42,0.16)",
    display: "grid",
    placeItems: "center",
  },

  fabOpen: {
    transform: "scale(0.98)",
  },

  fabInner: {
    fontSize: 18,
    fontWeight: 800,
    lineHeight: 1,
  },

  panel: {
    position: "fixed",
    right: 20,
    bottom: 96,
    zIndex: 1000,
    width: 410,
    maxWidth: "calc(100vw - 24px)",
    height: 680,
    maxHeight: "calc(100vh - 120px)",
    borderRadius: 16,
    border: "1px solid rgba(15,23,42,0.12)",
    background:
      "linear-gradient(180deg, rgba(242,245,248,0.98) 0%, rgba(220,226,233,0.98) 100%)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.75), 0 18px 50px rgba(15,23,42,0.18)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    minHeight: 0,
  },

  panelMobile: {
    right: 12,
    left: 12,
    width: "auto",
    bottom: 88,
    height: "calc(100vh - 110px)",
    maxHeight: "calc(100vh - 110px)",
  },

  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    padding: "16px 16px 12px",
    borderBottom: "1px solid rgba(15,23,42,0.08)",
    flexShrink: 0,
  },

  headerLeft: {
    minWidth: 0,
    flex: 1,
  },

  headerBadge: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 24,
    padding: "0 10px",
    borderRadius: 999,
    background:
      "linear-gradient(180deg, rgba(244,246,249,0.98) 0%, rgba(211,217,225,0.98) 100%)",
    border: "1px solid rgba(15,23,42,0.12)",
    color: "#4b5563",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.4,
    marginBottom: 8,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: "#374151",
    lineHeight: 1.1,
  },

  headerSub: {
    marginTop: 6,
    fontSize: 12,
    color: "#6b7280",
    wordBreak: "break-word",
  },

  closeBtn: {
    width: 38,
    height: 38,
    flexShrink: 0,
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.12)",
    background:
      "linear-gradient(180deg, rgba(244,246,249,0.98) 0%, rgba(211,217,225,0.98) 100%)",
    color: "#374151",
    fontSize: 22,
    cursor: "pointer",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },

  contextStrip: {
    display: "flex",
    gap: 8,
    padding: "12px 16px 0",
    flexWrap: "wrap",
    flexShrink: 0,
  },

  contextPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    minHeight: 34,
    padding: "0 12px",
    borderRadius: 999,
    background:
      "linear-gradient(180deg, rgba(244,246,249,0.98) 0%, rgba(211,217,225,0.98) 100%)",
    border: "1px solid rgba(15,23,42,0.12)",
  },

  contextLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  contextValue: {
    fontSize: 12,
    fontWeight: 700,
    color: "#374151",
  },

  errorContextBox: {
    margin: "12px 16px 0",
    padding: 12,
    borderRadius: 10,
    background: "rgba(254,226,226,0.78)",
    border: "1px solid rgba(239,68,68,0.14)",
    flexShrink: 0,
  },

  errorContextTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: "#b91c1c",
    marginBottom: 6,
  },

  errorContextText: {
    fontSize: 12,
    lineHeight: 1.5,
    color: "#7f1d1d",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },

  quickActionsWrap: {
    display: "flex",
    gap: 8,
    padding: "12px 16px 0",
    flexWrap: "wrap",
    flexShrink: 0,
  },

  quickBtn: {
    minHeight: 36,
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.12)",
    background:
      "linear-gradient(180deg, rgba(244,246,249,0.98) 0%, rgba(211,217,225,0.98) 100%)",
    color: "#374151",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75)",
  },

  messages: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    WebkitOverflowScrolling: "touch",
  },

  messageRow: {
    display: "flex",
    justifyContent: "flex-start",
  },

  messageRowUser: {
    justifyContent: "flex-end",
  },

  messageRowAssistant: {
    justifyContent: "flex-start",
  },

  messageBubble: {
    maxWidth: "88%",
    borderRadius: 14,
    padding: "12px 14px",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
  },

  messageBubbleUser: {
    background: "linear-gradient(180deg, #7a818a 0%, #5f6670 100%)",
    color: "#fff",
    border: "1px solid rgba(15,23,42,0.16)",
  },

  messageBubbleAssistant: {
    background:
      "linear-gradient(180deg, rgba(250,251,252,0.98) 0%, rgba(235,239,243,0.98) 100%)",
    color: "#374151",
    border: "1px solid rgba(15,23,42,0.12)",
  },

  messageMeta: {
    fontSize: 11,
    fontWeight: 800,
    opacity: 0.72,
    marginBottom: 6,
  },

  messageText: {
    fontSize: 14,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },

  thinkingRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    minHeight: 18,
  },

  thinkingDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "#6b7280",
    opacity: 0.9,
  },

  footer: {
    borderTop: "1px solid rgba(15,23,42,0.08)",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    flexShrink: 0,
  },

  textarea: {
    width: "100%",
    minHeight: 72,
    resize: "none",
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.14)",
    padding: "12px 14px",
    background:
      "linear-gradient(180deg, rgba(250,251,252,0.98) 0%, rgba(235,239,243,0.98) 100%)",
    color: "#374151",
    fontSize: 14,
    lineHeight: 1.5,
    outline: "none",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75)",
  },

  footerActions: {
    display: "flex",
    justifyContent: "flex-end",
  },

  sendBtn: {
    minWidth: 120,
    minHeight: 42,
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.16)",
    background: "linear-gradient(180deg, #7a818a 0%, #5f6670 100%)",
    color: "#fff",
    fontWeight: 800,
    fontSize: 14,
    cursor: "pointer",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 10px rgba(15,23,42,0.08)",
  },
};