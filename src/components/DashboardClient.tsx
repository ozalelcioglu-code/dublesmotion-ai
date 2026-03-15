"use client";


type RecentVideo = {
  id: string;
  title: string;
  mode: "text" | "images" | "product";
  ratio?: "square" | "vertical" | "horizontal" | null;
  duration_sec?: number | null;
  status: "processing" | "ready" | "failed";
  video_url: string;
  created_at?: string | null;
};

type Props = {
  planLabel: string;
  usedThisMonth: number;
  remainingCredits: number | null;
  maxDurationSec: number;
  monthlyVideoLimit: number | null;
  totalVideos: number;
  recentVideos: RecentVideo[];
};

export function DashboardClient(props: Props) {
  const styles = {
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 18,
      marginBottom: 20,
    } as React.CSSProperties,
    statCard: {
      background: "rgba(10,18,33,0.82)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 22,
      padding: 18,
      boxShadow: "0 16px 40px rgba(0,0,0,0.28)",
    } as React.CSSProperties,
    statLabel: {
      fontSize: 12,
      color: "rgba(231,238,249,0.62)",
      textTransform: "uppercase" as const,
      fontWeight: 800,
      marginBottom: 8,
    } as React.CSSProperties,
    statValue: {
      fontSize: 34,
      fontWeight: 950,
      color: "#fff",
      lineHeight: 1.1,
    } as React.CSSProperties,
    statHint: {
      marginTop: 8,
      fontSize: 13,
      color: "rgba(231,238,249,0.6)",
      lineHeight: 1.5,
    } as React.CSSProperties,
    sectionCard: {
      background: "rgba(10,18,33,0.82)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 22,
      padding: 18,
      boxShadow: "0 16px 40px rgba(0,0,0,0.28)",
    } as React.CSSProperties,
    sectionTitle: {
      fontSize: 20,
      fontWeight: 900,
      color: "#fff",
      marginBottom: 6,
    } as React.CSSProperties,
    sectionSub: {
      fontSize: 13,
      color: "rgba(231,238,249,0.62)",
      marginBottom: 16,
      lineHeight: 1.5,
    } as React.CSSProperties,
    recentGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      gap: 16,
    } as React.CSSProperties,
    recentCard: {
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 18,
      overflow: "hidden",
    } as React.CSSProperties,
    video: {
      width: "100%",
      height: 180,
      objectFit: "cover" as const,
      display: "block",
      background: "#000",
    } as React.CSSProperties,
    recentBody: {
      padding: 14,
    } as React.CSSProperties,
    recentTitle: {
      fontSize: 16,
      fontWeight: 900,
      color: "#fff",
      marginBottom: 6,
      lineHeight: 1.35,
    } as React.CSSProperties,
    recentMeta: {
      color: "rgba(231,238,249,0.62)",
      fontSize: 13,
      lineHeight: 1.6,
      marginBottom: 12,
    } as React.CSSProperties,
    actionLink: {
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
    } as React.CSSProperties,
    empty: {
      color: "rgba(231,238,249,0.62)",
      fontSize: 14,
      lineHeight: 1.6,
    } as React.CSSProperties,
  };

  return (
    <>
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Current Plan</div>
          <div style={styles.statValue}>{props.planLabel}</div>
          <div style={styles.statHint}>
            {props.monthlyVideoLimit === null
              ? "Unlimited monthly videos"
              : `${props.monthlyVideoLimit} videos per month`}
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Used This Month</div>
          <div style={styles.statValue}>{props.usedThisMonth}</div>
          <div style={styles.statHint}>
            Video generations counted in the current month
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Remaining Credits</div>
          <div style={styles.statValue}>
            {props.remainingCredits === null ? "∞" : props.remainingCredits}
          </div>
          <div style={styles.statHint}>
            {props.remainingCredits === null
              ? "No monthly cap on this plan"
              : "Available video generations left this month"}
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Max Duration</div>
          <div style={styles.statValue}>{props.maxDurationSec}s</div>
          <div style={styles.statHint}>
            Maximum allowed render duration for your current plan
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Videos</div>
          <div style={styles.statValue}>{props.totalVideos}</div>
          <div style={styles.statHint}>
            All videos created under this account
          </div>
        </div>
      </div>

      <div style={styles.sectionCard}>
        <div style={styles.sectionTitle}>Recent Videos</div>
        <div style={styles.sectionSub}>
          Your latest rendered videos appear here for quick access.
        </div>

        {props.recentVideos.length === 0 ? (
          <div style={styles.empty}>
            No videos yet. Generate your first video and it will appear here.
          </div>
        ) : (
          <div style={styles.recentGrid}>
            {props.recentVideos.map((video) => (
              <div key={video.id} style={styles.recentCard}>
                <video
                  src={video.video_url}
                  controls
                  preload="metadata"
                  style={styles.video}
                />

                <div style={styles.recentBody}>
                  <div style={styles.recentTitle}>{video.title}</div>

                  <div style={styles.recentMeta}>
                    {video.duration_sec ? `${video.duration_sec}s` : "-"} •{" "}
                    {video.mode} • {video.ratio ?? "-"}
                    <br />
                    {video.created_at
                      ? new Date(video.created_at).toLocaleString()
                      : "-"}{" "}
                    • {video.status}
                  </div>

                  <a
                    href={video.video_url}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.actionLink}
                  >
                    Open Video
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}