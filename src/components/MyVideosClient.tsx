"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "../provider/LanguageProvider";

type VideoItem = {
  id: string;
  title: string;
  mode: "text" | "images" | "product";
  video_url: string;
  thumbnail_url?: string | null;
  status: "processing" | "ready" | "failed";
  duration_sec?: number | null;
  ratio?: "square" | "vertical" | "horizontal" | null;
  created_at?: string | null;
};

type Props = {
  initialVideos: VideoItem[];
};

export function MyVideosClient({ initialVideos }: Props) {
  const { language, t } = useLanguage();
  const [videos, setVideos] = useState(initialVideos);
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredVideos = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return videos;

    return videos.filter((video) => {
      return (
        video.title.toLowerCase().includes(q) ||
        video.mode.toLowerCase().includes(q) ||
        (video.ratio ?? "").toLowerCase().includes(q)
      );
    });
  }, [videos, query]);

  const statusLabel = (status: VideoItem["status"]) => {
    if (status === "processing") return t.myVideos.processing;
    if (status === "ready") return t.myVideos.ready;
    return t.myVideos.failed;
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleString(language);
    } catch {
      return value;
    }
  };

  const handleDelete = async (videoId: string) => {
    const confirmed = window.confirm(t.myVideos.confirmDelete);
    if (!confirmed) return;

    try {
      setDeletingId(videoId);

      const res = await fetch(`/api/videos/${videoId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!data?.ok) {
        throw new Error(data?.error ?? t.myVideos.deleteFailed);
      }

      setVideos((prev) => prev.filter((item) => item.id !== videoId));
    } catch (err: any) {
      alert(err?.message ?? t.myVideos.deleteFailed);
    } finally {
      setDeletingId(null);
    }
  };

  const styles = {
    topBar: {
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      alignItems: "center",
      marginBottom: 18,
      flexWrap: "wrap" as const,
    } as React.CSSProperties,
    searchWrap: {
      minWidth: 280,
      flex: "1 1 320px",
    } as React.CSSProperties,
    input: {
      width: "100%",
      padding: "12px 14px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(4,10,20,0.65)",
      color: "#e7eef9",
      outline: "none",
    } as React.CSSProperties,
    count: {
      color: "rgba(231,238,249,0.62)",
      fontSize: 13,
      fontWeight: 700,
    } as React.CSSProperties,
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
      gap: 18,
    } as React.CSSProperties,
    card: {
      background: "rgba(10,18,33,0.82)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 22,
      overflow: "hidden",
      boxShadow: "0 16px 40px rgba(0,0,0,0.28)",
    } as React.CSSProperties,
    previewWrap: {
      position: "relative" as const,
      background: "#000",
    } as React.CSSProperties,
    badgeRow: {
      position: "absolute" as const,
      top: 12,
      left: 12,
      display: "flex",
      gap: 8,
      flexWrap: "wrap" as const,
      zIndex: 2,
    } as React.CSSProperties,
    badge: {
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 800,
      background: "rgba(5,10,20,0.72)",
      border: "1px solid rgba(255,255,255,0.12)",
      color: "#e7eef9",
      backdropFilter: "blur(8px)",
    } as React.CSSProperties,
    video: {
      width: "100%",
      height: 220,
      objectFit: "cover" as const,
      display: "block",
      background: "#000",
    } as React.CSSProperties,
    body: {
      padding: 16,
    } as React.CSSProperties,
    title: {
      fontSize: 18,
      fontWeight: 900,
      color: "#e7eef9",
      marginBottom: 8,
      lineHeight: 1.3,
    } as React.CSSProperties,
    meta: {
      color: "rgba(231,238,249,0.62)",
      fontSize: 13,
      lineHeight: 1.6,
      marginBottom: 14,
    } as React.CSSProperties,
    actions: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap" as const,
    } as React.CSSProperties,
    button: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(59,130,246,0.24)",
      background: "rgba(59,130,246,0.12)",
      color: "#d7ebff",
      textDecoration: "none",
      fontWeight: 800,
      cursor: "pointer",
    } as React.CSSProperties,
    dangerButton: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,120,120,0.28)",
      background: "rgba(255,120,120,0.12)",
      color: "#ffd9d9",
      textDecoration: "none",
      fontWeight: 800,
      cursor: "pointer",
    } as React.CSSProperties,
    empty: {
      background: "rgba(10,18,33,0.82)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 22,
      padding: 24,
      color: "rgba(231,238,249,0.68)",
      fontSize: 14,
      lineHeight: 1.6,
    } as React.CSSProperties,
  };

  if (videos.length === 0) {
    return <div style={styles.empty}>{t.myVideos.empty}</div>;
  }

  return (
    <>
      <div style={styles.topBar}>
        <div style={styles.searchWrap}>
          <input
            style={styles.input}
            placeholder={t.myVideos.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div style={styles.count}>
          {filteredVideos.length}{" "}
          {filteredVideos.length === 1
            ? t.myVideos.countSingle
            : t.myVideos.countPlural}
        </div>
      </div>

      {filteredVideos.length === 0 ? (
        <div style={styles.empty}>{t.myVideos.noSearchResult}</div>
      ) : (
        <div style={styles.grid}>
          {filteredVideos.map((video) => (
            <div key={video.id} style={styles.card}>
              <div style={styles.previewWrap}>
                <div style={styles.badgeRow}>
                  <div style={styles.badge}>{video.mode}</div>
                  <div style={styles.badge}>{video.ratio ?? "-"}</div>
                  <div style={styles.badge}>{statusLabel(video.status)}</div>
                </div>

                <video
                  src={video.video_url}
                  controls
                  preload="metadata"
                  poster={video.thumbnail_url ?? undefined}
                  style={styles.video}
                />
              </div>

              <div style={styles.body}>
                <div style={styles.title}>{video.title || t.myVideos.untitled}</div>

                <div style={styles.meta}>
                  {video.duration_sec ? `${video.duration_sec}s` : "-"} •{" "}
                  {formatDate(video.created_at)}
                </div>

                <div style={styles.actions}>
                  <a
                    href={video.video_url}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.button}
                  >
                    {t.myVideos.play}
                  </a>

                  <a href={video.video_url} download style={styles.button}>
                    {t.myVideos.download}
                  </a>

                  <button
                    type="button"
                    style={styles.dangerButton}
                    disabled={deletingId === video.id}
                    onClick={() => handleDelete(video.id)}
                  >
                    {deletingId === video.id
                      ? t.myVideos.deleting
                      : t.myVideos.delete}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}