"use client";

/* eslint-disable @next/next/no-img-element */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";
import AppShell from "@/components/layout/AppShell";
import { getCommonI18n } from "@/lib/i18n";
import { getChatAccess } from "@/lib/plan-access";
import {
  compactTitle,
  uploadGenerationAsset,
} from "@/lib/generation/client";
import {
  addV2HistoryItem,
  makeHistoryId,
  type V2IntentType,
} from "@/lib/v2-store";
import {
  appendMessagesToThread,
  createId,
  createMessage,
  createThreadFromFirstMessage,
  deleteThread,
  findThreadById,
  readActiveThreadId,
  readThreads,
  type ChatAttachment,
  type ChatAttachmentType,
  type ChatGenerationResult,
  type ChatMessage,
  type ChatThread,
  upsertThread,
  writeActiveThreadId,
} from "@/lib/chat-store";
import { useIsMobile } from "@/lib/useIsMobile";
import { useLanguage } from "@/provider/languageProvider";
import { useSession } from "@/provider/SessionProvider";

type ComposerAttachment = ChatAttachment & {
  file?: File;
};

type ChatTexts = {
  centerTitle: string;
  centerSubtitle: string;
  recentTitle: string;
  newChat: string;
  searchPlaceholder: string;
  composerPlaceholder: string;
  send: string;
  thinking: string;
  noThreads: string;
  copy: string;
  like: string;
  dislike: string;
  share: string;
  delete: string;
  liveWeb: string;
  deepResearch: string;
  projectAgent: string;
  voiceMode: string;
  voiceInput: string;
  limited: string;
  active: string;
  tools: string;
  menu: string;
  usageTitle: string;
  usageRunning: string;
  usageDone: string;
  usageEstimated: string;
  usageTotal: string;
  usageInput: string;
  usageOutput: string;
  usageCredit: string;
  usageSteps: string;
  usageTools: string;
  plusMenu: {
    image: string;
    file: string;
    audio: string;
  };
};

const CHAT_TEXTS = {
  tr: {
    centerTitle: "Sen hazır olduğunda hazırım.",
    centerSubtitle:
      "İstediğini doğal şekilde yaz. Gerekirse seni doğru üretim akışına yönlendireyim.",
    recentTitle: "Yakın Zamandakiler",
    newChat: "Yeni sohbet",
    searchPlaceholder: "Sohbetlerde ara...",
    composerPlaceholder: "Herhangi bir şey sor",
    send: "Gönder",
    thinking: "Yazıyor...",
    noThreads: "Henüz kayıtlı sohbet yok",
    copy: "Kopyala",
    like: "Beğen",
    dislike: "Beğenme",
    share: "Paylaş",
    delete: "Sil",
    liveWeb: "Canlı web",
    deepResearch: "Derin araştırma",
    projectAgent: "Proje ajanı",
    voiceMode: "Ses modu",
    voiceInput: "Ses",
    limited: "sınırlı",
    active: "aktif",
    tools: "Araçlar",
    menu: "Menü",
    usageTitle: "Kullanım",
    usageRunning: "çalışıyor",
    usageDone: "tamamlandı",
    usageEstimated: "Tahmini token",
    usageTotal: "Toplam token",
    usageInput: "Input",
    usageOutput: "Output",
    usageCredit: "Kredi",
    usageSteps: "Step",
    usageTools: "Araç",
    plusMenu: {
      image: "Resim ekle",
      file: "Dosya ekle",
      audio: "Ses ekle",
    },
  },
  en: {
    centerTitle: "I’m ready when you are.",
    centerSubtitle:
      "Write naturally. If needed, I’ll route you into the right generation flow.",
    recentTitle: "Recent",
    newChat: "New chat",
    searchPlaceholder: "Search chats...",
    composerPlaceholder: "Ask anything",
    send: "Send",
    thinking: "Thinking...",
    noThreads: "No saved chats yet",
    copy: "Copy",
    like: "Like",
    dislike: "Dislike",
    share: "Share",
    delete: "Delete",
    liveWeb: "Live web",
    deepResearch: "Deep research",
    projectAgent: "Project agent",
    voiceMode: "Voice mode",
    voiceInput: "Voice",
    limited: "limited",
    active: "active",
    tools: "Tools",
    menu: "Menu",
    usageTitle: "Usage",
    usageRunning: "running",
    usageDone: "done",
    usageEstimated: "Estimated tokens",
    usageTotal: "Total tokens",
    usageInput: "Input",
    usageOutput: "Output",
    usageCredit: "Credits",
    usageSteps: "Steps",
    usageTools: "Tools",
    plusMenu: {
      image: "Add image",
      file: "Add file",
      audio: "Add audio",
    },
  },
  de: {
    centerTitle: "Ich bin bereit, wenn du es bist.",
    centerSubtitle:
      "Schreibe natürlich. Falls nötig, leite ich dich in den richtigen Ablauf.",
    recentTitle: "Kürzlich",
    newChat: "Neuer Chat",
    searchPlaceholder: "Chats durchsuchen...",
    composerPlaceholder: "Frag irgendetwas",
    send: "Senden",
    thinking: "Schreibt...",
    noThreads: "Noch keine gespeicherten Chats",
    copy: "Kopieren",
    like: "Gefällt mir",
    dislike: "Gefällt mir nicht",
    share: "Teilen",
    delete: "Löschen",
    liveWeb: "Live-Web",
    deepResearch: "Tiefenrecherche",
    projectAgent: "Projekt-Agent",
    voiceMode: "Sprachmodus",
    voiceInput: "Sprache",
    limited: "begrenzt",
    active: "aktiv",
    tools: "Werkzeuge",
    menu: "Menü",
    usageTitle: "Nutzung",
    usageRunning: "läuft",
    usageDone: "fertig",
    usageEstimated: "Geschätzte Tokens",
    usageTotal: "Tokens gesamt",
    usageInput: "Input",
    usageOutput: "Output",
    usageCredit: "Credits",
    usageSteps: "Steps",
    usageTools: "Tools",
    plusMenu: {
      image: "Bild hinzufügen",
      file: "Datei hinzufügen",
      audio: "Audio hinzufügen",
    },
  },
  ku: {
    centerTitle: "Dema tu amade bî, ez amade me.",
    centerSubtitle:
      "Bi awayekî xwezayî binivîse. Heke pêwîst be ez ê te bînim rêya rast.",
    recentTitle: "Nêzîk de",
    newChat: "Sohbeta nû",
    searchPlaceholder: "Li sohbetan bigere...",
    composerPlaceholder: "Her tiştî bipirse",
    send: "Bişîne",
    thinking: "Tê nivîsandin...",
    noThreads: "Hê sohbeta tomar kirî tune ye",
    copy: "Kopî bike",
    like: "Hez kir",
    dislike: "Hez nekir",
    share: "Parve bike",
    delete: "Jê bibe",
    liveWeb: "Weba zindî",
    deepResearch: "Lêkolîna kûr",
    projectAgent: "Ajana projeyê",
    voiceMode: "Moda dengê",
    voiceInput: "Deng",
    limited: "sînorkirî",
    active: "çalak",
    tools: "Amûr",
    menu: "Menû",
    usageTitle: "Bikaranîn",
    usageRunning: "dixebite",
    usageDone: "qediya",
    usageEstimated: "Token texmînî",
    usageTotal: "Hemû token",
    usageInput: "Input",
    usageOutput: "Output",
    usageCredit: "Kredî",
    usageSteps: "Step",
    usageTools: "Amûr",
    plusMenu: {
      image: "Wêne zêde bike",
      file: "Pel zêde bike",
      audio: "Deng zêde bike",
    },
  },
} as const;

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: {
    transcript: string;
  };
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type ChatUsageMode = "basic" | "live_web" | "deep_research" | "project_agent";

