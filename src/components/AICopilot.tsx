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
  actions?: Array<{
    type:
      | "fill_prompt"
      | "open_pricing"
      | "retry_render"
      | "contact_support"
      | "apply_patch_preview"
      | "none";
    label: string;
    payload?: Record<string, unknown>;
  }>;
  diagnostics?: {
    category?: string;
    probableCause?: string;
    affectedArea?: string;
    severity?: "low" | "medium" | "high";
    suggestedFix?: string;
  };
  promptEnhancement?: {
    original?: string;
    improved?: string;
    notes?: string[];
  };
  router?: {
    primaryAction:
      | "fill_prompt"
      | "retry_render"
      | "open_pricing"
      | "contact_support"
      | "apply_patch_preview"
      | "none";
    reason: string;
    confidence: number;
    requiresConfirmation: boolean;
    canAutoExecute: boolean;
  };
  adminDiagnostics?: {
    layer?: "frontend" | "backend" | "api" | "database" | "unknown";
    likelyFile?: string;
    rootCause?: string;
    patchSuggestion?: string;
    testChecklist?: string[];
    repairPlan?: {
      problemSummary?: string;
      minimalFix?: string;
      pseudoDiff?: string;
      riskLevel?: "low" | "medium" | "high";
      validationSteps?: string[];
    };
  };
  security?: {
    riskLevel?: "low" | "medium" | "high";
    flags?: string[];
    blocked?: boolean;
    reason?: string;
    fingerprint?: string;
  };
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

