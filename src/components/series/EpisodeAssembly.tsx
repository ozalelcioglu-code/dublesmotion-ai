"use client";

import { useEffect, useRef, useState } from "react";
import { getRecordingFormat, renderEpisode } from "@/lib/series/render-episode";
import styles from "@/app/series-studio/series-studio.module.css";

type Selection = { video?: File; voice?: File };
type Result = { url: string; extension: string };

export default function EpisodeAssembly({ scenes, title }: { scenes: { title: string }[]; title: string }) {
  const [selections, setSelections] = useState<Record<number, Selection>>({});
  const [progress, setProgress] = useState<{ clip: number; percent: number } | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result>();
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);
  const resultUrl = result?.url;
  useEffect(() => () => { if (resultUrl) URL.revokeObjectURL(resultUrl); }, [resultUrl]);

  function select(index: number, kind: keyof Selection, file: File | undefined) {
    setSelections((current) => ({ ...current, [index]: { ...current[index], [kind]: file } }));
  }

  async function build() {
    if (controller.current) return;
    setError("");
    if (!getRecordingFormat()) {
      setError("Bu tarayıcı video dışa aktarımını desteklemiyor. Güncel Chrome, Edge veya Safari ile açın.");
      return;
    }
    const media = scenes.map((_, index) => selections[index]).flatMap((item) =>
      item?.video ? [{ video: item.video, voice: item.voice }] : []
    );
    if (media.length !== scenes.length || !media.length) return;
    const task = new AbortController();
    controller.current = task;
    setProgress({ clip: 1, percent: 0 });
    setResult(undefined);
    try {
      const output = await renderEpisode(media, task.signal, (clip, fraction) => {
        const percent = Math.round(fraction * 100);
        setProgress((current) => current?.clip === clip && current.percent === percent ? current : { clip, percent });
      });
      if (!task.signal.aborted) setResult({ url: URL.createObjectURL(output.blob), extension: output.extension });
    } catch (problem) {
      setError(task.signal.aborted ? "Dışa aktarım iptal edildi." : problem instanceof Error ? problem.message : "Video oluşturulamadı.");
    } finally {
      controller.current = null;
      setProgress(null);
    }
  }

  const ready = scenes.length > 0 && scenes.every((_, index) => selections[index]?.video);
  const filename = title.trim().replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 80) || "bolum";
  return (
    <section className={styles.panel} aria-label="Bölüm kurgusu">
      <div className={styles.planHeader}><h2>Bölüm kurgusu</h2></div>
      <p className={styles.hint}>Her sahneye bir video klibi ekleyin. Ayrı ses kaydı seçerseniz, klibin kendi sesi yerine o kayıt kullanılır.</p>
      <div className={styles.castGrid}>
        {scenes.map((scene, index) => (
          <article className={styles.scene} key={index}>
            <h3>{scene.title}</h3>
            <label>
              Sahne videosu
              <input className={styles.input} type="file" accept="video/*" disabled={Boolean(progress)} onChange={(event) => select(index, "video", event.target.files?.[0])} />
            </label>
            <label>
              Ayrı ses kaydı (isteğe bağlı)
              <input className={styles.input} type="file" accept="audio/*" disabled={Boolean(progress)} onChange={(event) => select(index, "voice", event.target.files?.[0])} />
            </label>
            {selections[index]?.voice && (
              <button className={styles.button} type="button" disabled={Boolean(progress)} onClick={(event) => {
                const audioInput = event.currentTarget.parentElement?.querySelector<HTMLInputElement>('input[accept="audio/*"]');
                if (audioInput) audioInput.value = "";
                select(index, "voice", undefined);
              }}>Ayrı sesi kaldır</button>
            )}
          </article>
        ))}
      </div>
      {!scenes.length && <p className={styles.empty}>Video eklemek için önce bölüm senaryosuna bir sahne başlığı yazın.</p>}
      {scenes.length > 0 && <p className={styles.hint}>Dosyalar bu oturumda tarayıcıda işlenir. Dışa aktarım klipler oynarken gerçekleşir. İşlem boyunca sekmeyi açık ve görünür tutun.</p>}
      <div className={styles.actions}>
        <button className={styles.button} type="button" disabled={!ready || Boolean(progress)} onClick={() => void build()}>Bölüm videosunu oluştur</button>
        {progress && <button className={styles.button} type="button" onClick={() => controller.current?.abort()}>İptal</button>}
      </div>
      {progress && (
        <div>
          <p>Klip {progress.clip} / {scenes.length}</p>
          <progress aria-label="Geçerli klibin dışa aktarımı" value={progress.percent} max={100} />
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {result && <div className={styles.output}>
        <video controls playsInline src={result.url} />
        <a className={styles.button} href={result.url} download={filename + "." + result.extension}>Bölüm videosunu indir</a>
      </div>}
    </section>
  );
}
