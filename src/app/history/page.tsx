"use client";

/* eslint-disable @next/next/no-img-element */

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import {
  clearGenerationHistory,
  deleteGenerationHistoryItem,
  fetchGenerationHistory,
  type GenerationHistoryItem,
} from "@/lib/generation/history-client";
import { useLanguage } from "@/provider/languageProvider";
import { useSession } from "@/provider/SessionProvider";
import type { AppLanguage } from "@/lib/i18n";
import { useIsMobile } from "@/lib/useIsMobile";

const HISTORY_STORAGE_KEY_PREFIX = "dubles_generation_history_v1_";
const EDITOR_PREFILL_KEY = "dubles_editor_prefill_v1";

type RawHistoryItem = {
  audioUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  url?: string;
  type?: string;
  mode?: string;
  id?: string;
  name?: string;
  title?: string;
  createdAt?: string;
  prompt?: string;
  lyrics?: string;
  durationSec?: number;
  duration?: number;
  coverImageUrl?: string;
  thumbnailUrl?: string;
  instrumental?: boolean;
  provider?: string;
  model?: string;
};

type HistoryGroupKey =
  | "music"
  | "video"
  | "image"
  | "video_clone"
  | "other";

type NormalizedHistoryItem = {
  id: string;
  type: HistoryGroupKey;
  title: string;
  prompt: string;
  lyrics?: string;
  url: string;
  thumbnailUrl?: string;
  createdAt: string;
  durationSec?: number;
  instrumental?: boolean;
  provider?: string;
  model?: string;
  original: RawHistoryItem;
};

type HistoryTexts = {
  title: string;
  subtitle: string;
  refresh: string;
  clearAll: string;
  emptyTitle: string;
  emptyDesc: string;
  createdAtLabel: string;
  durationLabel: string;
  promptLabel: string;
  lyricsLabel: string;
  openEditor: string;
  preview: string;
  download: string;
  delete: string;
  watch: string;
  listen: string;
  expand: string;
  collapse: string;
  sections: {
    music: string;
    video: string;
    image: string;
    videoClone: string;
    other: string;
  };
  messages: {
    cleared: string;
    itemDeleted: string;
    editorReady: string;
  };
};

const TEXTS: Record<AppLanguage, HistoryTexts> = {
  tr: {
    title: "Geçmiş",
    subtitle:
      "Oluşturulan tüm içerikler türlerine göre listelenir. Aç, kapat, önizle, indir, sil ve editöre gönder.",
    refresh: "Yenile",
    clearAll: "Tümünü temizle",
    emptyTitle: "Geçmiş boş",
    emptyDesc: "Henüz kaydedilmiş üretim bulunmuyor.",
    createdAtLabel: "Tarih",
    durationLabel: "Süre",
    promptLabel: "Prompt",
    lyricsLabel: "Lyrics",
    openEditor: "Editöre gönder",
    preview: "Önizle",
    download: "İndir",
    delete: "Sil",
    watch: "İzle",
    listen: "Dinle",
    expand: "Genişlet",
    collapse: "Daralt",
    sections: {
      music: "Music",
      video: "Video",
      image: "Image",
      videoClone: "Video Clone",
      other: "Diğer",
    },
    messages: {
      cleared: "Tüm geçmiş temizlendi.",
      itemDeleted: "Kayıt silindi.",
      editorReady: "Kayıt editör için hazırlandı.",
    },
  },
  en: {
    title: "History",
    subtitle:
      "All created content is grouped by type. Expand, collapse, preview, download, delete, and send to editor.",
    refresh: "Refresh",
    clearAll: "Clear all",
    emptyTitle: "History is empty",
    emptyDesc: "There are no saved generations yet.",
    createdAtLabel: "Date",
    durationLabel: "Duration",
    promptLabel: "Prompt",
    lyricsLabel: "Lyrics",
    openEditor: "Send to editor",
    preview: "Preview",
    download: "Download",
    delete: "Delete",
    watch: "Watch",
    listen: "Listen",
    expand: "Expand",
    collapse: "Collapse",
    sections: {
      music: "Music",
      video: "Video",
      image: "Image",
      videoClone: "Video Clone",
      other: "Other",
    },
    messages: {
      cleared: "All history cleared.",
      itemDeleted: "Entry deleted.",
      editorReady: "Entry prepared for editor.",
    },
  },
  de: {
    title: "Verlauf",
    subtitle:
      "Alle Inhalte werden nach Typ gruppiert. Aufklappen, zuklappen, Vorschau, Download, Löschen und an den Editor senden.",
    refresh: "Aktualisieren",
    clearAll: "Alles löschen",
    emptyTitle: "Verlauf ist leer",
    emptyDesc: "Es gibt noch keine gespeicherten Inhalte.",
    createdAtLabel: "Datum",
    durationLabel: "Dauer",
    promptLabel: "Prompt",
    lyricsLabel: "Lyrics",
    openEditor: "An Editor senden",
    preview: "Vorschau",
    download: "Download",
    delete: "Löschen",
    watch: "Ansehen",
    listen: "Anhören",
    expand: "Aufklappen",
    collapse: "Zuklappen",
    sections: {
      music: "Music",
      video: "Video",
      image: "Image",
      videoClone: "Video Clone",
      other: "Andere",
    },
    messages: {
      cleared: "Gesamter Verlauf gelöscht.",
      itemDeleted: "Eintrag gelöscht.",
      editorReady: "Eintrag für den Editor vorbereitet.",
    },
  },
  ku: {
    title: "History",
    subtitle:
      "Hemû naverok li gorî cure têne rêzkirin. Veke, bigire, pêşdîtin bike, daxîne, jê bibe û bişîne editor.",
    refresh: "Nû bike",
    clearAll: "Hemû paqij bike",
    emptyTitle: "History vala ye",
    emptyDesc: "Hê naverokên tomarkirî tune ne.",
    createdAtLabel: "Dîrok",
    durationLabel: "Dirêjahî",
    promptLabel: "Prompt",
    lyricsLabel: "Lyrics",
    openEditor: "Bişîne editor",
    preview: "Pêşdîtin",
    download: "Daxîne",
    delete: "Jê bibe",
    watch: "Temaşe bike",
    listen: "Guhdarî bike",
    expand: "Fireh bike",
    collapse: "Teng bike",
    sections: {
      music: "Music",
      video: "Video",
      image: "Image",
      videoClone: "Video Clone",
      other: "Yên din",
    },
    messages: {
      cleared: "Hemû history hate paqijkirin.",
      itemDeleted: "Tomar hate jêbirin.",
      editorReady: "Tomar ji bo editor hate amadekirin.",
    },
  },
};

