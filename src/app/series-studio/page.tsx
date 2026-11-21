"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import AppShell from "@/components/layout/AppShell";
import EpisodeAssembly from "@/components/series/EpisodeAssembly";
import { estimateSpeechSeconds, parseScript } from "@/lib/series/parse-script";
import {
  characterKey,
  copySeries,
  createEpisode,
  createSeries,
  getReferenceUrl,
  getServerWorkspace,
  getWorkspace,
  readBackup,
  subscribeWorkspace,
  updateWorkspace,
  type Character,
  type Episode,
  type Series,
} from "@/lib/series/workspace";
import styles from "./series-studio.module.css";

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function fileName(title: string) {
  return title.trim().replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 80).replace(/^-|-$/g, "") || "bolum";
}

export default function SeriesStudio() {
  const workspace = useSyncExternalStore(subscribeWorkspace, getWorkspace, getServerWorkspace);

  return (
    <AppShell currentPath="/series-studio" pageTitle="Dizi Stüdyosu">
      {workspace ? <Studio workspace={workspace} /> : <p role="status">Çalışma alanı açılıyor…</p>}
    </AppShell>
  );
}

function Studio({ workspace }: { workspace: ReturnType<typeof getWorkspace> }) {
  const [section, setSection] = useState<"episode" | "cast" | "assembly">("episode");
  const [storageFailed, setStorageFailed] = useState(false);
  const [characterName, setCharacterName] = useState("");
  const [characterMessage, setCharacterMessage] = useState("");
  const [backupMessage, setBackupMessage] = useState("");
  const series = workspace.series.find((item) => item.id === workspace.activeSeriesId)!;
  const episode = series.episodes.find((item) => item.id === series.activeEpisodeId)!;
  const parsed = useMemo(() => parseScript(episode.script), [episode.script]);
  const production = useMemo(() => {
    const speakers = new Map<string, string>();
    let dialogueCount = 0;
    let dialogueSeconds = 0;
    const scenes = parsed.scenes.map((scene, index) => ({
      number: index + 1,
      title: scene.title,
      entries: scene.entries.map((entry) => {
        if (entry.type === "direction") return entry;
        const key = characterKey(entry.speaker);
        if (!speakers.has(key)) speakers.set(key, entry.speaker);
        const estimatedSpeechSeconds = estimateSpeechSeconds(entry.text);
        dialogueCount++;
        dialogueSeconds += estimatedSpeechSeconds;
        return { ...entry, characterKey: key, estimatedSpeechSeconds };
      }),
    }));
    return { speakers, scenes, dialogueCount, dialogueSeconds };
  }, [parsed.scenes]);
  const unassigned = Array.from(production.speakers).filter(([key]) =>
    !series.cast.some((character) => characterKey(character.name) === key)
  ).map(([, name]) => name);

  function save(update: Parameters<typeof updateWorkspace>[0]) {
    setStorageFailed(!updateWorkspace(update));
  }

  function changeSeries(update: (current: Series) => Series) {
    save((current) => ({
      ...current,
      series: current.series.map((item) => item.id === series.id ? update(item) : item),
    }));
  }

  function changeEpisode(values: Partial<Omit<Episode, "id">>) {
    changeSeries((current) => ({
      ...current,
      episodes: current.episodes.map((item) => item.id === episode.id ? { ...item, ...values } : item),
    }));
  }

  function addSeries() {
    const next = createSeries();
    save((current) => ({ ...current, series: [...current.series, next], activeSeriesId: next.id }));
    setSection("episode");
    setCharacterMessage("");
  }

  function addEpisode() {
    const next = createEpisode();
    changeSeries((current) => ({
      ...current,
      episodes: [...current.episodes, next],
      activeEpisodeId: next.id,
    }));
    setSection("episode");
  }

  function addCharacters(names: string[]) {
    changeSeries((current) => {
      const cast = [...current.cast];
      const keys = new Set(cast.map((character) => characterKey(character.name)));
      for (const name of names) {
        const key = characterKey(name);
        if (keys.has(key)) continue;
        cast.push({ name, referenceUrl: "", appearance: "", voice: "" });
        keys.add(key);
      }
      return { ...current, cast };
    });
  }

  function addNamedCharacter() {
    const name = characterName.trim();
    if (!name) return;
    if (series.cast.some((character) => characterKey(character.name) === characterKey(name))) {
      setCharacterMessage("Bu karakter kadroda zaten var.");
      return;
    }
    addCharacters([name]);
    setCharacterName("");
    setCharacterMessage("");
  }

  function changeCharacter(name: string, values: Partial<Omit<Character, "name">>) {
    changeSeries((current) => ({
      ...current,
      cast: current.cast.map((character) => character.name === name ? { ...character, ...values } : character),
    }));
  }

  async function importBackup(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setBackupMessage("Yedek dosyası 5 MB sınırını aşıyor.");
      return;
    }
    try {
      const backup = readBackup(await file.text());
      const copies = backup.series.map(copySeries);
      const active = backup.series.findIndex((item) => item.id === backup.activeSeriesId);
      save((current) => ({
        ...current,
        series: [...current.series, ...copies],
        activeSeriesId: copies[active].id,
      }));
      setSection("episode");
      setCharacterMessage("");
      setBackupMessage(copies.length + " dizi yedekten kopya olarak eklendi.");
    } catch {
      setBackupMessage("Dizi Stüdyosu yedeği okunamadı. Geçerli bir JSON yedeği seçin.");
    }
  }

  function exportPlan() {
    const number = series.episodes.findIndex((item) => item.id === episode.id) + 1;
    const plan = {
      version: 1,
      series: series.title,
      episode: { number, title: episode.title, sourceScript: episode.script },
      introduction: parsed.introduction,
      notes: parsed.notes,
      cast: series.cast.map(({ referenceUrl, ...character }) => ({
        ...character,
        key: characterKey(character.name),
        referenceUrl: getReferenceUrl(referenceUrl) ?? null,
      })),
      unassignedSpeakers: unassigned,
      estimatedDialogueSeconds: production.dialogueSeconds,
      scenes: production.scenes,
    };
    download(fileName(episode.title) + "-plan.json", JSON.stringify(plan, null, 2), "application/json");
  }

  return (
    <main className={styles.workspace}>
      <div className={styles.toolbar}>
        <label>
          Dizi
          <select className={styles.input} value={series.id} onChange={(event) => {
            const activeSeriesId = event.target.value;
            save((current) => ({ ...current, activeSeriesId }));
            setCharacterMessage("");
          }}>
            {workspace.series.map((item, index) => (
              <option key={item.id} value={item.id}>{item.title.trim() || "Dizi " + (index + 1)}</option>
            ))}
          </select>
        </label>
        <button className={styles.button} onClick={addSeries}>Yeni dizi</button>
        <label>
          Dizi adı
          <input className={styles.input} value={series.title} maxLength={160} onChange={(event) => {
            const title = event.target.value;
            changeSeries((current) => ({ ...current, title }));
          }} placeholder="Dizinizin adı" />
        </label>
        <p className={styles.saveStatus} role="status">
          {storageFailed
            ? "Tarayıcı kaydı başarısız. Sayfayı kapatmadan önce bölüm metnini veya planını indirin."
            : "Değişiklikler bu tarayıcıya kaydedilir."}
        </p>
      </div>

      <div className={styles.switcher} aria-label="Dizi çalışma alanı">
        <button className={styles.button} aria-pressed={section === "episode"} onClick={() => setSection("episode")}>Bölümler</button>
        <button className={styles.button} aria-pressed={section === "cast"} onClick={() => setSection("cast")}>Karakterler ({series.cast.length})</button>
        <button className={styles.button} aria-pressed={section === "assembly"} onClick={() => setSection("assembly")}>Kurgu</button>
      </div>

      {section === "episode" && (
        <div className={styles.grid}>
          <section className={styles.panel} aria-label="Bölüm düzenleyici">
            <div className={styles.episodePicker}>
              <label>
                Bölüm
                <select className={styles.input} value={episode.id} onChange={(event) => {
                  const activeEpisodeId = event.target.value;
                  changeSeries((current) => ({ ...current, activeEpisodeId }));
                }}>
                  {series.episodes.map((item, index) => (
                    <option key={item.id} value={item.id}>{index + 1}. {item.title.trim() || "Adsız bölüm"}</option>
                  ))}
                </select>
              </label>
              <button className={styles.button} onClick={addEpisode}>Yeni bölüm</button>
            </div>
            <label className={styles.label} htmlFor="episode-title">Bölüm adı</label>
            <input id="episode-title" className={styles.input} value={episode.title} maxLength={160} onChange={(event) => changeEpisode({ title: event.target.value })} />
            <label className={styles.label} htmlFor="script">Bölüm senaryosu</label>
            <p className={styles.hint} id="script-hint">“Sahne 1 — Başlık” ve “Karakter: Replik” biçimini kullanın.</p>
            <textarea id="script" aria-describedby="script-hint" className={styles.textarea} value={episode.script} onChange={(event) => changeEpisode({ script: event.target.value })} />
            <div className={styles.actions}>
              <button className={styles.button} disabled={!episode.script.trim()} onClick={() => download(fileName(episode.title) + ".txt", episode.script, "text/plain;charset=utf-8")}>Metni indir</button>
              <button className={styles.button} disabled={!episode.script.trim()} onClick={exportPlan}>Üretim planını indir</button>
            </div>
          </section>
          <section className={styles.panel} aria-label="Sahne planı">
            <div className={styles.planHeader}>
              <h2>Sahne planı</h2>
              <span className={styles.count}>{parsed.scenes.length} sahne · {production.dialogueCount} replik</span>
            </div>
            {production.dialogueCount > 0 && (
              <p className={styles.hint}>Tahmini toplam konuşma süresi {production.dialogueSeconds} sn. Yönergeler ve sahne geçişleri bu süreye dahil değildir.</p>
            )}
            {unassigned.length > 0 && (
              <div className={styles.unassigned}>
                <p>Karakter profili eksik: {unassigned.join(", ")}</p>
                <button className={styles.button} onClick={() => addCharacters(unassigned)}>Kadroya ekle</button>
              </div>
            )}
            {parsed.introduction.length > 0 && (
              <details className={styles.intro}>
                <summary>Sahne öncesi metin</summary>
                {parsed.introduction.map((line, index) => <p key={index}>{line}</p>)}
              </details>
            )}
            {parsed.scenes.length === 0 && <p className={styles.empty}>Sahne başlığı eklediğinizde plan burada görünür.</p>}
            {production.scenes.map((scene) => (
              <article className={styles.scene} key={scene.number}>
                <h3>{scene.title}</h3>
                {scene.entries.length === 0 && <p className={styles.hint}>Bu sahnede henüz metin yok.</p>}
                {scene.entries.map((entry, index) => entry.type === "dialogue" ? (
                  <div className={styles.line} key={index}>
                    <div><strong>{entry.speaker}</strong><span>~{entry.estimatedSpeechSeconds} sn</span></div>
                    <p>{entry.text}</p>
                  </div>
                ) : <p className={styles.direction} key={index}>{entry.text}</p>)}
              </article>
            ))}
            {parsed.notes.length > 0 && (
              <details className={styles.intro}>
                <summary>Bölüm notları</summary>
                {parsed.notes.map((line, index) => <p key={index}>{line}</p>)}
              </details>
            )}
          </section>
        </div>
      )}
      {section === "cast" && (
        <section className={styles.panel} aria-label="Karakter kadrosu">
          <div className={styles.planHeader}><h2>Dizi kadrosu</h2></div>
          <p className={styles.hint}>Buradaki karakter profilleri dizinin tüm bölümlerinde kullanılır. Ses tarifi, seslendirme yönlendirmesi olarak kaydedilir.</p>
          <form className={styles.actions} onSubmit={(event) => {
            event.preventDefault();
            addNamedCharacter();
          }}>
            <label>
              Karakter adı
              <input className={styles.input} value={characterName} maxLength={60} onChange={(event) => {
                setCharacterName(event.target.value);
                setCharacterMessage("");
              }} />
            </label>
            <button className={styles.button} disabled={!characterName.trim()}>Karakter ekle</button>
          </form>
          {characterMessage && <p role="status">{characterMessage}</p>}
          <div className={styles.castGrid}>
            {series.cast.map((character) => {
              const reference = getReferenceUrl(character.referenceUrl);
              return (
                <article className={styles.scene} key={character.name}>
                  <h3>{character.name}</h3>
                  <label>
                    Görsel referans bağlantısı
                    <input type="url" className={styles.input} value={character.referenceUrl} maxLength={2048} onChange={(event) => changeCharacter(character.name, { referenceUrl: event.target.value })} />
                  </label>
                  {character.referenceUrl && (reference ? (
                    <a className={styles.reference} href={reference} target="_blank" rel="noreferrer">Referansı aç</a>
                  ) : <p className={styles.hint}>Geçerli bir HTTPS bağlantısı girin.</p>)}
                  <label>
                    Görünüş ve sahnedeki konum
                    <textarea className={styles.profileField} value={character.appearance} maxLength={2000} onChange={(event) => changeCharacter(character.name, { appearance: event.target.value })} />
                  </label>
                  <label>
                    Ses ve konuşma tarzı
                    <textarea className={styles.profileField} value={character.voice} maxLength={1000} onChange={(event) => changeCharacter(character.name, { voice: event.target.value })} />
                  </label>
                </article>
              );
            })}
          </div>
        </section>
      )}
      <div hidden={section !== "assembly"}>
        <EpisodeAssembly
          key={JSON.stringify([episode.id, parsed.scenes.map((scene) => scene.title)])}
          scenes={parsed.scenes}
          title={episode.title}
        />
      </div>
      <details className={styles.backup}>
        <summary>Çalışma alanı yedeği</summary>
        <p className={styles.hint}>Yedek, dizileri, bölümleri ve karakter profillerini içerir. İçe aktarılan diziler kopya olarak eklenir.</p>
        <div className={styles.actions}>
          <button className={styles.button} onClick={() => download("dizi-studyosu-yedek.json", JSON.stringify(workspace, null, 2), "application/json")}>Yedeği indir</button>
          <label>
            Yedekten dizi ekle
            <input className={styles.input} type="file" accept=".json,application/json" onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void importBackup(file);
            }} />
          </label>
        </div>
        {backupMessage && <p role="status" className={styles.hint}>{backupMessage}</p>}
      </details>
    </main>
  );
}