function getActionLabel(
  action:
    | "fill_prompt"
    | "retry_render"
    | "open_pricing"
    | "contact_support"
    | "apply_patch_preview"
    | "none"
) {
  switch (action) {
    case "fill_prompt":
      return "Promptu doldur";
    case "retry_render":
      return "Üretimi yeniden dene";
    case "open_pricing":
      return "Planları aç";
    case "contact_support":
      return "Destek alanını aç";
    case "apply_patch_preview":
      return "Patch planını incele";
    default:
      return "Yok";
  }
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

  const [lastActions, setLastActions] =
    useState<ChatApiResponse["actions"]>([]);
  const [lastDiagnostics, setLastDiagnostics] =
    useState<ChatApiResponse["diagnostics"] | null>(null);
  const [lastPromptEnhancement, setLastPromptEnhancement] =
    useState<ChatApiResponse["promptEnhancement"] | null>(null);
  const [lastRouter, setLastRouter] =
    useState<ChatApiResponse["router"] | null>(null);
  const [lastAdminDiagnostics, setLastAdminDiagnostics] =
    useState<ChatApiResponse["adminDiagnostics"] | null>(null);
  const [lastSecurity, setLastSecurity] =
    useState<ChatApiResponse["security"] | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid(),
      role: "assistant",
      content:
        "Merhaba, ben Dubles AI Copilot. Prompt üretimi, hata analizi, plan önerisi, güvenlik ve teknik destek konularında yardımcı olabilirim.",
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

  useEffect(() => {
    if (!lastRouter) return;
    if (!lastPromptEnhancement?.improved) return;

    if (
      lastRouter.primaryAction === "fill_prompt" &&
      lastRouter.canAutoExecute &&
      !lastRouter.requiresConfirmation &&
      lastRouter.confidence >= 0.9
    ) {
      window.dispatchEvent(
        new CustomEvent("ai-fill-prompt", {
          detail: {
            prompt: lastPromptEnhancement.improved,
          },
        })
      );
    }
  }, [lastRouter, lastPromptEnhancement]);

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
    setLastActions([]);
    setLastDiagnostics(null);
    setLastPromptEnhancement(null);
    setLastRouter(null);
    setLastAdminDiagnostics(null);
    setLastSecurity(null);

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

      setLastActions(data.actions || []);
      setLastDiagnostics(data.diagnostics || null);
      setLastPromptEnhancement(data.promptEnhancement || null);
      setLastRouter(data.router || null);
      setLastAdminDiagnostics(data.adminDiagnostics || null);
      setLastSecurity(data.security || null);
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

  function handleActionClick(
    action:
      | {
          type:
            | "fill_prompt"
            | "open_pricing"
            | "retry_render"
            | "contact_support"
            | "apply_patch_preview"
            | "none";
          label: string;
          payload?: Record<string, unknown>;
        }
      | undefined
  ) {
    if (!action) return;

    if (action.type === "fill_prompt") {
      window.dispatchEvent(
        new CustomEvent("ai-fill-prompt", {
          detail: {
            prompt:
              typeof action.payload?.prompt === "string"
                ? action.payload.prompt
                : "",
          },
        })
      );
      return;
    }

    if (action.type === "retry_render") {
      window.dispatchEvent(
        new CustomEvent("ai-retry-render", {
          detail: action.payload || {},
        })
      );
      return;
    }

    if (action.type === "open_pricing") {
      window.location.href = "/billing";
      return;
    }

    if (action.type === "contact_support") {
      window.dispatchEvent(
        new CustomEvent("ai-open-support", {
          detail: { source: "copilot" },
        })
      );
      return;
    }

    if (action.type === "apply_patch_preview") {
      window.dispatchEvent(
        new CustomEvent("ai-open-patch-preview", {
          detail: { source: "copilot" },
        })
      );
      return;
    }
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

          {lastSecurity &&
          (lastSecurity.riskLevel ||
            (lastSecurity.flags && lastSecurity.flags.length > 0) ||
            lastSecurity.reason) ? (
            <div style={styles.insightCard}>
              <div style={styles.insightTitle}>Security Analysis</div>

              {lastSecurity.riskLevel ? (
                <div style={styles.insightLine}>
                  <strong>Risk:</strong> {lastSecurity.riskLevel}
                </div>
              ) : null}

              {lastSecurity.reason ? (
                <div style={styles.insightLine}>
                  <strong>Neden:</strong> {lastSecurity.reason}
                </div>
              ) : null}

              {lastSecurity.fingerprint ? (
                <div style={styles.insightLine}>
                  <strong>Fingerprint:</strong> {lastSecurity.fingerprint}
                </div>
              ) : null}

              {lastSecurity.flags && lastSecurity.flags.length > 0 ? (
                <div style={styles.insightLine}>
                  <strong>Flags:</strong>
                  <div style={{ marginTop: 6 }}>
                    {lastSecurity.flags.map((flag, index) => (
                      <div key={`${flag}-${index}`} style={{ marginBottom: 4 }}>
                        • {flag}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {lastDiagnostics &&
          (lastDiagnostics.category ||
            lastDiagnostics.probableCause ||
            lastDiagnostics.affectedArea ||
            lastDiagnostics.suggestedFix) ? (
            <div style={styles.insightCard}>
              <div style={styles.insightTitle}>AI Diagnostics</div>

              {lastDiagnostics.category ? (
                <div style={styles.insightLine}>
                  <strong>Kategori:</strong> {lastDiagnostics.category}
                </div>
              ) : null}

              {lastDiagnostics.probableCause ? (
                <div style={styles.insightLine}>
                  <strong>Muhtemel sebep:</strong>{" "}
                  {lastDiagnostics.probableCause}
                </div>
              ) : null}

              {lastDiagnostics.affectedArea ? (
                <div style={styles.insightLine}>
                  <strong>Etkilenen alan:</strong>{" "}
                  {lastDiagnostics.affectedArea}
                </div>
              ) : null}

              {lastDiagnostics.suggestedFix ? (
                <div style={styles.insightLine}>
                  <strong>Önerilen çözüm:</strong>{" "}
                  {lastDiagnostics.suggestedFix}
                </div>
              ) : null}
            </div>
          ) : null}

          {lastPromptEnhancement?.improved ? (
            <div style={styles.insightCard}>
              <div style={styles.insightTitle}>Prompt Upgrade</div>

              <div style={styles.insightLine}>
                {lastPromptEnhancement.improved}
              </div>

              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  style={styles.actionBtn}
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("ai-fill-prompt", {
                        detail: {
                          prompt: lastPromptEnhancement.improved,
                        },
                      })
                    );
                  }}
                >
                  Geliştirilmiş promptu kullan
                </button>
              </div>
            </div>
          ) : null}

          {lastRouter && lastRouter.primaryAction !== "none" ? (
            <div style={styles.insightCard}>
              <div style={styles.insightTitle}>Smart Action</div>

              <div style={styles.insightLine}>
                <strong>Önerilen aksiyon:</strong>{" "}
                {getActionLabel(lastRouter.primaryAction)}
              </div>

              <div style={styles.insightLine}>
                <strong>Neden:</strong> {lastRouter.reason}
              </div>

              <div style={styles.insightLine}>
                <strong>Güven:</strong> %
                {Math.round((lastRouter.confidence || 0) * 100)}
              </div>

              {lastRouter.canAutoExecute ? (
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    style={styles.actionBtn}
                    onClick={() => {
                      if (
                        lastRouter.primaryAction === "fill_prompt" &&
                        lastPromptEnhancement?.improved
                      ) {
                        window.dispatchEvent(
                          new CustomEvent("ai-fill-prompt", {
                            detail: {
                              prompt: lastPromptEnhancement.improved,
                            },
                          })
                        );
                        return;
                      }

                      const targetAction = lastActions?.find(
                        (a) => a.type === lastRouter.primaryAction
                      );

                      if (targetAction) {
                        handleActionClick(targetAction);
                      }
                    }}
                  >
                    Önerilen aksiyonu uygula
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {adminMode &&
          lastAdminDiagnostics &&
          (lastAdminDiagnostics.layer ||
            lastAdminDiagnostics.likelyFile ||
            lastAdminDiagnostics.rootCause ||
            lastAdminDiagnostics.patchSuggestion ||
            (lastAdminDiagnostics.testChecklist &&
              lastAdminDiagnostics.testChecklist.length > 0)) ? (
            <div style={styles.insightCard}>
              <div style={styles.insightTitle}>Admin Diagnostics</div>

              {lastAdminDiagnostics.layer ? (
                <div style={styles.insightLine}>
                  <strong>Katman:</strong> {lastAdminDiagnostics.layer}
                </div>
              ) : null}

              {lastAdminDiagnostics.likelyFile ? (
                <div style={styles.insightLine}>
                  <strong>Muhtemel dosya/alan:</strong>{" "}
                  {lastAdminDiagnostics.likelyFile}
                </div>
              ) : null}

              {lastAdminDiagnostics.rootCause ? (
                <div style={styles.insightLine}>
                  <strong>Root cause:</strong>{" "}
                  {lastAdminDiagnostics.rootCause}
                </div>
              ) : null}

              {lastAdminDiagnostics.patchSuggestion ? (
                <div style={styles.insightLine}>
                  <strong>Patch önerisi:</strong>{" "}
                  {lastAdminDiagnostics.patchSuggestion}
                </div>
              ) : null}

              {lastAdminDiagnostics.testChecklist &&
              lastAdminDiagnostics.testChecklist.length > 0 ? (
                <div style={styles.insightLine}>
                  <strong>Test checklist:</strong>
                  <div style={{ marginTop: 6 }}>
                    {lastAdminDiagnostics.testChecklist.map((item, index) => (
                      <div key={`${item}-${index}`} style={{ marginBottom: 4 }}>
                        • {item}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {lastAdminDiagnostics.repairPlan?.problemSummary ? (
                <div style={styles.insightLine}>
                  <strong>Problem özeti:</strong>{" "}
                  {lastAdminDiagnostics.repairPlan.problemSummary}
                </div>
              ) : null}

              {lastAdminDiagnostics.repairPlan?.minimalFix ? (
                <div style={styles.insightLine}>
                  <strong>Minimal fix:</strong>{" "}
                  {lastAdminDiagnostics.repairPlan.minimalFix}
                </div>
              ) : null}

              {lastAdminDiagnostics.repairPlan?.riskLevel ? (
                <div style={styles.insightLine}>
                  <strong>Risk:</strong>{" "}
                  {lastAdminDiagnostics.repairPlan.riskLevel}
                </div>
              ) : null}

              {lastAdminDiagnostics.repairPlan?.pseudoDiff ? (
                <div style={styles.diffCard}>
                  <div style={styles.diffTitle}>Pseudo Diff</div>
                  <pre style={styles.diffPre}>
                    {lastAdminDiagnostics.repairPlan.pseudoDiff}
                  </pre>
                </div>
              ) : null}

              {lastAdminDiagnostics.repairPlan?.validationSteps &&
              lastAdminDiagnostics.repairPlan.validationSteps.length > 0 ? (
                <div style={styles.insightLine}>
                  <strong>Validation steps:</strong>
                  <div style={{ marginTop: 6 }}>
                    {lastAdminDiagnostics.repairPlan.validationSteps.map(
                      (item, index) => (
                        <div key={`${item}-${index}`} style={{ marginBottom: 4 }}>
                          • {item}
                        </div>
                      )
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {!!lastActions?.length && (
            <div style={styles.actionsWrap}>
              {lastActions.map((action, index) => (
                <button
                  key={`${action.type}-${index}`}
                  type="button"
                  style={styles.actionBtn}
                  onClick={() => handleActionClick(action)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

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
  },
  headerLeft: {
    minWidth: 0,
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
  },
  contextStrip: {
    display: "flex",
    gap: 8,
    padding: "12px 16px 0",
    flexWrap: "wrap",
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
    overflowY: "auto",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
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
  insightCard: {
    margin: "0 16px 12px",
    padding: 12,
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.12)",
    background:
      "linear-gradient(180deg, rgba(250,251,252,0.98) 0%, rgba(235,239,243,0.98) 100%)",
    color: "#374151",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75)",
  },
  insightTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: "#4b5563",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  insightLine: {
    fontSize: 13,
    lineHeight: 1.6,
    color: "#374151",
    marginBottom: 6,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  diffCard: {
    marginTop: 10,
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.12)",
    background: "rgba(15,23,42,0.04)",
    overflow: "hidden",
  },
  diffTitle: {
    padding: "10px 12px",
    borderBottom: "1px solid rgba(15,23,42,0.08)",
    fontSize: 12,
    fontWeight: 800,
    color: "#4b5563",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  diffPre: {
    margin: 0,
    padding: 12,
    fontSize: 12,
    lineHeight: 1.6,
    color: "#1f2937",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  actionsWrap: {
    display: "flex",
    gap: 8,
    padding: "0 16px 12px",
    flexWrap: "wrap",
  },
  actionBtn: {
    minHeight: 36,
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.12)",
    background: "linear-gradient(180deg, #7a818a 0%, #5f6670 100%)",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 10px rgba(15,23,42,0.08)",
  },
  footer: {
    borderTop: "1px solid rgba(15,23,42,0.08)",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 10,
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