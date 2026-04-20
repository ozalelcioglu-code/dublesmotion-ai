"use client";

/* eslint-disable @next/next/no-img-element */

import type { CSSProperties, ReactNode } from "react";
import AppShell from "@/components/layout/AppShell";

export type StudioTone = "neutral" | "good" | "warning" | "danger";

export type StudioStatus = {
  label: string;
  tone?: StudioTone;
};

export type StudioMetric = {
  label: string;
  value: string | number | null | undefined;
  tone?: StudioTone;
};

export type StudioTemplate = {
  id: string;
  title: string;
  description: string;
  badge?: string;
  onSelect: () => void;
};

type GenerationStudioProps = {
  currentPath: string;
  title: string;
  description: string;
  badge?: string;
  isMobile: boolean;
  status: StudioStatus;
  metrics?: StudioMetric[];
  inputTitle: string;
  inputDescription?: string;
  inputPanel: ReactNode;
  previewTitle: string;
  previewDescription?: string;
  preview: ReactNode;
  templates?: StudioTemplate[];
  templatesTitle?: string;
  templatesDescription?: string;
  primaryAction: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  secondaryActions?: Array<{
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }>;
  notice?: string;
};

type FieldProps = {
  label: string;
  description?: string;
  children: ReactNode;
};

export function GenerationStudio(props: GenerationStudioProps) {
  const metrics = props.metrics ?? [];
  const secondaryActions = props.secondaryActions ?? [];

  return (
    <AppShell
      currentPath={props.currentPath}
      pageTitle={props.title}
      pageDescription={props.description}
    >
      <div style={styles.page}>
        <section style={styles.heroBand}>
          <div>
            {props.badge ? <div style={styles.badge}>{props.badge}</div> : null}
            <h2 style={styles.heroTitle}>{props.title}</h2>
            <p style={styles.heroText}>{props.description}</p>
          </div>

          <div style={styles.statusWrap}>
            <StatusPill status={props.status} />
            {metrics.map((metric) => (
              <div key={metric.label} style={styles.metricBox}>
                <div style={styles.metricLabel}>{metric.label}</div>
                <div
                  style={{
                    ...styles.metricValue,
                    color: toneColor(metric.tone),
                  }}
                >
                  {metric.value ?? "-"}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            ...styles.workspace,
            gridTemplateColumns: props.isMobile ? "1fr" : "minmax(320px, 430px) 1fr",
          }}
        >
          <div style={styles.inputColumn}>
            <div style={styles.panelHeader}>
              <div>
                <div style={styles.panelTitle}>{props.inputTitle}</div>
                {props.inputDescription ? (
                  <div style={styles.panelDescription}>
                    {props.inputDescription}
                  </div>
                ) : null}
              </div>
            </div>

            <div style={styles.stack}>{props.inputPanel}</div>

            <div style={styles.actionBar}>
              <button
                type="button"
                onClick={props.primaryAction.onClick}
                disabled={props.primaryAction.disabled}
                style={{
                  ...styles.primaryButton,
                  ...(props.primaryAction.disabled ? styles.disabledButton : null),
                }}
              >
                {props.primaryAction.label}
              </button>

              {secondaryActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  style={{
                    ...styles.secondaryButton,
                    ...(action.disabled ? styles.disabledButton : null),
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>

            {props.notice ? <div style={styles.notice}>{props.notice}</div> : null}
          </div>

          <div style={styles.previewColumn}>
            <div style={styles.panelHeader}>
              <div>
                <div style={styles.panelTitle}>{props.previewTitle}</div>
                {props.previewDescription ? (
                  <div style={styles.panelDescription}>
                    {props.previewDescription}
                  </div>
                ) : null}
              </div>
            </div>

            <div style={styles.previewSurface}>{props.preview}</div>
          </div>
        </section>

        {props.templates?.length ? (
          <section style={styles.templatesBand}>
            <div style={styles.panelHeader}>
              <div>
                <div style={styles.panelTitle}>
                  {props.templatesTitle || "Templates"}
                </div>
                {props.templatesDescription ? (
                  <div style={styles.panelDescription}>
                    {props.templatesDescription}
                  </div>
                ) : null}
              </div>
            </div>

            <div
              style={{
                ...styles.templateGrid,
                gridTemplateColumns: props.isMobile
                  ? "1fr"
                  : "repeat(4, minmax(0, 1fr))",
              }}
            >
              {props.templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={template.onSelect}
                  style={styles.templateButton}
                >
                  <span style={styles.templateTopLine}>
                    <span style={styles.templateTitle}>{template.title}</span>
                    {template.badge ? (
                      <span style={styles.templateBadge}>{template.badge}</span>
                    ) : null}
                  </span>
                  <span style={styles.templateDescription}>
                    {template.description}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

export function StudioField(props: FieldProps) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{props.label}</span>
      {props.description ? (
        <span style={styles.fieldDescription}>{props.description}</span>
      ) : null}
      {props.children}
    </label>
  );
}

export function StudioTextArea(props: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={props.value}
      onChange={(event) => props.onChange(event.target.value)}
      placeholder={props.placeholder}
      rows={props.rows ?? 6}
      style={styles.textarea}
    />
  );
}

export function StudioInput(props: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      value={props.value}
      type={props.type || "text"}
      onChange={(event) => props.onChange(event.target.value)}
      placeholder={props.placeholder}
      style={styles.input}
    />
  );
}

export function StudioCheckbox(props: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label style={styles.checkboxRow}>
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(event) => props.onChange(event.target.checked)}
        style={styles.checkboxInput}
      />
      <span style={styles.checkboxTextWrap}>
        <span style={styles.checkboxLabel}>{props.label}</span>
        {props.description ? (
          <span style={styles.checkboxDescription}>{props.description}</span>
        ) : null}
      </span>
    </label>
  );
}

export function StudioSelect<T extends string>(props: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <select
      value={props.value}
      onChange={(event) => props.onChange(event.target.value as T)}
      style={styles.input}
    >
      {props.options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function StudioSegmented<T extends string>(props: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; description?: string }>;
}) {
  return (
    <div style={styles.segmentGrid}>
      {props.options.map((option) => {
        const active = props.value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => props.onChange(option.value)}
            style={{
              ...styles.segmentButton,
              ...(active ? styles.segmentButtonActive : null),
            }}
          >
            <span style={styles.segmentLabel}>{option.label}</span>
            {option.description ? (
              <span style={styles.segmentDescription}>
                {option.description}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function StudioUpload(props: {
  title: string;
  description: string;
  value?: string;
  accept: string;
  onChange: (file: File) => void;
  mediaType?: "image" | "video" | "audio";
  busy?: boolean;
}) {
  return (
    <label style={styles.uploadBox}>
      <input
        type="file"
        accept={props.accept}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) props.onChange(file);
          event.target.value = "";
        }}
        style={{ display: "none" }}
      />
      <span style={styles.uploadTitle}>{props.title}</span>
      <span style={styles.uploadDescription}>
        {props.busy ? "Yükleniyor..." : props.description}
      </span>
      {props.value ? (
        <span style={styles.uploadReady}>
          {props.mediaType === "audio"
            ? "Ses hazır"
            : props.mediaType === "video"
            ? "Video hazır"
            : "Görsel hazır"}
        </span>
      ) : null}
    </label>
  );
}

export function StudioEmpty(props: { title: string; text: string }) {
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyTitle}>{props.title}</div>
      <div style={styles.emptyText}>{props.text}</div>
    </div>
  );
}

export function StudioMediaPreview(props: {
  kind: "image" | "video" | "audio";
  src: string;
  title?: string;
}) {
  if (props.kind === "audio") {
    return (
      <div style={styles.audioPreview}>
        <div style={styles.audioTitle}>{props.title || "Audio"}</div>
        <audio controls src={props.src} style={styles.audio} />
      </div>
    );
  }

  if (props.kind === "video") {
    return (
      <video
        controls
        playsInline
        src={props.src}
        style={styles.videoPreview}
      />
    );
  }

  return (
    <img
      src={props.src}
      alt={props.title || "Generated image"}
      style={styles.imagePreview}
    />
  );
}

export function StudioDownloadLink(props: { href: string; label: string }) {
  return (
    <a href={props.href} download style={styles.downloadLink}>
      {props.label}
    </a>
  );
}

function StatusPill({ status }: { status: StudioStatus }) {
  return (
    <div
      style={{
        ...styles.statusPill,
        color: toneColor(status.tone),
        borderColor: toneBorder(status.tone),
        background: toneBackground(status.tone),
      }}
    >
      {status.label}
    </div>
  );
}

function toneColor(tone?: StudioTone) {
  if (tone === "good") return "#047857";
  if (tone === "warning") return "#b45309";
  if (tone === "danger") return "#b91c1c";
  return "#334155";
}

function toneBorder(tone?: StudioTone) {
  if (tone === "good") return "rgba(4,120,87,0.24)";
  if (tone === "warning") return "rgba(180,83,9,0.24)";
  if (tone === "danger") return "rgba(185,28,28,0.22)";
  return "rgba(51,65,85,0.16)";
}

function toneBackground(tone?: StudioTone) {
  if (tone === "good") return "#ecfdf5";
  if (tone === "warning") return "#fffbeb";
  if (tone === "danger") return "#fef2f2";
  return "#f8fafc";
}

const styles: Record<string, CSSProperties> = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  heroBand: {
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    alignItems: "flex-start",
    padding: 18,
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 8,
    background: "#ffffff",
    flexWrap: "wrap",
  },
  badge: {
    display: "inline-flex",
    padding: "5px 8px",
    borderRadius: 8,
    background: "#ecfdf5",
    color: "#047857",
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 10,
  },
  heroTitle: {
    margin: 0,
    color: "#111827",
    fontSize: 26,
    lineHeight: 1.15,
    letterSpacing: 0,
  },
  heroText: {
    margin: "8px 0 0",
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.6,
    maxWidth: 740,
  },
  statusWrap: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  statusPill: {
    minHeight: 36,
    padding: "0 12px",
    borderRadius: 8,
    border: "1px solid",
    display: "inline-flex",
    alignItems: "center",
    fontSize: 13,
    fontWeight: 800,
  },
  metricBox: {
    minWidth: 92,
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 8,
    padding: "8px 10px",
    background: "#ffffff",
  },
  metricLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  metricValue: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: 900,
  },
  workspace: {
    display: "grid",
    gap: 18,
    alignItems: "stretch",
  },
  inputColumn: {
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 8,
    background: "#ffffff",
    padding: 16,
    minWidth: 0,
  },
  previewColumn: {
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 8,
    background: "#ffffff",
    padding: 16,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
  },
  panelHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  panelTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: 900,
  },
  panelDescription: {
    marginTop: 5,
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.55,
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },
  fieldLabel: {
    color: "#1f2937",
    fontSize: 13,
    fontWeight: 900,
  },
  fieldDescription: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.5,
  },
  input: {
    width: "100%",
    minHeight: 42,
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.14)",
    background: "#ffffff",
    color: "#111827",
    padding: "0 12px",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.14)",
    background: "#ffffff",
    color: "#111827",
    padding: 12,
    fontSize: 14,
    lineHeight: 1.55,
    outline: "none",
    boxSizing: "border-box",
    resize: "vertical",
  },
  checkboxRow: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 8,
    padding: 12,
    background: "#f8fafc",
    cursor: "pointer",
  },
  checkboxInput: {
    marginTop: 3,
    flexShrink: 0,
  },
  checkboxTextWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    minWidth: 0,
  },
  checkboxLabel: {
    color: "#1f2937",
    fontSize: 13,
    fontWeight: 900,
  },
  checkboxDescription: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.5,
  },
  segmentGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 8,
  },
  segmentButton: {
    appearance: "none",
    border: "1px solid rgba(15,23,42,0.12)",
    borderRadius: 8,
    background: "#ffffff",
    color: "#1f2937",
    minHeight: 42,
    padding: "9px 10px",
    textAlign: "left",
    cursor: "pointer",
  },
  segmentButtonActive: {
    borderColor: "rgba(0,168,132,0.42)",
    background: "#ecfdf5",
  },
  segmentLabel: {
    display: "block",
    fontSize: 12,
    fontWeight: 900,
  },
  segmentDescription: {
    display: "block",
    marginTop: 4,
    color: "#64748b",
    fontSize: 11,
    lineHeight: 1.4,
  },
  uploadBox: {
    border: "1px dashed rgba(15,23,42,0.24)",
    borderRadius: 8,
    background: "#f8fafc",
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    cursor: "pointer",
  },
  uploadTitle: {
    color: "#111827",
    fontSize: 13,
    fontWeight: 900,
  },
  uploadDescription: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.5,
  },
  uploadReady: {
    display: "inline-flex",
    alignSelf: "flex-start",
    borderRadius: 8,
    padding: "4px 8px",
    background: "#ecfdf5",
    color: "#047857",
    fontSize: 11,
    fontWeight: 900,
  },
  actionBar: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 16,
  },
  primaryButton: {
    appearance: "none",
    border: 0,
    borderRadius: 8,
    background: "#00a884",
    color: "#ffffff",
    minHeight: 42,
    padding: "0 16px",
    fontSize: 14,
    fontWeight: 900,
    cursor: "pointer",
  },
  secondaryButton: {
    appearance: "none",
    border: "1px solid rgba(15,23,42,0.14)",
    borderRadius: 8,
    background: "#ffffff",
    color: "#1f2937",
    minHeight: 42,
    padding: "0 14px",
    fontSize: 13,
    fontWeight: 900,
    cursor: "pointer",
  },
  disabledButton: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
  notice: {
    marginTop: 12,
    borderRadius: 8,
    border: "1px solid rgba(37,99,235,0.16)",
    background: "#eff6ff",
    color: "#1d4ed8",
    padding: "10px 12px",
    fontSize: 13,
    lineHeight: 1.5,
  },
  previewSurface: {
    flex: 1,
    minHeight: 390,
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.08)",
    background: "#0b0f14",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    padding: 12,
  },
  emptyState: {
    width: "100%",
    minHeight: 280,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    gap: 8,
    color: "#e5e7eb",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 900,
  },
  emptyText: {
    maxWidth: 390,
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 1.6,
  },
  imagePreview: {
    maxWidth: "100%",
    maxHeight: 520,
    objectFit: "contain",
    display: "block",
    borderRadius: 8,
  },
  videoPreview: {
    width: "100%",
    maxHeight: 540,
    objectFit: "contain",
    borderRadius: 8,
    background: "#000000",
  },
  audioPreview: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 8,
    background: "#ffffff",
    padding: 16,
  },
  audioTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: 900,
    marginBottom: 12,
  },
  audio: {
    width: "100%",
  },
  downloadLink: {
    color: "#047857",
    fontSize: 13,
    fontWeight: 900,
    textDecoration: "none",
    padding: "10px 0",
  },
  templatesBand: {
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 8,
    background: "#ffffff",
    padding: 16,
  },
  templateGrid: {
    display: "grid",
    gap: 10,
  },
  templateButton: {
    appearance: "none",
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 8,
    background: "#ffffff",
    padding: 12,
    textAlign: "left",
    cursor: "pointer",
    minHeight: 104,
  },
  templateTopLine: {
    display: "flex",
    gap: 8,
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  templateTitle: {
    color: "#111827",
    fontSize: 13,
    fontWeight: 900,
  },
  templateBadge: {
    borderRadius: 8,
    padding: "3px 6px",
    background: "#fff7ed",
    color: "#c2410c",
    fontSize: 10,
    fontWeight: 900,
    flexShrink: 0,
  },
  templateDescription: {
    display: "block",
    marginTop: 8,
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.5,
  },
};