type ChatUsageSnapshot = {
  status: "idle" | "running" | "done";
  mode: ChatUsageMode;
  estimatedTokens: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  creditCost?: number;
  steps?: number;
  toolCalls?: number;
};

function getChatTexts(language: string): ChatTexts {
  return CHAT_TEXTS[language as keyof typeof CHAT_TEXTS] ?? CHAT_TEXTS.en;
}

function detectIntent(text: string): V2IntentType {
  const q = text.toLowerCase();

  if (
    q.includes("şarkı") ||
    q.includes("müzik") ||
    q.includes("song") ||
    q.includes("music") ||
    q.includes("stran")
  ) {
    return "music";
  }

  if (
    q.includes("resimden video") ||
    q.includes("image to video") ||
    q.includes("bu resmi hareketlendir") ||
    q.includes("görseli videoya çevir")
  ) {
    return "image-to-video";
  }

  if (
    q.includes("video clone") ||
    q.includes("video klone") ||
    q.includes("karakter değiştir") ||
    q.includes("kişiyi değiştir")
  ) {
    return "video-clone";
  }

  if (
    q.includes("video oluştur") ||
    q.includes("video üret") ||
    q.includes("text to video") ||
    q.includes("yazıdan video")
  ) {
    return "text-to-video";
  }

  if (
    q.includes("resim oluştur") ||
    q.includes("görsel oluştur") ||
    q.includes("text to image") ||
    q.includes("yazıdan resim") ||
    q.includes("fotoğraf oluştur")
  ) {
    return "text-to-image";
  }

  return "chat";
}

function isGenerationIntent(intent: V2IntentType) {
  return (
    intent === "music" ||
    intent === "text-to-image" ||
    intent === "text-to-video" ||
    intent === "image-to-video" ||
    intent === "video-clone"
  );
}

function filterThreads(threads: ChatThread[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return threads;

  return threads.filter((thread) => {
    if (thread.title.toLowerCase().includes(q)) return true;
    return thread.messages.some((message) =>
      message.content.toLowerCase().includes(q)
    );
  });
}

function buildAttachmentFromFile(
  file: File,
  type: ChatAttachmentType
): ComposerAttachment {
  return {
    id: createId("att"),
    type,
    name: file.name,
    url: URL.createObjectURL(file),
    mimeType: file.type,
    size: file.size,
    file,
  };
}

function CopyIcon() {
  return <span aria-hidden="true">⧉</span>;
}
function LikeIcon() {
  return <span aria-hidden="true">👍</span>;
}
function DislikeIcon() {
  return <span aria-hidden="true">👎</span>;
}
function ShareIcon() {
  return <span aria-hidden="true">↗</span>;
}

function estimateTokenCount(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return 0;
  return Math.max(1, Math.ceil(normalized.length / 4));
}

function normalizeIncomingUsage(value: unknown): Partial<ChatUsageSnapshot> {
  if (!value || typeof value !== "object") return {};

  const usage = value as Record<string, unknown>;
  const mode =
    usage.mode === "basic" ||
    usage.mode === "live_web" ||
    usage.mode === "deep_research" ||
    usage.mode === "project_agent"
      ? usage.mode
      : undefined;

  const inputTokens =
    typeof usage.inputTokens === "number"
      ? usage.inputTokens
      : typeof usage.input_tokens === "number"
      ? usage.input_tokens
      : undefined;
  const outputTokens =
    typeof usage.outputTokens === "number"
      ? usage.outputTokens
      : typeof usage.output_tokens === "number"
      ? usage.output_tokens
      : undefined;
  const totalTokens =
    typeof usage.totalTokens === "number"
      ? usage.totalTokens
      : typeof usage.total_tokens === "number"
      ? usage.total_tokens
      : inputTokens !== undefined && outputTokens !== undefined
      ? inputTokens + outputTokens
      : undefined;

  return {
    mode,
    inputTokens,
    outputTokens,
    totalTokens,
    creditCost:
      typeof usage.creditCost === "number" ? usage.creditCost : undefined,
    steps: typeof usage.steps === "number" ? usage.steps : undefined,
    toolCalls:
      typeof usage.toolCalls === "number" ? usage.toolCalls : undefined,
  };
}

function parseSSEChunk(chunk: string) {
  const lines = chunk.split("\n");
  const texts: string[] = [];
  let usage: Partial<ChatUsageSnapshot> | null = null;

  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;

    const payload = line.slice(6).trim();
    if (!payload || payload === "[DONE]") continue;

    try {
      const json = JSON.parse(payload);
      const eventType = json?.type;

      if (eventType === "dubles.usage") {
        usage = normalizeIncomingUsage(json?.usage);
        continue;
      }

      if (eventType === "response.completed" && json?.response?.usage) {
        usage = normalizeIncomingUsage(json.response.usage);
        continue;
      }

      if (eventType === "response.output_text.delta") {
        if (typeof json?.delta === "string" && json.delta.length > 0) {
          texts.push(json.delta);
        }
        continue;
      }

      if (
        typeof json?.delta === "string" &&
        json?.type &&
        String(json.type).includes("output_text") &&
        String(json.type).includes("delta")
      ) {
        texts.push(json.delta);
      }
    } catch {
      // ignore malformed event
    }
  }

  return {
    text: texts.join(""),
    usage,
  };
}

function sanitizeAttachments(items: ComposerAttachment[]): ChatAttachment[] {
  return items.map((item) => ({
    id: item.id,
    type: item.type,
    name: item.name,
    url: item.url,
    mimeType: item.mimeType,
    size: item.size,
  }));
}

function getFirstAttachment(
  items: ComposerAttachment[],
  type: ChatAttachmentType
) {
  return items.find((item) => item.type === type && item.file);
}

function buildFallbackLyrics(prompt: string, language: string) {
  const cleanPrompt = prompt.trim() || "modern emotional song";

  if (language === "tr") {
    return `[Verse]\n${cleanPrompt}\nKalbimde yankı, gecede ışık\nAdım adım büyür içimde bu şarkı\n\n[Chorus]\nGel benimle, sesimiz yükselsin\nBu gece ritim hiç eksilmesin\nHayalimiz yolda, kalbimiz hazır\nYeni bir hikaye bizimle başlasın`;
  }

  if (language === "de") {
    return `[Verse]\n${cleanPrompt}\nLicht in der Nacht, ein leiser Klang\nWir gehen weiter, Schritt für Schritt entlang\n\n[Chorus]\nBleib bei mir, die Stimmen werden groß\nDieser Moment lässt uns nicht mehr los\nUnser Traum ist nah, der Weg ist klar\nWir singen weiter, wunderbar`;
  }

  if (language === "ku") {
    return `[Verse]\n${cleanPrompt}\nDi şevê de ronahî, di dil de awaz\nGav bi gav em diçin, hêvî tê nav me\n\n[Chorus]\nWere bi min, dengê me bilind be\nEv şev bi ritmê xwe zindî be\nXewnên me nêzîk, dilê me amade\nStrana nû bi me re dest pê dike`;
  }

  return `[Verse]\n${cleanPrompt}\nLight in the night and fire in the heart\nStep by step we turn it into art\n\n[Chorus]\nStay with me, let the voices rise\nThis moment opens up the skies\nThe dream is near, the road is bright\nWe sing it louder through the night`;
}

