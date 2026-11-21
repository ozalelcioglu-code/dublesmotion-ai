export type Episode = {
  id: string;
  title: string;
  script: string;
};

export type Character = {
  name: string;
  referenceUrl: string;
  appearance: string;
  voice: string;
};

export type Series = {
  id: string;
  title: string;
  episodes: Episode[];
  activeEpisodeId: string;
  cast: Character[];
};

export type SeriesWorkspace = {
  version: 1;
  series: Series[];
  activeSeriesId: string;
};

const storageKey = "dubles-series-workspace-v1";
const legacyKey = "dubles-series-draft-v1";
const changeEvent = "dubles-series-workspace-change";

export function createEpisode(id: string = crypto.randomUUID()): Episode {
  return { id, title: "", script: "" };
}

export function createSeries(title = "", id: string = crypto.randomUUID()): Series {
  const episode = createEpisode(id + "-episode");
  return { id, title, episodes: [episode], activeEpisodeId: episode.id, cast: [] };
}

export function characterKey(name: string) {
  return name.trim().normalize("NFC").toLocaleLowerCase("tr");
}

export function getReferenceUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password) return url.href;
  } catch {
    // A partially entered link is kept in the character profile.
  }
}

function readLegacy(raw: string | null): SeriesWorkspace {
  const series = createSeries("", "first-series");
  if (raw) {
    try {
      const draft = JSON.parse(raw);
      if (typeof draft?.title === "string" && typeof draft?.script === "string") {
        series.episodes[0] = { ...series.episodes[0], title: draft.title, script: draft.script };
      }
    } catch {
      // Keep the legacy data in storage even if it cannot be read.
    }
  }
  return { version: 1, series: [series], activeSeriesId: series.id };
}

const empty = readLegacy(null);
let volatile: SeriesWorkspace | undefined;
let cached: { value: string | null; legacy: string | null; workspace: SeriesWorkspace } | undefined;

function isWorkspace(value: SeriesWorkspace): boolean {
  return value?.version === 1 && Array.isArray(value.series) &&
    value.series.some((series) => series?.id === value.activeSeriesId) &&
    value.series.every((series) =>
      typeof series?.id === "string" && typeof series.title === "string" &&
      Array.isArray(series.episodes) &&
      series.episodes.some((episode) => episode?.id === series.activeEpisodeId) &&
      series.episodes.every((episode) =>
        typeof episode?.id === "string" && typeof episode.title === "string" && typeof episode.script === "string"
      ) &&
      Array.isArray(series.cast) && series.cast.every((character) =>
        typeof character?.name === "string" && typeof character.appearance === "string" &&
        typeof character.voice === "string" && typeof character.referenceUrl === "string"
      )
    );
}

export function readBackup(raw: string): SeriesWorkspace {
  const value = JSON.parse(raw);
  if (!isWorkspace(value)) throw new Error("Invalid workspace backup");
  return value;
}

export function copySeries(series: Series): Series {
  const episodes = series.episodes.map((episode) => ({ ...episode, id: crypto.randomUUID() }));
  const activeIndex = series.episodes.findIndex((episode) => episode.id === series.activeEpisodeId);
  return { ...series, id: crypto.randomUUID(), episodes, activeEpisodeId: episodes[activeIndex].id };
}

export function getWorkspace(): SeriesWorkspace {
  if (volatile) return volatile;
  try {
    const value = localStorage.getItem(storageKey);
    const legacy = value === null ? localStorage.getItem(legacyKey) : null;
    if (cached && value === cached.value && legacy === cached.legacy) return cached.workspace;

    let workspace = readLegacy(legacy);
    if (value !== null) {
      const parsed = JSON.parse(value);
      if (isWorkspace(parsed)) workspace = parsed;
    }
    cached = { value, legacy, workspace };
    return workspace;
  } catch {
    return empty;
  }
}

export function getServerWorkspace(): null {
  return null;
}

export function subscribeWorkspace(callback: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key === storageKey || event.key === legacyKey || event.key === null) callback();
  }
  window.addEventListener("storage", onStorage);
  window.addEventListener(changeEvent, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(changeEvent, callback);
  };
}

export function updateWorkspace(update: (value: SeriesWorkspace) => SeriesWorkspace): boolean {
  const workspace = update(getWorkspace());
  try {
    const value = JSON.stringify(workspace);
    localStorage.setItem(storageKey, value);
    volatile = undefined;
    cached = { value, legacy: null, workspace };
  } catch {
    volatile = workspace;
  }
  window.dispatchEvent(new Event(changeEvent));
  return !volatile;
}
