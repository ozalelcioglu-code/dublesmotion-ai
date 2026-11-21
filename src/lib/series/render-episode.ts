export type SceneMedia = { video: File; voice?: File };

const formats = [
  { mime: "video/mp4;codecs=avc1.42001E,mp4a.40.2", extension: "mp4" },
  { mime: "video/webm;codecs=vp8,opus", extension: "webm" },
  { mime: "video/webm", extension: "webm" },
  { mime: "video/mp4", extension: "mp4" },
];

export function getRecordingFormat() {
  if (typeof MediaRecorder === "undefined" ||
      typeof AudioContext === "undefined" ||
      typeof HTMLCanvasElement.prototype.captureStream !== "function") return undefined;
  return formats.find(({ mime }) => MediaRecorder.isTypeSupported(mime));
}

function waitForMedia(element: HTMLMediaElement, event: string, signal: AbortSignal, timeout?: number) {
  return new Promise<void>((resolve, reject) => {
    const timer = timeout ? setTimeout(failed, timeout) : undefined;
    function clean() {
      clearTimeout(timer);
      element.removeEventListener(event, ready);
      element.removeEventListener("error", failed);
      signal.removeEventListener("abort", aborted);
    }
    function ready() { clean(); resolve(); }
    function failed() { clean(); reject(new Error("Medya dosyası okunamadı veya oynatılamadı.")); }
    function aborted() { clean(); reject(signal.reason); }
    signal.addEventListener("abort", aborted, { once: true });
    element.addEventListener(event, ready, { once: true });
    element.addEventListener("error", failed, { once: true });
    if (signal.aborted) aborted();
  });
}

async function openMedia(element: HTMLMediaElement, url: string, signal: AbortSignal) {
  const ready = waitForMedia(element, "loadeddata", signal, 20000);
  element.src = url;
  element.load();
  await ready;
  if (!Number.isFinite(element.duration) || element.duration <= 0) {
    throw new Error("Medya dosyasının süresi okunamadı.");
  }
  return element.duration;
}

export async function renderEpisode(
  scenes: SceneMedia[],
  signal: AbortSignal,
  onProgress: (scene: number, fraction: number) => void,
) {
  const format = getRecordingFormat();
  if (!format || !scenes.length) throw new Error("Video dışa aktarımı bu tarayıcıda kullanılamıyor.");

  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Video yüzeyi oluşturulamadı.");

  const video = document.createElement("video");
  video.playsInline = true;
  const voice = document.createElement("audio");
  const audio = new AudioContext();
  const destination = audio.createMediaStreamDestination();
  const clipSound = audio.createGain();
  const voiceSound = audio.createGain();
  audio.createMediaElementSource(video).connect(clipSound).connect(destination);
  audio.createMediaElementSource(voice).connect(voiceSound).connect(destination);

  const picture = canvas.captureStream(24);
  const stream = new MediaStream([...picture.getVideoTracks(), ...destination.stream.getAudioTracks()]);
  let recorder: MediaRecorder | undefined;
  let frame = 0;

  function draw() {
    if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
      const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
      const width = Math.round(video.videoWidth * scale);
      const height = Math.round(video.videoHeight * scale);
      context.fillStyle = "#000";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(video, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    }
  }

  try {
    await audio.resume();
    signal.throwIfAborted();
    recorder = new MediaRecorder(stream, { mimeType: format.mime, videoBitsPerSecond: 4_000_000 });
    const chunks: Blob[] = [];
    const complete = new Promise<Blob>((resolve, reject) => {
      recorder!.addEventListener("dataavailable", ({ data }) => {
        if (data.size) chunks.push(data);
      });
      recorder!.addEventListener("stop", () => resolve(new Blob(chunks, { type: recorder!.mimeType })), { once: true });
      recorder!.addEventListener("error", () => reject(new Error("Tarayıcı video dosyasını kaydedemedi.")), { once: true });
    });
    // Attach a handler while playback is still in progress.
    void complete.catch(() => undefined);

    for (const [index, scene] of scenes.entries()) {
      signal.throwIfAborted();
      onProgress(index + 1, 0);
      const videoUrl = URL.createObjectURL(scene.video);
      const voiceUrl = scene.voice ? URL.createObjectURL(scene.voice) : undefined;
      try {
        const duration = await openMedia(video, videoUrl, signal);
        if (!video.videoWidth || !video.videoHeight) throw new Error("Dosyada video görüntüsü bulunamadı.");
        clipSound.gain.value = voiceUrl ? 0 : 1;
        if (voiceUrl) {
          const voiceDuration = await openMedia(voice, voiceUrl, signal);
          if (voiceDuration > duration + 0.04) {
            throw new Error("Ses kaydı klipten uzun. Ses kaydını kısaltın veya daha uzun bir klip seçin.");
          }
        }

        draw();
        if (index === 0) recorder.start(1000);
        else recorder.resume();

        const ended = waitForMedia(video, "ended", signal, (duration + 30) * 1000);
        void ended.catch(() => undefined);
        const paint = () => {
          draw();
          onProgress(index + 1, Math.min(video.currentTime / duration, 1));
          frame = requestAnimationFrame(paint);
        };
        paint();
        await Promise.race([
          Promise.all([video.play(), scene.voice ? voice.play() : Promise.resolve()]).then(() => ended),
          complete.then(() => { throw new Error("Video kaydı beklenmeden durdu."); }),
        ]);

        cancelAnimationFrame(frame);
        voice.pause();
        if (index < scenes.length - 1) recorder.pause();
      } catch (error) {
        if (signal.aborted) throw error;
        throw new Error(index + 1 + ". klip: " + (error instanceof Error ? error.message : "Dışa aktarılamadı."));
      } finally {
        URL.revokeObjectURL(videoUrl);
        if (voiceUrl) URL.revokeObjectURL(voiceUrl);
      }
    }

    recorder.stop();
    const blob = await complete;
    if (!blob.size) throw new Error("Oluşturulan video dosyası boş.");
    return { blob, extension: format.extension };
  } finally {
    cancelAnimationFrame(frame);
    if (recorder && recorder.state !== "inactive") recorder.stop();
    video.pause();
    voice.pause();
    video.removeAttribute("src");
    voice.removeAttribute("src");
    video.load();
    voice.load();
    stream.getTracks().forEach((track) => track.stop());
    await audio.close().catch(() => undefined);
  }
}