function getSafeLanguage(language?: string): AppLanguage {
  if (
    language === "tr" ||
    language === "en" ||
    language === "de" ||
    language === "ku"
  ) {
    return language;
  }
  return "tr";
}

function createHistoryStorageKey(email?: string | null) {
  return `${HISTORY_STORAGE_KEY_PREFIX}${email || "guest"}`;
}

function formatDate(value: string, locale: AppLanguage) {
  try {
    return new Date(value).toLocaleString(locale === "ku" ? "tr-TR" : locale, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function guessType(raw: RawHistoryItem): HistoryGroupKey {
  const value = String(raw?.type || raw?.mode || "").toLowerCase();

  if (value.includes("music") || value === "song") return "music";
  if (value.includes("video_clone")) return "video_clone";
  if (value.includes("clone")) return "video_clone";
  if (value.includes("image")) return "image";
  if (value.includes("video")) return "video";

  const url =
    raw?.url ||
    raw?.audioUrl ||
    raw?.videoUrl ||
    raw?.imageUrl ||
    raw?.thumbnailUrl ||
    "";

  if (typeof url === "string") {
    if (/\.(mp3|wav|ogg|m4a|aac)(\?|$)/i.test(url)) return "music";
    if (/\.(mp4|mov|webm|mkv)(\?|$)/i.test(url)) return "video";
    if (/\.(png|jpg|jpeg|webp|gif)(\?|$)/i.test(url)) return "image";
  }

  return "other";
}

function normalizeHistoryItem(raw: RawHistoryItem, index: number): NormalizedHistoryItem | null {
  const type = guessType(raw);

  const url =
    raw?.audioUrl ||
    raw?.videoUrl ||
    raw?.imageUrl ||
    raw?.url ||
    "";

  if (!url || typeof url !== "string") {
    return null;
  }

  const title =
    raw?.title ||
    raw?.name ||
    (type === "music"
      ? "Untitled Track"
      : type === "video"
      ? "Untitled Video"
      : type === "image"
      ? "Untitled Image"
      : type === "video_clone"
      ? "Untitled Clone"
      : "Untitled Item");

  const durationSec =
    typeof raw?.durationSec === "number"
      ? raw.durationSec
      : typeof raw?.duration === "number"
      ? raw.duration
      : undefined;

  return {
    id: String(raw?.id || `${type}-${index}-${Date.now()}`),
    type,
    title: String(title),
    prompt: typeof raw?.prompt === "string" ? raw.prompt : "",
    lyrics: typeof raw?.lyrics === "string" ? raw.lyrics : "",
    url,
    thumbnailUrl:
      raw?.thumbnailUrl ||
      raw?.coverImageUrl ||
      raw?.imageUrl ||
      undefined,
    createdAt:
      typeof raw?.createdAt === "string"
        ? raw.createdAt
        : new Date().toISOString(),
    durationSec,
    instrumental:
      typeof raw?.instrumental === "boolean" ? raw.instrumental : undefined,
    provider: typeof raw?.provider === "string" ? raw.provider : undefined,
    model: typeof raw?.model === "string" ? raw.model : undefined,
    original: raw,
  };
}

function normalizeApiHistoryItem(item: GenerationHistoryItem): NormalizedHistoryItem {
  const type: HistoryGroupKey =
    item.type === "music"
      ? "music"
      : item.type === "image"
      ? "image"
      : item.type === "video_clone"
      ? "video_clone"
      : "video";

  const original: RawHistoryItem = {
    id: item.id,
    type: item.type,
    title: item.title,
    prompt: item.prompt,
    lyrics: item.lyrics,
    url: item.url,
    thumbnailUrl: item.thumbnailUrl || undefined,
    durationSec: item.durationSec ?? undefined,
    provider: item.provider || undefined,
    model: item.model || undefined,
    createdAt: item.createdAt,
  };

  return {
    id: item.id,
    type,
    title: item.title,
    prompt: item.prompt,
    lyrics: item.lyrics,
    url: item.url,
    thumbnailUrl: item.thumbnailUrl || undefined,
    createdAt: item.createdAt,
    durationSec: item.durationSec ?? undefined,
    instrumental:
      typeof item.metadata.instrumental === "boolean"
        ? item.metadata.instrumental
        : undefined,
    provider: item.provider || undefined,
    model: item.model || undefined,
    original,
  };
}

function HistoryPageContent() {
  const router = useRouter();
  const { language } = useLanguage();
  const { user } = useSession();
  const isMobile = useIsMobile(760);

  const safeLanguage = getSafeLanguage(language);
  const t = TEXTS[safeLanguage];

  const [items, setItems] = useState<NormalizedHistoryItem[]>([]);
  const [notice, setNotice] = useState("");
  const [expandedSections, setExpandedSections] = useState<
    Record<HistoryGroupKey, boolean>
  >({
    music: true,
    video: true,
    image: true,
    video_clone: true,
    other: false,
  });

  const [expandedPreviewIds, setExpandedPreviewIds] = useState<
    Record<string, boolean>
  >({});

  const storageKey = useMemo(
    () => createHistoryStorageKey(user?.email ?? null),
    [user?.email]
  );

  const readLocalHistory = useCallback(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? (JSON.parse(raw) as RawHistoryItem[]) : [];
      const normalized = Array.isArray(parsed)
        ? parsed
            .map((item, index) => normalizeHistoryItem(item, index))
            .filter(Boolean) as NormalizedHistoryItem[]
        : [];

      normalized.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setItems(normalized);
    } catch {
      setItems([]);
    }
  }, [storageKey]);

  const readHistory = useCallback(async () => {
    if (user) {
      try {
        const apiItems = await fetchGenerationHistory({
          user,
          limit: 100,
        });
        setItems(apiItems.map((item) => normalizeApiHistoryItem(item)));
        return;
      } catch (error) {
        console.error("Neon generation history read failed:", error);
      }
    }

    readLocalHistory();
  }, [readLocalHistory, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void readHistory();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [readHistory]);

  const grouped = useMemo(() => {
    return {
      music: items.filter((item) => item.type === "music"),
      video: items.filter((item) => item.type === "video"),
      image: items.filter((item) => item.type === "image"),
      video_clone: items.filter((item) => item.type === "video_clone"),
      other: items.filter((item) => item.type === "other"),
    };
  }, [items]);

  const totalCount = items.length;

  const toggleSection = useCallback((key: HistoryGroupKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const togglePreview = useCallback((id: string) => {
    setExpandedPreviewIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const persistRawItems = useCallback(
    (nextItems: NormalizedHistoryItem[]) => {
      const rawItems = nextItems.map((item) => item.original);
      localStorage.setItem(storageKey, JSON.stringify(rawItems));
    },
    [storageKey]
  );

  const handleClearAll = useCallback(async () => {
    if (user) {
      await clearGenerationHistory({ user });
    }

    localStorage.removeItem(storageKey);
    setItems([]);
    setNotice(t.messages.cleared);
  }, [storageKey, t.messages.cleared, user]);

  const handleDeleteItem = useCallback(
    async (id: string) => {
      if (user) {
        await deleteGenerationHistoryItem({ user, id });
      }

      setItems((prev) => {
        const next = prev.filter((item) => item.id !== id);
        if (!user) persistRawItems(next);
        return next;
      });
      setNotice(t.messages.itemDeleted);
    },
    [persistRawItems, t.messages.itemDeleted, user]
  );

  const handleSendToEditor = useCallback(
    (item: NormalizedHistoryItem) => {
      const payload =
        item.type === "music"
          ? {
              type: "music",
              source: "history-page",
              createdAt: item.createdAt,
              title: item.title,
              prompt: item.prompt,
              lyrics: item.lyrics || "",
              audioUrl: item.url,
              coverImageUrl: item.thumbnailUrl,
              duration: item.durationSec,
              instrumental: item.instrumental,
              provider: item.provider,
              model: item.model,
            }
          : item.type === "video_clone"
          ? {
              type: "video_clone",
              source: "history-page",
              createdAt: item.createdAt,
              title: item.title,
              prompt: item.prompt,
              videoUrl: item.url,
              thumbnailUrl: item.thumbnailUrl,
              provider: item.provider,
              model: item.model,
            }
          : item.type === "video"
          ? {
              type: "video",
              source: "history-page",
              createdAt: item.createdAt,
              title: item.title,
              prompt: item.prompt,
              videoUrl: item.url,
              thumbnailUrl: item.thumbnailUrl,
              provider: item.provider,
              model: item.model,
            }
          : item.type === "image"
          ? {
              type: "image",
              source: "history-page",
              createdAt: item.createdAt,
              title: item.title,
              prompt: item.prompt,
              imageUrl: item.url,
              provider: item.provider,
              model: item.model,
            }
          : {
              type: "other",
              source: "history-page",
              createdAt: item.createdAt,
              title: item.title,
              prompt: item.prompt,
              url: item.url,
            };

      localStorage.setItem(EDITOR_PREFILL_KEY, JSON.stringify(payload));
      setNotice(t.messages.editorReady);
      router.push("/editor");
    },
    [router, t.messages.editorReady]
  );

  function renderPreview(item: NormalizedHistoryItem) {
    if (item.type === "music") {
      return <audio controls preload="metadata" src={item.url} style={styles.audio} />;
    }

    if (item.type === "video" || item.type === "video_clone") {
      return (
        <video
          controls
          playsInline
          preload="metadata"
          src={item.url}
          poster={item.thumbnailUrl}
          style={styles.video}
        />
      );
    }

    if (item.type === "image") {
      return (
        <img
          src={item.url}
          alt={item.title}
          style={styles.imagePreview}
        />
      );
    }

    return (
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        style={styles.secondaryButton}
      >
        {t.preview}
      </a>
    );
  }

  function renderPrimaryOpenAction(item: NormalizedHistoryItem) {
    const label =
      item.type === "music" ? t.listen : item.type === "image" ? t.preview : t.watch;

    return (
      <button
        type="button"
        onClick={() => togglePreview(item.id)}
        style={styles.secondaryButton}
      >
        {expandedPreviewIds[item.id] ? t.collapse : label}
      </button>
    );
  }

  function renderSection(
    key: HistoryGroupKey,
    title: string,
    sectionItems: NormalizedHistoryItem[]
  ) {
    const isOpen = expandedSections[key];

    return (
      <section style={styles.section} key={key}>
        <button
          type="button"
          onClick={() => toggleSection(key)}
          style={styles.sectionHeaderButton}
        >
          <div style={styles.sectionHeaderLeft}>
            <span style={styles.sectionTitle}>{title}</span>
            <span style={styles.sectionCount}>{sectionItems.length}</span>
          </div>

          <span style={styles.sectionToggleText}>
            {isOpen ? t.collapse : t.expand}
          </span>
        </button>

        {isOpen ? (
          sectionItems.length === 0 ? (
            <div style={styles.sectionEmpty}>—</div>
          ) : (
            <div style={{ ...styles.list, ...(isMobile ? styles.listMobile : null) }}>
              {sectionItems.map((item) => (
                <article key={item.id} style={styles.card}>
                  <div style={styles.cardTop}>
                    <div style={styles.cardHead}>
                      <p style={styles.eyebrow}>{title.toUpperCase()}</p>
                      <h3 style={styles.cardTitle}>{item.title}</h3>
                    </div>

                    <div style={styles.pillWrap}>
                      {typeof item.durationSec === "number" ? (
                        <span style={styles.pill}>{item.durationSec}s</span>
                      ) : null}

                      {item.type === "music" ? (
                        <span style={styles.pill}>
                          {item.instrumental ? "Instrumental" : "Vocal"}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {item.thumbnailUrl &&
                  item.type !== "image" &&
                  !expandedPreviewIds[item.id] ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      style={styles.coverImage}
                    />
                  ) : null}

                  {expandedPreviewIds[item.id] ? (
                    <div style={styles.previewWrap}>{renderPreview(item)}</div>
                  ) : null}

                    <div style={{ ...styles.metaGrid, ...(isMobile ? styles.metaGridMobile : null) }}>
                    <div style={styles.metaBox}>
                      <p style={styles.metaLabel}>{t.createdAtLabel}</p>
                      <p style={styles.metaValue}>
                        {formatDate(item.createdAt, safeLanguage)}
                      </p>
                    </div>

                    <div style={styles.metaBox}>
                      <p style={styles.metaLabel}>{t.durationLabel}</p>
                      <p style={styles.metaValue}>
                        {typeof item.durationSec === "number"
                          ? `${item.durationSec}s`
                          : "-"}
                      </p>
                    </div>
                  </div>

                  {item.prompt ? (
                    <div style={styles.textBlock}>
                      <p style={styles.metaLabel}>{t.promptLabel}</p>
                      <p style={styles.longText}>{item.prompt}</p>
                    </div>
                  ) : null}

                  {item.lyrics ? (
                    <div style={styles.textBlock}>
                      <p style={styles.metaLabel}>{t.lyricsLabel}</p>
                      <p style={styles.longText}>{item.lyrics}</p>
                    </div>
                  ) : null}

                  <div style={styles.actionRow}>
                    {renderPrimaryOpenAction(item)}

                    <a
                      href={item.url}
                      download
                      target="_blank"
                      rel="noreferrer"
                      style={styles.secondaryButton}
                    >
                      {t.download}
                    </a>

                    <button
                      type="button"
                      onClick={() => handleSendToEditor(item)}
                      style={styles.primaryButton}
                    >
                      {t.openEditor}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDeleteItem(item.id)}
                      style={styles.dangerButton}
                    >
                      {t.delete}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )
        ) : null}
      </section>
    );
  }

  return (
    <AppShell
      currentPath="/history"
      pageTitle={t.title}
      pageDescription={t.subtitle}
    >
      <div style={styles.page}>
        <div style={{ ...styles.topBar, ...(isMobile ? styles.topBarMobile : null) }}>
          <div style={styles.summaryBlock}>
            <div style={styles.summaryTitle}>{t.title}</div>
            <div style={styles.summarySub}>
              {t.subtitle} ({totalCount})
            </div>
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              onClick={() => void readHistory()}
              style={styles.secondaryButton}
            >
              {t.refresh}
            </button>
            <button
              type="button"
              onClick={() => void handleClearAll()}
              style={styles.dangerButton}
            >
              {t.clearAll}
            </button>
          </div>
        </div>

        {notice ? <div style={styles.noticeBox}>{notice}</div> : null}

        {totalCount === 0 ? (
          <div style={styles.emptyCard}>
            <h3 style={styles.emptyTitle}>{t.emptyTitle}</h3>
            <p style={styles.emptyDesc}>{t.emptyDesc}</p>
          </div>
        ) : (
          <div style={styles.sectionsWrap}>
            {renderSection("music", t.sections.music, grouped.music)}
            {renderSection("video", t.sections.video, grouped.video)}
            {renderSection("image", t.sections.image, grouped.image)}
            {renderSection("video_clone", t.sections.videoClone, grouped.video_clone)}
            {renderSection("other", t.sections.other, grouped.other)}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function HistoryFallback() {
  return null;
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<HistoryFallback />}>
      <HistoryPageContent />
    </Suspense>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "calc(100dvh - 145px)",
  },

  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 18,
  },

  topBarMobile: {
    alignItems: "stretch",
  },

  summaryBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  summaryTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: "#0f172a",
  },

  summarySub: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.6,
  },

  actions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  sectionsWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  section: {
    border: "1px solid rgba(15,23,42,0.08)",
    background: "#ffffff",
    borderRadius: 22,
    overflow: "hidden",
  },

  sectionHeaderButton: {
    width: "100%",
    border: 0,
    background: "#ffffff",
    padding: "18px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    cursor: "pointer",
    borderBottom: "1px solid rgba(15,23,42,0.08)",
  },

  sectionHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#0f172a",
  },

  sectionCount: {
    minWidth: 28,
    height: 28,
    padding: "0 10px",
    borderRadius: 999,
    background: "#eff6ff",
    color: "#2563eb",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
  },

  sectionToggleText: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  sectionEmpty: {
    padding: 20,
    color: "#94a3b8",
    fontSize: 14,
  },

  list: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: 16,
    padding: 16,
  },

  listMobile: {
    gridTemplateColumns: "1fr",
    padding: 12,
  },

  card: {
    border: "1px solid rgba(15,23,42,0.08)",
    background: "#ffffff",
    borderRadius: 20,
    padding: 16,
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },

  cardHead: {
    minWidth: 0,
  },

  eyebrow: {
    margin: 0,
    color: "#2563eb",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.08em",
  },

  cardTitle: {
    margin: "8px 0 0",
    fontSize: 20,
    lineHeight: 1.2,
    fontWeight: 700,
    wordBreak: "break-word",
    color: "#0f172a",
  },

  pillWrap: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  pill: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 34,
    padding: "0 12px",
    borderRadius: 999,
    background: "#f8fafc",
    border: "1px solid rgba(15,23,42,0.08)",
    color: "#334155",
    fontSize: 12,
    fontWeight: 600,
  },

  coverImage: {
    width: "100%",
    aspectRatio: "16 / 9",
    objectFit: "cover",
    borderRadius: 16,
    marginTop: 14,
    border: "1px solid rgba(15,23,42,0.08)",
  },

  previewWrap: {
    marginTop: 14,
  },

  audio: {
    width: "100%",
  },

  video: {
    width: "100%",
    borderRadius: 16,
    background: "#000",
    display: "block",
  },

  imagePreview: {
    width: "100%",
    borderRadius: 16,
    display: "block",
    border: "1px solid rgba(15,23,42,0.08)",
  },

  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
    marginTop: 14,
  },

  metaGridMobile: {
    gridTemplateColumns: "1fr",
  },

  metaBox: {
    borderRadius: 16,
    border: "1px solid rgba(15,23,42,0.08)",
    background: "#f8fafc",
    padding: 12,
  },

  metaLabel: {
    margin: 0,
    color: "#2563eb",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },

  metaValue: {
    margin: "8px 0 0",
    color: "#0f172a",
    fontSize: 14,
    lineHeight: 1.55,
    wordBreak: "break-word",
  },

  textBlock: {
    marginTop: 14,
    borderRadius: 16,
    border: "1px solid rgba(15,23,42,0.08)",
    background: "#f8fafc",
    padding: 12,
  },

  longText: {
    margin: "8px 0 0",
    color: "#0f172a",
    fontSize: 14,
    lineHeight: 1.65,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },

  actionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },

  primaryButton: {
    appearance: "none",
    border: 0,
    borderRadius: 14,
    padding: "12px 16px",
    background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },

  secondaryButton: {
    appearance: "none",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 14,
    padding: "12px 16px",
    background: "#ffffff",
    color: "#0f172a",
    fontWeight: 700,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },

  dangerButton: {
    appearance: "none",
    border: "1px solid rgba(239,68,68,0.18)",
    borderRadius: 14,
    padding: "12px 16px",
    background: "#fff5f5",
    color: "#dc2626",
    fontWeight: 700,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },

  noticeBox: {
    marginBottom: 16,
    borderRadius: 16,
    padding: "12px 14px",
    background: "#eff6ff",
    border: "1px solid rgba(37,99,235,0.15)",
    color: "#1d4ed8",
    fontSize: 14,
    lineHeight: 1.5,
  },

  emptyCard: {
    minHeight: 360,
    border: "1px solid rgba(15,23,42,0.08)",
    background: "#ffffff",
    borderRadius: 22,
    padding: 24,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
  },

  emptyTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    color: "#0f172a",
  },

  emptyDesc: {
    margin: "10px 0 0",
    color: "#64748b",
    maxWidth: 480,
    lineHeight: 1.65,
  },
};