function inferSongLanguage(language: string) {
  if (language === "tr" || language === "de" || language === "ku") {
    return language;
  }
  return "en";
}

export default function ChatPage() {
  const { language } = useLanguage();
  const { user, refreshSession } = useSession();
  const sessionHeaders = user
  ? {
      "Content-Type": "application/json",
      "x-user-id": user.id,
      "x-user-email": user.email,
      "x-user-name": user.name,
    }
  : {
      "Content-Type": "application/json",
    };

  const common = getCommonI18n(language);
  const t = getChatTexts(language);
  const access = useMemo(
    () => getChatAccess(user?.planCode),
    [user?.planCode]
  );

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [threadSearch, setThreadSearch] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [composerMenuOpen, setComposerMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isMobile = useIsMobile(900);
  const [isListening, setIsListening] = useState(false);
  const [voiceRepliesEnabled, setVoiceRepliesEnabled] = useState(false);
  const [liveWebRequested, setLiveWebRequested] = useState(false);
  const [deepResearchRequested, setDeepResearchRequested] = useState(false);
  const [projectAgentRequested, setProjectAgentRequested] = useState(true);
  const [webUsageCount, setWebUsageCount] = useState(0);
  const [usageSnapshot, setUsageSnapshot] = useState<ChatUsageSnapshot>({
    status: "idle",
    mode: "basic",
    estimatedTokens: 0,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messageScrollRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const storageEmail = user?.email ?? null;

  useEffect(() => {
    const nextThreads = readThreads(storageEmail);
    const storedActiveId = readActiveThreadId(storageEmail);

    setThreads(nextThreads);

    if (storedActiveId && nextThreads.some((thread) => thread.id === storedActiveId)) {
      setActiveThreadId(storedActiveId);
      return;
    }

    setActiveThreadId(nextThreads[0]?.id || null);
  }, [storageEmail]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [input]);

  const activeThread = useMemo(
    () =>
      activeThreadId
        ? threads.find((thread) => thread.id === activeThreadId) || null
        : null,
    [activeThreadId, threads]
  );

  const messages: ChatMessage[] = useMemo(() => {
    if (activeThread?.messages?.length) return activeThread.messages;
    return [];
  }, [activeThread]);

  const hasStartedConversation = useMemo(
    () => Boolean(activeThread && activeThread.messages.length > 0),
    [activeThread]
  );

  const filteredThreads = useMemo(
    () => filterThreads(threads, threadSearch),
    [threadSearch, threads]
  );

  const liveWebLimitReached =
    webUsageCount >= access.maxWebQueriesPerThread;

  function getRequestedUsageMode(): ChatUsageMode {
    if (projectAgentRequested && access.canUseProjectAgent) {
      return "project_agent";
    }
    if (deepResearchRequested && access.canUseDeepResearch) {
      return "deep_research";
    }
    if (
      liveWebRequested &&
      access.canUseLiveWeb &&
      !liveWebLimitReached
    ) {
      return "live_web";
    }
    return "basic";
  }

  function getUsageCreditCost(mode: ChatUsageMode) {
    if (mode === "project_agent") {
      return access.canEditProjectFiles
        ? access.projectAgentEditCreditCost
        : access.projectAgentReadCreditCost;
    }
    if (mode === "deep_research") return access.deepResearchCreditCost;
    if (mode === "live_web") return access.liveWebCreditCost;
    return 1;
  }

  function getUsageModeLabel(mode: ChatUsageMode) {
    if (mode === "project_agent") return t.projectAgent;
    if (mode === "deep_research") return t.deepResearch;
    if (mode === "live_web") return t.liveWeb;
    return "Chat";
  }

  function mergeUsageSnapshot(nextUsage: Partial<ChatUsageSnapshot>) {
    setUsageSnapshot((prev) => ({
      ...prev,
      ...nextUsage,
      status: "done",
      mode: nextUsage.mode ?? prev.mode,
      estimatedTokens: Math.max(
        prev.estimatedTokens,
        nextUsage.estimatedTokens ?? 0
      ),
      creditCost: nextUsage.creditCost ?? prev.creditCost,
    }));
  }

  useEffect(() => {
    const el = messageScrollRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  function startNewChat() {
    setActiveThreadId(null);
    writeActiveThreadId(null, storageEmail);
    setInput("");
    setAttachments([]);
    setComposerMenuOpen(false);
    setMobileSidebarOpen(false);
    setWebUsageCount(0);
    setUsageSnapshot({
      status: "idle",
      mode: "basic",
      estimatedTokens: 0,
    });
  }

  function openThread(threadId: string) {
    setActiveThreadId(threadId);
    writeActiveThreadId(threadId, storageEmail);
    setComposerMenuOpen(false);
    setMobileSidebarOpen(false);
    setUsageSnapshot({
      status: "idle",
      mode: "basic",
      estimatedTokens: 0,
    });
  }

  function removeThread(threadId: string) {
    const next = deleteThread(threadId, storageEmail);
    setThreads(next);

    const nextActive = readActiveThreadId(storageEmail);
    setActiveThreadId(nextActive);
  }

  function triggerAttachmentPicker(type: ChatAttachmentType) {
    setComposerMenuOpen(false);

    if (type === "image") {
      imageInputRef.current?.click();
      return;
    }

    if (type === "audio") {
      audioInputRef.current?.click();
      return;
    }

    fileInputRef.current?.click();
  }

  function handleAttachmentChange(
    event: ChangeEvent<HTMLInputElement>,
    type: ChatAttachmentType
  ) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const next = files.map((file) => buildAttachmentFromFile(file, type));
    setAttachments((prev) => [...prev, ...next]);
    event.target.value = "";
  }

  function removeAttachment(attachmentId: string) {
    setAttachments((prev) => prev.filter((item) => item.id !== attachmentId));
  }

  function speakAssistantText(text: string) {
    if (!voiceRepliesEnabled || !access.canUseVoiceMode) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const cleanText = text.replace(/```[\s\S]*?```/g, "").trim();
    if (!cleanText) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText.slice(0, 900));
    utterance.lang =
      language === "tr"
        ? "tr-TR"
        : language === "de"
        ? "de-DE"
        : language === "ku"
        ? "ku-TR"
        : "en-US";
    window.speechSynthesis.speak(utterance);
  }

  async function postJson(path: string, payload: Record<string, unknown>) {
    const response = await fetch(path, {
      method: "POST",
      headers: sessionHeaders,
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.ok) {
      throw new Error(data?.error || "Generation request failed");
    }

    return data as Record<string, unknown>;
  }

  async function runGenerationInChat(
    intent: V2IntentType,
    text: string,
    currentAttachments: ComposerAttachment[]
  ): Promise<{ content: string; generation?: ChatGenerationResult }> {
    const title = compactTitle(text, "Generated result");
    const now = new Date().toISOString();

    if (intent === "text-to-image") {
      const data = await postJson("/api/generate", {
        mode: "text_to_image",
        prompt: text,
        style: "cinematic",
        ratio: "16:9",
        preview: false,
      });

      const imageUrl = String(data.imageUrl || "");
      if (!imageUrl) throw new Error("Image output is empty");

      addV2HistoryItem({
        id: makeHistoryId("chat-image"),
        type: "image",
        title,
        createdAt: now,
        url: imageUrl,
        prompt: text,
      });

      await refreshSession();

      return {
        content: "Görsel hazır. Sonucu burada ekledim.",
        generation: {
          kind: "image",
          title,
          url: imageUrl,
          prompt: text,
        },
      };
    }

    if (intent === "text-to-video") {
      const data = await postJson("/api/generate", {
        mode: "text_to_video",
        prompt: text,
        style: "cinematic",
        ratio: "16:9",
        durationSec: 8,
        preview: false,
      });

      const videoUrl = String(data.videoUrl || "");
      if (!videoUrl) throw new Error("Video output is empty");

      addV2HistoryItem({
        id: makeHistoryId("chat-video"),
        type: "text_video",
        title,
        createdAt: now,
        url: videoUrl,
        prompt: text,
        durationSec: 8,
      });

      await refreshSession();

      return {
        content: "Video hazır. Sonucu sohbet içine ekledim.",
        generation: {
          kind: "video",
          title,
          url: videoUrl,
          prompt: text,
          durationSec: 8,
        },
      };
    }

    if (intent === "image-to-video") {
      const imageAttachment = getFirstAttachment(currentAttachments, "image");

      if (!imageAttachment?.file) {
        return {
          content:
            "Resimden video üretmek için mesajına bir görsel ekle. Görseli ekleyip aynı isteği tekrar gönderdiğinde burada üreteceğim.",
        };
      }

      const imageUrl = await uploadGenerationAsset(imageAttachment.file, "image");
      const data = await postJson("/api/generate", {
        mode: "image_to_video",
        imageUrl,
        prompt: text,
        style: "cinematic",
        ratio: "16:9",
        durationSec: 8,
        preview: false,
      });

      const videoUrl = String(data.videoUrl || "");
      if (!videoUrl) throw new Error("Video output is empty");

      addV2HistoryItem({
        id: makeHistoryId("chat-image-video"),
        type: "image_video",
        title,
        createdAt: now,
        url: videoUrl,
        thumbnailUrl: imageUrl,
        prompt: text,
        durationSec: 8,
      });

      await refreshSession();

      return {
        content: "Görseli videoya dönüştürdüm. Sonuç burada.",
        generation: {
          kind: "video",
          title,
          url: videoUrl,
          prompt: text,
          thumbnailUrl: imageUrl,
          durationSec: 8,
        },
      };
    }

    if (intent === "video-clone") {
      const videoAttachment = currentAttachments.find(
        (item) => item.file && item.file.type.startsWith("video/")
      );
      const imageAttachment = getFirstAttachment(currentAttachments, "image");

      if (!videoAttachment?.file || !imageAttachment?.file) {
        return {
          content:
            "Video clone için aynı mesaja bir kaynak video ve bir referans görsel ekle. İstersen kendi ses tonun için ses dosyası da ekleyebilirsin.",
        };
      }

      const audioAttachment = getFirstAttachment(currentAttachments, "audio");
      const sourceVideoUrl = await uploadGenerationAsset(videoAttachment.file, "video");
      const referenceImageUrl = await uploadGenerationAsset(
        imageAttachment.file,
        "image"
      );
      const voiceSampleUrl = audioAttachment?.file
        ? await uploadGenerationAsset(audioAttachment.file, "audio")
        : "";
      const wantsFaceOnly =
        text.toLowerCase().includes("sadece yüz") ||
        text.toLowerCase().includes("face");

      const data = await postJson("/api/video-clone", {
        sourceVideoUrl,
        referenceImageUrl,
        voiceSampleUrl: voiceSampleUrl || undefined,
        prompt: text,
        title,
        cloneMode: wantsFaceOnly ? "face" : "character",
        voiceMode: voiceSampleUrl ? "own_voice" : "original",
        preserveAudio: true,
        resolution: "720",
      });

      const videoUrl = String(data.videoUrl || "");
      if (!videoUrl) throw new Error("Clone output is empty");

      addV2HistoryItem({
        id: makeHistoryId("chat-clone"),
        type: "video_clone",
        title,
        createdAt: now,
        url: videoUrl,
        thumbnailUrl: referenceImageUrl,
        prompt: text,
      });

      await refreshSession();

      return {
        content: data.voiceCloneNote
          ? `Video clone hazır. Not: ${String(data.voiceCloneNote)}`
          : "Video clone hazır. Sonucu burada ekledim.",
        generation: {
          kind: "video",
          title,
          url: videoUrl,
          prompt: text,
          thumbnailUrl: referenceImageUrl,
        },
      };
    }

    if (intent === "music") {
      const audioAttachment = getFirstAttachment(currentAttachments, "audio");
      const wantsOwnVoice =
        text.toLowerCase().includes("kendi ses") ||
        text.toLowerCase().includes("own voice");
      const voiceSampleUrl =
        wantsOwnVoice && audioAttachment?.file
          ? await uploadGenerationAsset(audioAttachment.file, "audio")
          : "";
      const songLanguage = inferSongLanguage(language);
      const lyrics = buildFallbackLyrics(text, songLanguage);

      const data = await postJson("/api/music", {
        mode: "song",
        title,
        prompt: text,
        lyrics,
        durationSec: 60,
        language: songLanguage,
        vocalType: "ai_female",
        vocalMode: voiceSampleUrl ? "own_voice" : "preset",
        voiceSampleUrl: voiceSampleUrl || undefined,
        mood: "Pop / Commercial",
        genre: "Pop / Commercial",
        tempo: "orta",
        instrumental: false,
        cleanLyrics: true,
      });

      const audioUrl = String(data.audioUrl || "");
      if (!audioUrl) throw new Error("Audio output is empty");

      addV2HistoryItem({
        id: makeHistoryId("chat-music"),
        type: "music",
        title,
        createdAt: now,
        url: audioUrl,
        prompt: text,
        durationSec: 60,
      });

      await refreshSession();

      return {
        content: data.voiceCloneNote
          ? `Müzik hazır. Not: ${String(data.voiceCloneNote)}`
          : "Müzik hazır. Buradan dinleyebilirsin.",
        generation: {
          kind: "audio",
          title,
          url: audioUrl,
          prompt: text,
          durationSec: 60,
        },
      };
    }

    return { content: "" };
  }

  function handleVoiceInput() {
    if (!access.canUseVoiceMode || typeof window === "undefined") return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const speechWindow = window as SpeechWindow;
    const Recognition =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setInput((prev) =>
        prev.trim()
          ? prev
          : "Bu tarayıcı sesli komutu desteklemiyor. Chrome veya Safari ile deneyebilirsin."
      );
      return;
    }

    const recognition = new Recognition();
    recognition.lang =
      language === "tr"
        ? "tr-TR"
        : language === "de"
        ? "de-DE"
        : language === "ku"
        ? "ku-TR"
        : "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();

      if (transcript) setInput(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }

 async function handleSend(prefillText?: string) {
  const text = (prefillText ?? input).trim();
  if ((!text && attachments.length === 0) || loading) return;

  const composerAttachments = attachments;
  const userMessage = createMessage(
    "user",
    text,
    sanitizeAttachments(composerAttachments)
  );
  let workingThreadId = activeThreadId;

  if (!workingThreadId) {
    const newThread = createThreadFromFirstMessage(userMessage);
    const nextThreads = upsertThread(newThread, storageEmail);
    setThreads(nextThreads);
    setActiveThreadId(newThread.id);
    workingThreadId = newThread.id;
  } else {
    const updated = appendMessagesToThread(
      workingThreadId,
      [userMessage],
      storageEmail
    );
    if (updated) {
      setThreads(readThreads(storageEmail));
    }
  }

  setInput("");
  setAttachments([]);
  setLoading(true);

  try {
    const intent = detectIntent(text);

    if (isGenerationIntent(intent)) {
      setUsageSnapshot({
        status: "idle",
        mode: "basic",
        estimatedTokens: 0,
      });

      const generationResult = await runGenerationInChat(
        intent,
        text,
        composerAttachments
      );
      const assistantMessage = createMessage(
        "assistant",
        generationResult.content,
        undefined,
        generationResult.generation
      );

      if (workingThreadId) {
        appendMessagesToThread(
          workingThreadId,
          [assistantMessage],
          storageEmail
        );
        setThreads(readThreads(storageEmail));
      }

      speakAssistantText(generationResult.content);

      setLoading(false);
      return;
    }

    const requestedUsageMode = getRequestedUsageMode();
    const promptEstimate = estimateTokenCount(
      [
        ...messages
          .filter((message) => message.content.trim().length > 0)
          .map((message) => message.content),
        text,
      ].join("\n")
    );

    setUsageSnapshot({
      status: requestedUsageMode === "basic" ? "idle" : "running",
      mode: requestedUsageMode,
      estimatedTokens: promptEstimate,
      creditCost: getUsageCreditCost(requestedUsageMode),
    });

    const assistantMessageId = createId("msg");
    const placeholderAssistant: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      liked: null,
    };

    if (workingThreadId) {
      appendMessagesToThread(
        workingThreadId,
        [placeholderAssistant],
        storageEmail
      );
      setThreads(readThreads(storageEmail));
    }

   const response = await fetch("/api/ai/chat", {
  method: "POST",
  headers: sessionHeaders,
  body: JSON.stringify({
    messages: [
      ...messages
        .filter(
          (m) =>
            typeof m.content === "string" &&
            m.content.trim().length > 0
        )
        .map((m) => ({
          role: m.role === "system" ? "system" : m.role,
          content: m.content.trim(),
        })),
      {
        role: "user",
        content: text.trim() || "[Attachment message]",
      },
    ],
    language,
    planCode: user?.planCode || "free",
    enableLiveWeb: liveWebRequested && !liveWebLimitReached,
    enableDeepResearch: deepResearchRequested,
    enableProjectAgent: projectAgentRequested && access.canUseProjectAgent,
    webUsageCount,
  }),
});

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => "");
      throw new Error(errorText || "Chat response failed");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let assistantText = "";

    while (!done) {
      const result = await reader.read();
      done = result.done;

      if (result.value) {
        const chunk = decoder.decode(result.value, { stream: true });
        const parsed = parseSSEChunk(chunk);
        const delta = parsed.text;

        if (parsed.usage) {
          mergeUsageSnapshot(parsed.usage);
        }

        if (delta) {
          assistantText += delta;

          if (requestedUsageMode !== "basic") {
            const nextEstimate =
              promptEstimate + estimateTokenCount(assistantText);
            setUsageSnapshot((prev) => ({
              ...prev,
              status: prev.status === "idle" ? "running" : prev.status,
              estimatedTokens: Math.max(prev.estimatedTokens, nextEstimate),
            }));
          }

          if (workingThreadId) {
            const thread = findThreadById(workingThreadId, storageEmail);

            if (thread) {
              const nextMessages = thread.messages.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: assistantText }
                  : msg
              );

              const updatedThread: ChatThread = {
                ...thread,
                messages: nextMessages,
                updatedAt: new Date().toISOString(),
              };

              const nextThreads = upsertThread(
                updatedThread,
                storageEmail
              );
              setThreads(nextThreads);
            }
          }
        }
      }
    }

    if (requestedUsageMode !== "basic") {
      setUsageSnapshot((prev) => ({
        ...prev,
        status: "done",
      }));
    }

    if (
      liveWebRequested &&
      access.canUseLiveWeb &&
      !liveWebLimitReached
    ) {
      setWebUsageCount((prev) => prev + 1);
    }

    speakAssistantText(assistantText);
  } catch (error) {
    console.error("Chat send error:", error);
    setUsageSnapshot((prev) =>
      prev.status === "running" ? { ...prev, status: "done" } : prev
    );

    if (workingThreadId) {
      const thread = findThreadById(workingThreadId, storageEmail);

      if (thread) {
        const fallbackMessage = createMessage(
          "assistant",
          common.states.error
        );

        const nextMessages = thread.messages.filter(
          (msg) => msg.content.trim().length > 0
        );

        nextMessages.push(fallbackMessage);

        const updatedThread: ChatThread = {
          ...thread,
          messages: nextMessages,
          updatedAt: new Date().toISOString(),
        };

        const nextThreads = upsertThread(updatedThread, storageEmail);
        setThreads(nextThreads);
      }
    }
  } finally {
    setLoading(false);
  }
}

  function handleCopy(content: string) {
    navigator.clipboard.writeText(content).catch(() => {});
  }

  function renderUsagePanel() {
    if (usageSnapshot.status === "idle" || usageSnapshot.mode === "basic") {
      return null;
    }

    const hasExactUsage =
      typeof usageSnapshot.totalTokens === "number" &&
      usageSnapshot.totalTokens > 0;
    const displayedTokens = hasExactUsage
      ? usageSnapshot.totalTokens
      : usageSnapshot.estimatedTokens;

    return (
      <div style={styles.usagePanel}>
        <div style={styles.usagePanelHeader}>
          <span>{t.usageTitle}</span>
          <span style={styles.usageStatus}>
            {usageSnapshot.status === "running"
              ? t.usageRunning
              : t.usageDone}
          </span>
        </div>

        <div style={styles.usageModeText}>
          {getUsageModeLabel(usageSnapshot.mode)}
        </div>

        <div style={styles.usageMetricGrid}>
          <div style={styles.usageMetric}>
            <span style={styles.usageMetricLabel}>
              {hasExactUsage ? t.usageTotal : t.usageEstimated}
            </span>
            <strong style={styles.usageMetricValue}>
              {displayedTokens.toLocaleString()}
            </strong>
          </div>

          <div style={styles.usageMetric}>
            <span style={styles.usageMetricLabel}>{t.usageCredit}</span>
            <strong style={styles.usageMetricValue}>
              {(usageSnapshot.creditCost ?? 0).toLocaleString()}
            </strong>
          </div>

          {hasExactUsage ? (
            <>
              <div style={styles.usageMetric}>
                <span style={styles.usageMetricLabel}>{t.usageInput}</span>
                <strong style={styles.usageMetricValue}>
                  {(usageSnapshot.inputTokens ?? 0).toLocaleString()}
                </strong>
              </div>
              <div style={styles.usageMetric}>
                <span style={styles.usageMetricLabel}>{t.usageOutput}</span>
                <strong style={styles.usageMetricValue}>
                  {(usageSnapshot.outputTokens ?? 0).toLocaleString()}
                </strong>
              </div>
            </>
          ) : null}

          {usageSnapshot.steps ? (
            <div style={styles.usageMetric}>
              <span style={styles.usageMetricLabel}>{t.usageSteps}</span>
              <strong style={styles.usageMetricValue}>
                {usageSnapshot.steps.toLocaleString()}
              </strong>
            </div>
          ) : null}

          {usageSnapshot.toolCalls ? (
            <div style={styles.usageMetric}>
              <span style={styles.usageMetricLabel}>{t.usageTools}</span>
              <strong style={styles.usageMetricValue}>
                {usageSnapshot.toolCalls.toLocaleString()}
              </strong>
            </div>
          ) : null}
        </div>
      </div>
    );
  }
    return (
    <AppShell currentPath="/chat">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleAttachmentChange(e, "image")}
        style={{ display: "none" }}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={(e) => handleAttachmentChange(e, "file")}
        style={{ display: "none" }}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        multiple
        onChange={(e) => handleAttachmentChange(e, "audio")}
        style={{ display: "none" }}
      />

      <div style={{ ...styles.page, ...(isMobile ? styles.pageMobile : null) }}>
        {isMobile ? (
          <>
            <div style={{ ...styles.mobileTopBar, ...styles.mobileTopBarVisible }}>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen((prev) => !prev)}
                style={styles.mobileMenuButton}
              >
                {t.menu}
              </button>
            </div>

            {mobileSidebarOpen ? (
              <div
                style={{ ...styles.mobileSidebarOverlay, ...styles.mobileSidebarOverlayVisible }}
                onClick={() => setMobileSidebarOpen(false)}
              />
            ) : null}
          </>
        ) : null}

        <aside
          style={{
            ...styles.sidebar,
            ...(isMobile ? styles.sidebarMobile : null),
            ...(isMobile && mobileSidebarOpen ? styles.sidebarMobileOpen : null),
          }}
        >
          <button type="button" onClick={startNewChat} style={styles.newChatButton}>
            <span style={styles.newChatButtonText}>{t.newChat}</span>
          </button>

          <input
            value={threadSearch}
            onChange={(e) => setThreadSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            style={styles.threadSearch}
          />

          <div style={styles.sidebarTitle}>{t.recentTitle}</div>

          <div style={styles.threadList}>
            {filteredThreads.length === 0 ? (
              <div style={styles.noThreads}>{t.noThreads}</div>
            ) : (
              filteredThreads.map((thread) => {
                const isActive = thread.id === activeThreadId;

                return (
                  <div
                    key={thread.id}
                    style={{
                      ...styles.threadItem,
                      ...(isActive ? styles.threadItemActive : null),
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => openThread(thread.id)}
                      style={styles.threadOpenButton}
                    >
                      <span style={styles.threadTitle}>{thread.title}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => removeThread(thread.id)}
                      style={styles.threadDeleteButton}
                      aria-label={t.delete}
                      title={t.delete}
                    >
                      ×
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div style={styles.sidebarTools}>
            <div style={styles.sidebarToolsTitle}>{t.tools}</div>

            <button
              type="button"
              onClick={() => {
                if (!liveWebRequested && liveWebLimitReached) return;
                setLiveWebRequested((prev) => !prev);
              }}
              style={{
                ...styles.sidebarToggleButton,
                ...(liveWebRequested ? styles.sidebarToggleButtonActive : null),
                ...(!access.canUseLiveWeb ||
                (!liveWebRequested && liveWebLimitReached)
                  ? styles.sendButtonDisabled
                  : null),
              }}
              disabled={!access.canUseLiveWeb}
            >
              {t.liveWeb}: {liveWebRequested ? "on" : "off"}{" "}
              ({webUsageCount}/{access.maxWebQueriesPerThread})
            </button>

            <button
              type="button"
              onClick={() => setDeepResearchRequested((prev) => !prev)}
              style={{
                ...styles.sidebarToggleButton,
                ...(deepResearchRequested ? styles.sidebarToggleButtonActive : null),
                ...(!access.canUseDeepResearch ? styles.sendButtonDisabled : null),
              }}
              disabled={!access.canUseDeepResearch}
            >
              {t.deepResearch}: {deepResearchRequested ? "on" : "off"}
            </button>

            <button
              type="button"
              onClick={() => setProjectAgentRequested((prev) => !prev)}
              style={{
                ...styles.sidebarToggleButton,
                ...(projectAgentRequested && access.canUseProjectAgent
                  ? styles.sidebarToggleButtonActive
                  : null),
                ...(!access.canUseProjectAgent ? styles.sendButtonDisabled : null),
              }}
              disabled={!access.canUseProjectAgent}
            >
              {t.projectAgent}:{" "}
              {projectAgentRequested && access.canUseProjectAgent ? "on" : "off"}
            </button>

            <button
              type="button"
              onClick={() => setVoiceRepliesEnabled((prev) => !prev)}
              style={{
                ...styles.sidebarToggleButton,
                ...(voiceRepliesEnabled ? styles.sidebarToggleButtonActive : null),
                ...(!access.canUseVoiceMode ? styles.sendButtonDisabled : null),
              }}
              disabled={!access.canUseVoiceMode}
            >
              {t.voiceMode}: {voiceRepliesEnabled ? "on" : "off"}
            </button>

            {renderUsagePanel()}
          </div>
        </aside>

        <section style={styles.chatArea}>
          {!hasStartedConversation ? (
            <div style={styles.centerStage}>
              <div style={styles.centerContent}>
                <h1 style={styles.centerTitle}>{t.centerTitle}</h1>
                <p style={styles.centerSubtitle}>{t.centerSubtitle}</p>

                <div style={styles.centerComposer}>
                  <div style={styles.composerRow}>
                    <div style={styles.plusWrap}>
                      <button
                        type="button"
                        style={styles.plusButton}
                        onClick={() => setComposerMenuOpen((prev) => !prev)}
                      >
                        +
                      </button>

                      {composerMenuOpen ? (
                        <div style={styles.plusMenu}>
                          <button
                            type="button"
                            style={styles.plusMenuItem}
                            onClick={() => triggerAttachmentPicker("image")}
                          >
                            {t.plusMenu.image}
                          </button>
                          <button
                            type="button"
                            style={styles.plusMenuItem}
                            onClick={() => triggerAttachmentPicker("file")}
                          >
                            {t.plusMenu.file}
                          </button>
                          <button
                            type="button"
                            style={styles.plusMenuItem}
                            onClick={() => triggerAttachmentPicker("audio")}
                          >
                            {t.plusMenu.audio}
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={handleVoiceInput}
                      style={{
                        ...styles.voiceButton,
                        ...(isListening ? styles.voiceButtonActive : null),
                        ...(!access.canUseVoiceMode ? styles.sendButtonDisabled : null),
                      }}
                      disabled={!access.canUseVoiceMode}
                      title={t.voiceInput}
                    >
                      ◌
                    </button>

                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={t.composerPlaceholder}
                      style={styles.textarea}
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void handleSend();
                        }
                      }}
                    />

                    <button
                      type="button"
                      style={{
                        ...styles.sendButton,
                        ...((loading || (!input.trim() && attachments.length === 0))
                          ? styles.sendButtonDisabled
                          : null),
                      }}
                      disabled={loading || (!input.trim() && attachments.length === 0)}
                      onClick={() => void handleSend()}
                    >
                      {t.send}
                    </button>
                  </div>

                  {attachments.length > 0 ? (
                    <div style={styles.attachmentRow}>
                      {attachments.map((attachment) => (
                        <div key={attachment.id} style={styles.attachmentChip}>
                          <span style={styles.attachmentName}>{attachment.name}</span>
                          <button
                            type="button"
                            style={styles.attachmentRemove}
                            onClick={() => removeAttachment(attachment.id)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.chatLayout}>
              <div ref={messageScrollRef} style={styles.messageScroll}>
                <div style={styles.messageList}>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      style={{
                        ...styles.messageRow,
                        justifyContent:
                          message.role === "user" ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          ...styles.messageBubble,
                          ...(message.role === "user"
                            ? styles.userBubble
                            : styles.assistantBubble),
                        }}
                      >
                        <div style={styles.messageContent}>{message.content}</div>

                        {message.attachments?.length ? (
                          <div style={styles.messageAttachmentList}>
                            {message.attachments.map((attachment) => (
                              <div key={attachment.id} style={styles.messageAttachmentItem}>
                                {attachment.name}
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {message.generation ? (
                          <div style={styles.generationCard}>
                            <div style={styles.generationTitle}>
                              {message.generation.title}
                            </div>
                            {message.generation.kind === "image" ? (
                              <img
                                src={message.generation.url}
                                alt={message.generation.title}
                                style={styles.generatedImage}
                              />
                            ) : null}
                            {message.generation.kind === "video" ? (
                              <video
                                controls
                                playsInline
                                src={message.generation.url}
                                style={styles.generatedVideo}
                              />
                            ) : null}
                            {message.generation.kind === "audio" ? (
                              <audio
                                controls
                                src={message.generation.url}
                                style={styles.generatedAudio}
                              />
                            ) : null}
                            <a
                              href={message.generation.url}
                              download
                              style={styles.generationLink}
                            >
                              Dosyayı aç / indir
                            </a>
                          </div>
                        ) : null}

                        {message.role === "assistant" ? (
                          <div style={styles.messageActions}>
                            <button
                              type="button"
                              style={styles.iconAction}
                              onClick={() => handleCopy(message.content)}
                              title={t.copy}
                              aria-label={t.copy}
                            >
                              <CopyIcon />
                            </button>
                            <button
                              type="button"
                              style={styles.iconAction}
                              title={t.like}
                              aria-label={t.like}
                            >
                              <LikeIcon />
                            </button>
                            <button
                              type="button"
                              style={styles.iconAction}
                              title={t.dislike}
                              aria-label={t.dislike}
                            >
                              <DislikeIcon />
                            </button>
                            <button
                              type="button"
                              style={styles.iconAction}
                              title={t.share}
                              aria-label={t.share}
                            >
                              <ShareIcon />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}

                  {loading ? (
                    <div style={styles.messageRow}>
                      <div style={styles.assistantBubble}>{t.thinking}</div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div style={styles.bottomDock}>
                <div style={styles.composerBox}>
                  <div style={styles.composerRow}>
                    <div style={styles.plusWrap}>
                      <button
                        type="button"
                        style={styles.plusButton}
                        onClick={() => setComposerMenuOpen((prev) => !prev)}
                      >
                        +
                      </button>

                      {composerMenuOpen ? (
                        <div style={styles.plusMenu}>
                          <button
                            type="button"
                            style={styles.plusMenuItem}
                            onClick={() => triggerAttachmentPicker("image")}
                          >
                            {t.plusMenu.image}
                          </button>
                          <button
                            type="button"
                            style={styles.plusMenuItem}
                            onClick={() => triggerAttachmentPicker("file")}
                          >
                            {t.plusMenu.file}
                          </button>
                          <button
                            type="button"
                            style={styles.plusMenuItem}
                            onClick={() => triggerAttachmentPicker("audio")}
                          >
                            {t.plusMenu.audio}
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={handleVoiceInput}
                      style={{
                        ...styles.voiceButton,
                        ...(isListening ? styles.voiceButtonActive : null),
                        ...(!access.canUseVoiceMode ? styles.sendButtonDisabled : null),
                      }}
                      disabled={!access.canUseVoiceMode}
                      title={t.voiceInput}
                    >
                      ◌
                    </button>

                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={t.composerPlaceholder}
                      style={styles.textarea}
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void handleSend();
                        }
                      }}
                    />

                    <button
                      type="button"
                      style={{
                        ...styles.sendButton,
                        ...((loading || (!input.trim() && attachments.length === 0))
                          ? styles.sendButtonDisabled
                          : null),
                      }}
                      disabled={loading || (!input.trim() && attachments.length === 0)}
                      onClick={() => void handleSend()}
                    >
                      {t.send}
                    </button>
                  </div>

                  {attachments.length > 0 ? (
                    <div style={styles.attachmentRow}>
                      {attachments.map((attachment) => (
                        <div key={attachment.id} style={styles.attachmentChip}>
                          <span style={styles.attachmentName}>{attachment.name}</span>
                          <button
                            type="button"
                            style={styles.attachmentRemove}
                            onClick={() => removeAttachment(attachment.id)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    display: "grid",
    gridTemplateColumns: "240px minmax(0, 1fr)",
    gap: 24,
    height: "calc(100dvh - 120px)",
    minHeight: "calc(100dvh - 120px)",
    maxHeight: "calc(100dvh - 120px)",
    alignItems: "stretch",
    overflow: "hidden",
  },

  pageMobile: {
    gridTemplateColumns: "1fr",
    gap: 10,
    height: "calc(100dvh - 110px)",
    minHeight: "calc(100dvh - 110px)",
    maxHeight: "calc(100dvh - 110px)",
  },

  mobileTopBar: {
    display: "none",
  },

  mobileTopBarVisible: {
    display: "flex",
    justifyContent: "flex-start",
  },

  mobileMenuButton: {
    height: 36,
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    borderRadius: 10,
    padding: "0 12px",
    fontSize: 14,
    color: "#111827",
  },

  mobileSidebarOverlay: {
    display: "none",
  },

  mobileSidebarOverlayVisible: {
    position: "fixed",
    inset: 0,
    display: "block",
    background: "rgba(15, 23, 42, 0.32)",
    zIndex: 55,
  },

  sidebar: {
    paddingTop: 4,
    paddingRight: 14,
    borderRight: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    height: "100%",
    overflow: "hidden",
    background: "#f7f7f8",
  },

  sidebarMobile: {
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    maxWidth: "82vw",
    transform: "translateX(-100%)",
    transition: "transform 0.25s ease",
    zIndex: 60,
    background: "#f7f7f8",
    padding: "18px 16px 16px",
    borderRight: "1px solid #e5e7eb",
  },

  sidebarMobileOpen: {
    transform: "translateX(0)",
  },

  newChatButton: {
    border: "none",
    background: "transparent",
    color: "#111827",
    cursor: "pointer",
    textAlign: "left",
    padding: "8px 0 12px",
  },

  newChatButtonText: {
    fontSize: 16,
    fontWeight: 500,
    color: "#111827",
  },

  threadSearch: {
    height: 38,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    padding: "0 12px",
    outline: "none",
    fontSize: 14,
    marginBottom: 14,
  },

  sidebarTitle: {
    fontSize: 12,
    lineHeight: 1.2,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#6b7280",
    marginBottom: 10,
  },

  threadList: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minHeight: 0,
    overflowY: "auto",
    flex: 1,
    scrollbarWidth: "thin",
  },

  noThreads: {
    fontSize: 14,
    color: "#6b7280",
    paddingTop: 8,
  },

  threadItem: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    padding: "2px 4px",
  },

  threadItemActive: {
    background: "#eceff3",
  },

  threadOpenButton: {
    border: "none",
    background: "transparent",
    textAlign: "left",
    cursor: "pointer",
    padding: "8px 8px",
    minWidth: 0,
  },

  threadTitle: {
    display: "block",
    fontSize: 14,
    color: "#111827",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  threadDeleteButton: {
    width: 28,
    height: 28,
    borderRadius: 999,
    border: "none",
    background: "transparent",
    color: "#9ca3af",
    cursor: "pointer",
    fontSize: 18,
    lineHeight: 1,
  },

  sidebarTools: {
    marginTop: "auto",
    paddingTop: 16,
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  sidebarToolsTitle: {
    fontSize: 12,
    lineHeight: 1.2,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#6b7280",
  },

  sidebarToolItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  sidebarToolLabel: {
    fontSize: 14,
    color: "#374151",
  },

  sidebarToolValue: {
    fontSize: 13,
    color: "#6b7280",
  },

  sidebarToggleButton: {
    minHeight: 34,
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    background: "#ffffff",
    color: "#374151",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },

  sidebarToggleButtonActive: {
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#2563eb",
  },

  usagePanel: {
    border: "1px solid #dbeafe",
    borderRadius: 10,
    background: "#ffffff",
    padding: 10,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  usagePanelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    color: "#111827",
    fontSize: 13,
    fontWeight: 700,
  },

  usageStatus: {
    borderRadius: 999,
    background: "#eff6ff",
    color: "#2563eb",
    padding: "3px 7px",
    fontSize: 11,
    fontWeight: 700,
  },

  usageModeText: {
    color: "#4b5563",
    fontSize: 12,
    lineHeight: 1.35,
  },

  usageMetricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
  },

  usageMetric: {
    borderRadius: 8,
    background: "#f9fafb",
    padding: "8px 9px",
    minWidth: 0,
  },

  usageMetricLabel: {
    display: "block",
    color: "#6b7280",
    fontSize: 10,
    lineHeight: 1.2,
    fontWeight: 700,
    textTransform: "uppercase",
  },

  usageMetricValue: {
    display: "block",
    marginTop: 4,
    color: "#111827",
    fontSize: 14,
    lineHeight: 1.2,
  },

  chatArea: {
    minHeight: 0,
    height: "100%",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },

  centerStage: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 0,
  },

  centerContent: {
    width: "100%",
    maxWidth: 720,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0 20px",
    boxSizing: "border-box",
  },

  centerTitle: {
    margin: 0,
    fontSize: 34,
    lineHeight: 1.15,
    fontWeight: 500,
    color: "#111827",
    textAlign: "center",
  },

  centerSubtitle: {
    margin: "12px 0 0",
    fontSize: 15,
    lineHeight: 1.7,
    color: "#6b7280",
    textAlign: "center",
    maxWidth: 640,
  },

  centerComposer: {
    width: "100%",
    marginTop: 26,
  },

  chatLayout: {
    flex: 1,
    minHeight: 0,
    height: "100%",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },

  messageScroll: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
    paddingBottom: 10,
    paddingRight: 0,
  },

  messageList: {
    width: "100%",
    maxWidth: 860,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 28,
    padding: "12px 24px 12px",
    boxSizing: "border-box",
  },

  messageRow: {
    display: "flex",
    width: "100%",
  },

  messageBubble: {
    maxWidth: "78%",
  },

  userBubble: {
    background: "#2563eb",
    color: "#ffffff",
    borderRadius: "18px 18px 6px 18px",
    padding: "12px 16px",
    marginLeft: "auto",
  },

  assistantBubble: {
    background: "transparent",
    color: "#111827",
    borderRadius: 0,
    padding: 0,
    width: "100%",
    maxWidth: 720,
  },

  messageContent: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontSize: 15,
    lineHeight: 1.75,
    maxWidth: 720,
  },

  messageAttachmentList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginTop: 10,
  },

  messageAttachmentItem: {
    fontSize: 12,
    color: "#6b7280",
  },

  generationCard: {
    marginTop: 12,
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    background: "#ffffff",
    padding: 12,
    maxWidth: 620,
  },

  generationTitle: {
    color: "#111827",
    fontSize: 13,
    fontWeight: 800,
    marginBottom: 10,
    wordBreak: "break-word",
  },

  generatedImage: {
    display: "block",
    width: "100%",
    maxHeight: 420,
    objectFit: "contain",
    borderRadius: 8,
    background: "#0b0f14",
  },

  generatedVideo: {
    display: "block",
    width: "100%",
    maxHeight: 420,
    borderRadius: 8,
    background: "#000000",
  },

  generatedAudio: {
    width: "100%",
  },

  generationLink: {
    display: "inline-flex",
    marginTop: 10,
    color: "#047857",
    fontSize: 13,
    fontWeight: 800,
    textDecoration: "none",
  },

  messageActions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 12,
    alignItems: "center",
  },

  iconAction: {
    border: "none",
    background: "transparent",
    padding: 0,
    fontSize: 14,
    color: "#6b7280",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 22,
    height: 22,
  },

  bottomDock: {
    flexShrink: 0,
    position: "sticky",
    bottom: 0,
    paddingTop: 10,
    background:
      "linear-gradient(180deg, rgba(247,247,248,0) 0%, rgba(247,247,248,0.95) 24%, rgba(247,247,248,1) 100%)",
  },

  composerBox: {
    width: "100%",
    maxWidth: 860,
    margin: "0 auto",
    padding: "0 24px 0",
    boxSizing: "border-box",
  },

  composerRow: {
    display: "grid",
    gridTemplateColumns: "34px 34px minmax(0, 1fr) 88px",
    gap: 10,
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 22,
    padding: "8px 10px",
    width: "100%",
    boxSizing: "border-box",
  },

  plusWrap: {
    position: "relative",
  },

  plusButton: {
    width: 24,
    height: 24,
    border: "none",
    background: "transparent",
    color: "#4b5563",
    fontSize: 22,
    lineHeight: 1,
    cursor: "pointer",
  },

  voiceButton: {
    width: 28,
    height: 28,
    border: "1px solid #e5e7eb",
    borderRadius: 999,
    background: "#ffffff",
    color: "#4b5563",
    fontSize: 18,
    lineHeight: 1,
    cursor: "pointer",
  },

  voiceButtonActive: {
    border: "1px solid #ef4444",
    background: "#fef2f2",
    color: "#ef4444",
  },

  plusMenu: {
    position: "absolute",
    left: 0,
    bottom: "calc(100% + 8px)",
    minWidth: 180,
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    borderRadius: 14,
    boxShadow: "0 12px 28px rgba(0,0,0,0.08)",
    padding: 6,
    display: "flex",
    flexDirection: "column",
    gap: 2,
    zIndex: 30,
  },

  plusMenuItem: {
    minHeight: 36,
    border: "none",
    background: "transparent",
    textAlign: "left",
    padding: "0 10px",
    color: "#111827",
    fontSize: 14,
    cursor: "pointer",
    borderRadius: 10,
  },

  textarea: {
    width: "100%",
    resize: "none",
    minHeight: 22,
    maxHeight: 120,
    border: "none",
    background: "transparent",
    outline: "none",
    fontSize: 15,
    lineHeight: 1.45,
    color: "#111827",
    overflowY: "auto",
    paddingTop: 4,
  },

  sendButton: {
    height: 38,
    borderRadius: 14,
    border: "none",
    background: "#111827",
    color: "#ffffff",
    fontWeight: 500,
    fontSize: 14,
    cursor: "pointer",
  },

  sendButtonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },

  attachmentRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
    paddingLeft: 4,
  },

  attachmentChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    minHeight: 30,
    padding: "0 10px",
    borderRadius: 999,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
  },

  attachmentName: {
    fontSize: 12,
    color: "#374151",
    maxWidth: 180,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  attachmentRemove: {
    border: "none",
    background: "transparent",
    color: "#6b7280",
    cursor: "pointer",
    fontSize: 16,
    lineHeight: 1,
  },
};
