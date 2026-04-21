"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import {
  LANGUAGE_FLAGS,
  LANGUAGE_LABELS,
  getSafeLanguage,
  type AppLanguage,
} from "@/lib/i18n";
import { useIsMobile } from "@/lib/useIsMobile";
import { useLanguage } from "@/provider/languageProvider";

type HomeCopy = {
  subBrand: string;
  nav: {
    product: string;
    studio: string;
    api: string;
    pricing: string;
    login: string;
    register: string;
  };
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
  apiCta: string;
  stats: Array<{ label: string; value: string }>;
  visualLabels: {
    video: string;
    image: string;
    music: string;
    avatar: string;
    live: string;
  };
  toolsTitle: string;
  toolsDescription: string;
  tools: Array<{ title: string; text: string; href: string }>;
  studioTitle: string;
  studioDescription: string;
  studioItems: Array<{ title: string; text: string }>;
  apiTitle: string;
  apiButton: string;
};

const HOME_COPY: Record<AppLanguage, HomeCopy> = {
  tr: {
    subBrand: "AI Creative Platform",
    nav: {
      product: "Ürün",
      studio: "Stüdyo",
      api: "API",
      pricing: "Planlar",
      login: "Giriş",
      register: "Kayıt ol",
    },
    eyebrow: "Video, görsel, müzik, avatar ve araştırma tek merkezde",
    title: "Fikrini yaz. Duble-S Motion AI onu içerik, araştırma ve otomasyona çevirsin.",
    description:
      "Sohbetten üretim başlat, görseli videoya taşı, müzik üret, avatar konuştur, proje ajanıyla dosya ve kod akışlarını yönet.",
    primaryCta: "AI sohbete başla",
    secondaryCta: "Video üret",
    apiCta: "API erişimini incele",
    stats: [
      { value: "5+", label: "üretim motoru" },
      { value: "4", label: "dil desteği" },
      { value: "API", label: "geliştirici erişimi" },
    ],
    visualLabels: {
      video: "AI video",
      image: "AI görsel",
      music: "AI müzik",
      avatar: "Konuşan avatar",
      live: "Canlı araştırma",
    },
    toolsTitle: "Platform modülleri",
    toolsDescription: "Her modül aynı üretim diliyle çalışır, sonuçlar geçmişe ve editöre bağlanır.",
    tools: [
      {
        title: "Sohbet içinde üretim",
        text: "Yönlendirme yapmadan sonucu sohbet içinde al.",
        href: "/chat",
      },
      {
        title: "Metinden video",
        text: "Sahne, kamera ve süreyi tek brief ile yönet.",
        href: "/text-to-video",
      },
      {
        title: "Görsel ve resimden video",
        text: "Görsel üret, sonra hareketli videoya dönüştür.",
        href: "/text-to-image",
      },
      {
        title: "Müzik ve vokal",
        text: "Dil, tür, söz ve vokal karakterini birlikte seç.",
        href: "/music",
      },
      {
        title: "Video klon",
        text: "Karakter, yüz ve ses akışlarını kontrollü şekilde çalıştır.",
        href: "/video-clone",
      },
      {
        title: "Derin araştırma",
        text: "Canlı web ve proje ajanı ile üretime veri kat.",
        href: "/chat",
      },
    ],
    studioTitle: "Canlı üretim vitrini",
    studioDescription: "Ana sayfa artık platformun üretebildiği içerik hissini gösterir.",
    studioItems: [
      { title: "Kısa video loop", text: "Storyboard, kamera ve ritim önizlemesi." },
      { title: "Avatar sahnesi", text: "Çocuk ve yetişkin robot karakter seçenekleri." },
      { title: "Müzik dalgası", text: "Vokal, dil ve tempo akışı." },
    ],
    apiTitle: "Duble-S Motion API",
    apiButton: "Planları ve API erişimini aç",
  },
  en: {
    subBrand: "AI Creative Platform",
    nav: {
      product: "Product",
      studio: "Studio",
      api: "API",
      pricing: "Plans",
      login: "Login",
      register: "Sign up",
    },
    eyebrow: "Video, image, music, avatar, and research in one place",
    title: "Write the idea. Duble-S Motion AI turns it into content, research, and automation.",
    description:
      "Start generation from chat, move images into video, create music, make avatars speak, and manage files or code with the project agent.",
    primaryCta: "Start AI chat",
    secondaryCta: "Generate video",
    apiCta: "Explore API access",
    stats: [
      { value: "5+", label: "generation engines" },
      { value: "4", label: "languages" },
      { value: "API", label: "developer access" },
    ],
    visualLabels: {
      video: "AI video",
      image: "AI image",
      music: "AI music",
      avatar: "Talking avatar",
      live: "Live research",
    },
    toolsTitle: "Platform modules",
    toolsDescription: "Every module speaks the same product language and connects results to history and editor flows.",
    tools: [
      {
        title: "Generation inside chat",
        text: "Get the result inside the conversation without being redirected.",
        href: "/chat",
      },
      {
        title: "Text to video",
        text: "Control scene, camera, and duration with one brief.",
        href: "/text-to-video",
      },
      {
        title: "Image and image to video",
        text: "Generate an image, then turn it into motion.",
        href: "/text-to-image",
      },
      {
        title: "Music and vocals",
        text: "Choose language, genre, lyrics, and vocal character together.",
        href: "/music",
      },
      {
        title: "Video clone",
        text: "Run character, face, and voice flows with control.",
        href: "/video-clone",
      },
      {
        title: "Deep research",
        text: "Add live web and project agent context to production.",
        href: "/chat",
      },
    ],
    studioTitle: "Live production showcase",
    studioDescription: "The homepage now shows the kind of output the platform can create.",
    studioItems: [
      { title: "Short video loop", text: "Storyboard, camera, and rhythm preview." },
      { title: "Avatar scene", text: "Child and adult robot character options." },
      { title: "Music wave", text: "Vocal, language, and tempo flow." },
    ],
    apiTitle: "Duble-S Motion API",
    apiButton: "Open plans and API access",
  },
  de: {
    subBrand: "AI Creative Platform",
    nav: {
      product: "Produkt",
      studio: "Studio",
      api: "API",
      pricing: "Pläne",
      login: "Anmelden",
      register: "Registrieren",
    },
    eyebrow: "Video, Bild, Musik, Avatar und Recherche an einem Ort",
    title: "Schreibe die Idee. Duble-S Motion AI macht daraus Content, Recherche und Automatisierung.",
    description:
      "Starte Generierung im Chat, verwandle Bilder in Videos, erstelle Musik, lass Avatare sprechen und steuere Dateien oder Code mit dem Projekt-Agent.",
    primaryCta: "AI-Chat starten",
    secondaryCta: "Video erzeugen",
    apiCta: "API-Zugang ansehen",
    stats: [
      { value: "5+", label: "Generierungs-Engines" },
      { value: "4", label: "Sprachen" },
      { value: "API", label: "Entwicklerzugang" },
    ],
    visualLabels: {
      video: "KI-Video",
      image: "KI-Bild",
      music: "KI-Musik",
      avatar: "Sprechender Avatar",
      live: "Live-Recherche",
    },
    toolsTitle: "Plattformmodule",
    toolsDescription: "Jedes Modul nutzt dieselbe Produktsprache und verbindet Ergebnisse mit Verlauf und Editor.",
    tools: [
      {
        title: "Generierung im Chat",
        text: "Erhalte das Ergebnis direkt im Gespräch ohne Weiterleitung.",
        href: "/chat",
      },
      {
        title: "Text zu Video",
        text: "Steuere Szene, Kamera und Dauer mit einem Brief.",
        href: "/text-to-video",
      },
      {
        title: "Bild und Bild zu Video",
        text: "Erzeuge ein Bild und verwandle es danach in Bewegung.",
        href: "/text-to-image",
      },
      {
        title: "Musik und Vocals",
        text: "Wähle Sprache, Genre, Lyrics und Vokalcharakter zusammen.",
        href: "/music",
      },
      {
        title: "Video Clone",
        text: "Arbeite kontrolliert mit Figur, Gesicht und Stimme.",
        href: "/video-clone",
      },
      {
        title: "Tiefenrecherche",
        text: "Nutze Live-Web und Projekt-Agent als Produktionskontext.",
        href: "/chat",
      },
    ],
    studioTitle: "Live-Produktionsvitrine",
    studioDescription: "Die Startseite zeigt jetzt, welche Inhalte die Plattform erzeugen kann.",
    studioItems: [
      { title: "Kurzer Video-Loop", text: "Storyboard-, Kamera- und Rhythmusvorschau." },
      { title: "Avatar-Szene", text: "Kinder- und Erwachsenen-Roboter als Charakteroptionen." },
      { title: "Musikwelle", text: "Vokal-, Sprach- und Tempoablauf." },
    ],
    apiTitle: "Duble-S Motion API",
    apiButton: "Pläne und API-Zugang öffnen",
  },
  ku: {
    subBrand: "AI Creative Platform",
    nav: {
      product: "Hilber",
      studio: "Stûdyo",
      api: "API",
      pricing: "Plan",
      login: "Têkeve",
      register: "Tomar bibe",
    },
    eyebrow: "Vîdyo, wêne, muzîk, avatar û lêkolîn di yek cihî de",
    title: "Fikrê xwe binivîse. Duble-S Motion AI wê dike naverok, lêkolîn û otomasyon.",
    description:
      "Ji chatê hilberînê dest pê bike, wêne bike vîdyo, muzîk çêke, avatar bidin axaftin û bi project agent pel an kodê rêve bibe.",
    primaryCta: "Dest bi chat AI bike",
    secondaryCta: "Vîdyo çêke",
    apiCta: "Gihîştina API bibîne",
    stats: [
      { value: "5+", label: "motorên hilberînê" },
      { value: "4", label: "ziman" },
      { value: "API", label: "gihîştina developer" },
    ],
    visualLabels: {
      video: "Vîdyoya AI",
      image: "Wêneya AI",
      music: "Muzîka AI",
      avatar: "Avatara diaxive",
      live: "Lêkolîna zindî",
    },
    toolsTitle: "Modulên platformê",
    toolsDescription: "Hemû modul bi heman zimanê hilberînê dixebitin û encam bi history û editorê ve girêdidin.",
    tools: [
      {
        title: "Hilberîn di chatê de",
        text: "Bê ku biçe rûpelek din, encamê di sohbetê de bigire.",
        href: "/chat",
      },
      {
        title: "Ji nivîsê vîdyo",
        text: "Dîmen, kamera û demê bi yek briefê rêve bibe.",
        href: "/text-to-video",
      },
      {
        title: "Wêne û ji wêneyê vîdyo",
        text: "Wêne çêke, paşê wê bike tevger.",
        href: "/text-to-image",
      },
      {
        title: "Muzîk û vokal",
        text: "Ziman, cure, gotin û karaktera vokalê bi hev re hilbijêre.",
        href: "/music",
      },
      {
        title: "Video clone",
        text: "Karakter, rû û deng bi kontrol bixebitîne.",
        href: "/video-clone",
      },
      {
        title: "Lêkolîna kûr",
        text: "Live web û project agent bike çavkaniya hilberînê.",
        href: "/chat",
      },
    ],
    studioTitle: "Pêşangeha hilberîna zindî",
    studioDescription: "Rûpela sereke êdî hesta naveroka ku platform dikare çêbike nîşan dide.",
    studioItems: [
      { title: "Video loop a kurt", text: "Pêşdîtina storyboard, kamera û rîtimê." },
      { title: "Dîmena avatarê", text: "Vebijêrkên karakterê robotê zarok û mezin." },
      { title: "Pêla muzîkê", text: "Herikîna vokal, ziman û tempo." },
    ],
    apiTitle: "Duble-S Motion API",
    apiButton: "Plan û gihîştina API veke",
  },
};

const HOME_ANIMATION_CSS = `
@keyframes home-pan {
  0% { transform: translate3d(-2%, 0, 0) scale(1.03); }
  50% { transform: translate3d(2%, -1%, 0) scale(1.06); }
  100% { transform: translate3d(-2%, 0, 0) scale(1.03); }
}
@keyframes home-pulse-line {
  0%, 100% { transform: scaleY(0.55); opacity: 0.55; }
  50% { transform: scaleY(1); opacity: 1; }
}
@keyframes home-progress {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
@keyframes home-float-soft {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
}
@keyframes showcase-rain {
  0% { transform: translate3d(-12px, -42px, 0); opacity: 0; }
  25% { opacity: 0.72; }
  100% { transform: translate3d(42px, 132px, 0); opacity: 0; }
}
@keyframes showcase-train {
  0% { transform: translateX(-120%); }
  100% { transform: translateX(120%); }
}
@keyframes showcase-float {
  0%, 100% { transform: translateY(0) rotate(-1deg); }
  50% { transform: translateY(-12px) rotate(1deg); }
}
@keyframes showcase-drift {
  0% { transform: translateX(-16%); }
  100% { transform: translateX(16%); }
}
@keyframes showcase-star {
  0% { transform: translate3d(-60px, -38px, 0) rotate(-22deg); opacity: 0; }
  18% { opacity: 1; }
  100% { transform: translate3d(240px, 96px, 0) rotate(-22deg); opacity: 0; }
}
.showcase-template-card:hover .showcase-scene-layer,
.showcase-hero-card:hover .showcase-scene-layer {
  transform: scale(1.055);
}
.community-template-card:hover .community-template-image {
  transform: scale(1.055);
}
.showcase-template-card:hover .showcase-playline span,
.showcase-hero-card:hover .showcase-playline span {
  animation-duration: 1.4s;
}
`;

type ShowcaseVideoTemplate = {
  id: string;
  title: string;
  useCase: string;
  durationSec: number;
  prompt: string;
  motion: string;
  camera: string;
  mood: string;
  style: "cinematic" | "anime" | "realistic";
  ratio: "16:9" | "9:16" | "1:1";
  scene: "neon" | "train" | "island" | "ocean" | "rainy" | "cherry" | "space";
};

type PublicShowcaseTemplate = {
  id: string;
  generationId: string;
  type: "image" | "text_video" | "image_video";
  title: string;
  prompt: string;
  mediaUrl: string;
  thumbnailUrl: string | null;
  durationSec: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

const VIDEO_SHOWCASE_TEMPLATES: ShowcaseVideoTemplate[] = [
  {
    id: "neon-city-alone",
    title: "Neon City Alone",
    useCase: "Hero banner / giriş ekranı",
    durationSec: 8,
    prompt:
      "cinematic anime scene, lonely boy sitting on rooftop, rainy cyberpunk city, neon lights reflecting on wet streets, dramatic clouds, soft wind, ultra realistic anime style, depth of field, 4k, slow camera zoom in",
    motion: "slow zoom",
    camera: "cinematic",
    mood: "melancholic",
    style: "anime",
    ratio: "16:9",
    scene: "neon",
  },
  {
    id: "sunset-train",
    title: "Sunset Train",
    useCase: "Landing page geçiş animasyonu",
    durationSec: 6,
    prompt:
      "anime cinematic sunset, train passing by slowly, glowing sky, warm light, character standing on platform, wind blowing hair, ultra detailed, soft motion, film grain",
    motion: "soft motion",
    camera: "side tracking",
    mood: "warm",
    style: "anime",
    ratio: "16:9",
    scene: "train",
  },
  {
    id: "fantasy-floating-island",
    title: "Fantasy Floating Island",
    useCase: "Showcase AI gücü",
    durationSec: 10,
    prompt:
      "floating island in the sky, waterfalls falling into clouds, fantasy anime cinematic, birds flying, epic lighting, volumetric clouds, ultra realistic anime, 4k, slow cinematic camera pan",
    motion: "slow pan",
    camera: "cinematic",
    mood: "epic",
    style: "anime",
    ratio: "16:9",
    scene: "island",
  },
  {
    id: "ocean-giant",
    title: "Ocean Giant",
    useCase: "Etkileyici demo",
    durationSec: 8,
    prompt:
      "giant whale underwater, sunlight rays through ocean, cinematic anime realism, slow motion swimming, particles in water, deep blue atmosphere, ultra detailed, calm cinematic",
    motion: "slow motion",
    camera: "underwater glide",
    mood: "calm",
    style: "anime",
    ratio: "16:9",
    scene: "ocean",
  },
  {
    id: "rainy-street-walk",
    title: "Rainy Street Walk",
    useCase: "UI arka plan",
    durationSec: 6,
    prompt:
      "anime character walking in rainy street at night, reflections on ground, cinematic lighting, slow motion rain, emotional atmosphere, ultra realistic anime style",
    motion: "walking loop",
    camera: "slow follow",
    mood: "emotional",
    style: "anime",
    ratio: "16:9",
    scene: "rainy",
  },
  {
    id: "cherry-blossom-dream",
    title: "Cherry Blossom Dream",
    useCase: "Soft aesthetic section",
    durationSec: 6,
    prompt:
      "cherry blossom petals flying in the air, soft wind, anime cinematic scene, dreamy atmosphere, pastel colors, ultra detailed, slow motion",
    motion: "slow petals",
    camera: "soft drift",
    mood: "dreamy",
    style: "anime",
    ratio: "16:9",
    scene: "cherry",
  },
  {
    id: "space-sky-falling-star",
    title: "Space Sky Falling Star",
    useCase: "Viral içerik",
    durationSec: 6,
    prompt:
      "anime night sky with shooting star, character watching from hill, galaxy clouds, cinematic lighting, emotional, ultra realistic anime",
    motion: "shooting star",
    camera: "wide cinematic",
    mood: "emotional",
    style: "anime",
    ratio: "16:9",
    scene: "space",
  },
];

const SHOWCASE_COPY: Record<
  AppLanguage,
  {
    title: string;
    description: string;
    heroBadge: string;
    generate: string;
    remix: string;
    editPrompt: string;
    regenerate: string;
    save: string;
    saved: string;
    communityTitle: string;
    communityDescription: string;
    duration: string;
    motion: string;
    mood: string;
    prompt: string;
  }
> = {
  tr: {
    title: "Sinematik AI video vitrini",
    description:
      "Hazır promptlar doğrudan video stüdyosuna taşınır. Kullanıcı ister promptu düzenler, ister aynı şablonu yeniden üretir.",
    heroBadge: "Hero video",
    generate: "Generate",
    remix: "Remix",
    editPrompt: "Edit Prompt",
    regenerate: "Re-generate",
    save: "Save to library",
    saved: "Kaydedildi",
    communityTitle: "Kullanıcı üretimlerinden gelen yeni şablonlar",
    communityDescription:
      "Platformda üretilen görsel ve videolar otomatik olarak anonim şablon havuzuna eklenir.",
    duration: "Süre",
    motion: "Motion",
    mood: "Mood",
    prompt: "Prompt",
  },
  en: {
    title: "Cinematic AI video showcase",
    description:
      "Ready prompts open directly in the video studio. Users can edit, remix, regenerate, or save each template.",
    heroBadge: "Hero video",
    generate: "Generate",
    remix: "Remix",
    editPrompt: "Edit Prompt",
    regenerate: "Re-generate",
    save: "Save to library",
    saved: "Saved",
    communityTitle: "New templates from user generations",
    communityDescription:
      "Images and videos generated on the platform are added to the anonymous template pool automatically.",
    duration: "Duration",
    motion: "Motion",
    mood: "Mood",
    prompt: "Prompt",
  },
  de: {
    title: "Cinematic AI Video-Vitrine",
    description:
      "Fertige Prompts öffnen direkt das Videostudio. Nutzer können bearbeiten, remixen, neu generieren oder speichern.",
    heroBadge: "Hero-Video",
    generate: "Generate",
    remix: "Remix",
    editPrompt: "Prompt bearbeiten",
    regenerate: "Neu generieren",
    save: "In Library speichern",
    saved: "Gespeichert",
    communityTitle: "Neue Vorlagen aus Nutzer-Generierungen",
    communityDescription:
      "Auf der Plattform erzeugte Bilder und Videos werden automatisch anonym in den Vorlagenpool aufgenommen.",
    duration: "Dauer",
    motion: "Motion",
    mood: "Mood",
    prompt: "Prompt",
  },
  ku: {
    title: "Pêşangeha vîdyoya AI ya cinematic",
    description:
      "Promptên amade rasterast stûdyoya vîdyoyê vedikin. Bikarhêner dikare biguherîne, remix bike, ji nû ve çêke an tomar bike.",
    heroBadge: "Hero video",
    generate: "Generate",
    remix: "Remix",
    editPrompt: "Prompt biguherîne",
    regenerate: "Ji nû ve çêke",
    save: "Li library tomar bike",
    saved: "Hat tomarkirin",
    communityTitle: "Şablonên nû ji hilberînên bikarhêneran",
    communityDescription:
      "Wêne û vîdyoyên li platformê hatine çêkirin bixweber û bê nav li hewza şablonan zêde dibin.",
    duration: "Dem",
    motion: "Motion",
    mood: "Mood",
    prompt: "Prompt",
  },
};

function buildVideoTemplateHref(template: ShowcaseVideoTemplate, action: string) {
  const params = new URLSearchParams({
    source: "showcase",
    template: template.id,
    action,
    title: template.title,
    prompt: template.prompt,
    style: template.style,
    ratio: template.ratio,
    durationSec: String(template.durationSec),
  });

  return `/text-to-video?${params.toString()}`;
}

function getStringMetadata(
  metadata: Record<string, unknown>,
  key: string,
  fallback: string
) {
  const value = metadata[key];
  return typeof value === "string" && value ? value : fallback;
}

function buildCommunityTemplateHref(
  template: PublicShowcaseTemplate,
  action: string
) {
  const path =
    template.type === "image"
      ? "/text-to-image"
      : template.type === "image_video"
      ? "/image-to-video"
      : "/text-to-video";
  const params = new URLSearchParams({
    source: "community_showcase",
    template: template.id,
    generationId: template.generationId,
    action,
    title: template.title,
    prompt: template.prompt || template.title,
    style: getStringMetadata(
      template.metadata,
      "style",
      template.type === "image_video" ? "realistic" : "cinematic"
    ),
    ratio: getStringMetadata(
      template.metadata,
      "ratio",
      template.type === "image" ? "1:1" : "16:9"
    ),
  });
  const sourceImageUrl = getStringMetadata(
    template.metadata,
    "sourceImageUrl",
    template.thumbnailUrl || ""
  );

  if (template.type !== "image" && template.durationSec) {
    params.set("durationSec", String(template.durationSec));
  }

  if (template.type === "image_video" && sourceImageUrl) {
    params.set("imageUrl", sourceImageUrl);
  }

  return `${path}?${params.toString()}`;
}

function renderShowcaseScene(template: ShowcaseVideoTemplate, large = false) {
  const sceneContent = {
    neon: (
      <>
        <span style={styles.sceneMoon} />
        <span style={styles.sceneRooftop} />
        <span style={styles.sceneNeonCity} />
        <span style={styles.sceneRain} />
        <span style={styles.sceneCharacter} />
      </>
    ),
    train: (
      <>
        <span style={styles.sceneSun} />
        <span style={styles.scenePlatform} />
        <span style={styles.sceneTrain} />
        <span style={styles.sceneStandingCharacter} />
      </>
    ),
    island: (
      <>
        <span style={styles.sceneClouds} />
        <span style={styles.sceneIsland} />
        <span style={styles.sceneWaterfall} />
        <span style={styles.sceneBirds} />
      </>
    ),
    ocean: (
      <>
        <span style={styles.sceneLightRays} />
        <span style={styles.sceneWhale} />
        <span style={styles.sceneParticles} />
      </>
    ),
    rainy: (
      <>
        <span style={styles.sceneStreetLights} />
        <span style={styles.sceneReflection} />
        <span style={styles.sceneRain} />
        <span style={styles.sceneWalkingCharacter} />
      </>
    ),
    cherry: (
      <>
        <span style={styles.scenePastelSky} />
        <span style={styles.sceneBranch} />
        <span style={styles.scenePetals} />
      </>
    ),
    space: (
      <>
        <span style={styles.sceneGalaxy} />
        <span style={styles.sceneHill} />
        <span style={styles.sceneWatcher} />
        <span style={styles.sceneShootingStar} />
      </>
    ),
  }[template.scene];

  return (
    <span
      className="showcase-scene-layer"
      style={{
        ...styles.showcaseScene,
        ...(styles[`showcaseScene_${template.scene}`] || null),
        ...(large ? styles.showcaseSceneLarge : null),
      }}
    >
      {sceneContent}
      <span style={styles.showcaseSceneShade} />
      <span style={styles.showcasePlayline} className="showcase-playline">
        <span style={styles.showcasePlaylineFill} />
      </span>
    </span>
  );
}

export default function HomePageClient() {
  const { language, setLanguage, availableLanguages } = useLanguage();
  const isMobile = useIsMobile(860);
  const safeLanguage = getSafeLanguage(language);
  const t = HOME_COPY[safeLanguage];
  const showcase = SHOWCASE_COPY[safeLanguage];
  const [savedTemplateId, setSavedTemplateId] = useState<string | null>(null);
  const [communityTemplates, setCommunityTemplates] = useState<
    PublicShowcaseTemplate[]
  >([]);
  const heroTemplate = VIDEO_SHOWCASE_TEMPLATES[0];
  const loopTemplates = VIDEO_SHOWCASE_TEMPLATES.slice(1);

  useEffect(() => {
    let cancelled = false;

    async function loadCommunityTemplates() {
      try {
        const res = await fetch("/api/showcase/templates?limit=12", {
          cache: "no-store",
        });
        const data = (await res.json().catch(() => null)) as
          | { ok?: boolean; items?: PublicShowcaseTemplate[] }
          | null;

        if (!cancelled && res.ok && data?.ok && Array.isArray(data.items)) {
          setCommunityTemplates(data.items);
        }
      } catch {
        if (!cancelled) setCommunityTemplates([]);
      }
    }

    void loadCommunityTemplates();

    return () => {
      cancelled = true;
    };
  }, []);

  function saveTemplate(template: ShowcaseVideoTemplate | PublicShowcaseTemplate) {
    if (typeof window === "undefined") return;

    try {
      const storageKey = "dubles_showcase_video_templates_v1";
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      const current = Array.isArray(parsed)
        ? (parsed as Array<ShowcaseVideoTemplate | PublicShowcaseTemplate>)
        : [];
      const next = [
        template,
        ...current.filter((item) => item.id !== template.id),
      ].slice(0, 24);

      window.localStorage.setItem(storageKey, JSON.stringify(next));
      setSavedTemplateId(template.id);
    } catch {
      setSavedTemplateId(null);
    }
  }

  return (
    <main style={styles.page}>
      <style>{HOME_ANIMATION_CSS}</style>

      <header style={styles.header}>
        <Link href="/" style={styles.brandLink}>
          <Image
            src="/dubles-logo.png"
            alt="Duble-S Motion AI"
            width={38}
            height={38}
            style={styles.logo}
            priority
          />
          <span>
            <span style={styles.brand}>Duble-S Motion AI</span>
            <span style={styles.subBrand}>{t.subBrand}</span>
          </span>
        </Link>

        <nav
          style={{
            ...styles.nav,
            ...(isMobile ? styles.navMobile : null),
          }}
          aria-label="Homepage navigation"
        >
          <Link href="/product" style={styles.navLink}>
            {t.nav.product}
          </Link>
          <Link href="/studio" style={styles.navLink}>
            {t.nav.studio}
          </Link>
          <Link href="/developers" style={styles.navLink}>
            {t.nav.api}
          </Link>
          <Link href="/billing" style={styles.navLink}>
            {t.nav.pricing}
          </Link>
        </nav>

        <div style={styles.headerActions}>
          <label style={styles.languagePicker}>
            <Image
              src={LANGUAGE_FLAGS[safeLanguage]}
              alt={LANGUAGE_LABELS[safeLanguage]}
              width={18}
              height={18}
              style={styles.flag}
            />
            <select
              value={safeLanguage}
              onChange={(event) => setLanguage(event.target.value as AppLanguage)}
              style={styles.languageSelect}
              aria-label="Language"
            >
              {availableLanguages.map((item) => (
                <option key={item} value={item}>
                  {LANGUAGE_LABELS[item]}
                </option>
              ))}
            </select>
          </label>

          <Link href="/login" style={styles.loginButton}>
            {t.nav.login}
          </Link>
          {!isMobile ? (
            <Link href="/register" style={styles.registerButton}>
              {t.nav.register}
            </Link>
          ) : null}
        </div>
      </header>

      <section
        id="product"
        style={{
          ...styles.hero,
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 0.95fr) minmax(360px, 0.9fr)",
        }}
      >
        <div style={styles.heroContent}>
          <div style={styles.eyebrow}>{t.eyebrow}</div>
          <h1
            style={{
              ...styles.title,
              ...(isMobile ? styles.titleMobile : null),
            }}
          >
            {t.title}
          </h1>
          <p
            style={{
              ...styles.description,
              ...(isMobile ? styles.descriptionMobile : null),
            }}
          >
            {t.description}
          </p>

          <div style={styles.actions}>
            <Link href="/chat" style={styles.primaryButton}>
              {t.primaryCta}
            </Link>
            <Link href="/text-to-video" style={styles.secondaryButton}>
              {t.secondaryCta}
            </Link>
            <Link href="/developers" style={styles.textButton}>
              {t.apiCta}
            </Link>
          </div>

          <div
            style={{
              ...styles.statsRow,
              ...(isMobile ? styles.statsRowMobile : null),
            }}
          >
            {t.stats.map((item) => (
              <div key={item.label} style={styles.statItem}>
                <span style={styles.statValue}>{item.value}</span>
                <span style={styles.statLabel}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            ...styles.heroVisualLayer,
            ...(isMobile ? styles.heroVisualLayerMobile : null),
          }}
          aria-hidden="true"
        >
          <div style={{ ...styles.heroMediaTile, ...styles.heroMediaTileLarge }}>
            <Image
              src="/voice-avatars/child-robot-avatar-approved.png"
              alt=""
              fill
              sizes="(max-width: 860px) 280px, 420px"
              style={styles.mediaImage}
              priority
            />
            <span style={styles.mediaBadge}>{t.visualLabels.avatar}</span>
          </div>

          <div style={{ ...styles.heroMediaTile, ...styles.heroMediaTileAdult }}>
            <Image
              src="/voice-avatars/adult-robot-avatar-approved.png"
              alt=""
              fill
              sizes="(max-width: 860px) 180px, 260px"
              style={styles.mediaImage}
            />
          </div>

          {!isMobile ? (
            <>
              <div style={{ ...styles.videoLoopCard, ...styles.videoLoopCardOne }}>
                <span style={styles.mediaBadge}>{t.visualLabels.video}</span>
                <span style={styles.playDot} />
                <span style={styles.videoTrack}>
                  <span style={styles.videoTrackFill} />
                </span>
              </div>

              <div style={{ ...styles.waveCard, ...styles.waveCardOne }}>
                <span style={styles.mediaBadge}>{t.visualLabels.music}</span>
                <span style={styles.waveBars}>
                  {Array.from({ length: 12 }).map((_, index) => (
                    <span
                      key={index}
                      style={{
                        ...styles.waveBar,
                        animationDelay: `${index * 90}ms`,
                      }}
                    />
                  ))}
                </span>
              </div>
            </>
          ) : null}
        </div>
      </section>

      <section id="vitrine" style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>{showcase.title}</h2>
          <p style={styles.sectionText}>{showcase.description}</p>
        </div>

        <article
          className="showcase-hero-card"
          style={{
            ...styles.showcaseHeroCard,
            gridTemplateColumns: isMobile ? "1fr" : "1.15fr 0.85fr",
          }}
        >
          <Link
            href={buildVideoTemplateHref(heroTemplate, "generate")}
            style={styles.showcaseHeroMedia}
          >
            {renderShowcaseScene(heroTemplate, true)}
            <span style={styles.showcaseHeroBadge}>{showcase.heroBadge}</span>
          </Link>

          <div style={styles.showcaseHeroBody}>
            <div style={styles.showcaseKicker}>{heroTemplate.useCase}</div>
            <h3 style={styles.showcaseHeroTitle}>{heroTemplate.title}</h3>

            <div style={styles.showcaseMetaGrid}>
              <span style={styles.showcaseMetaItem}>
                {showcase.duration}: {heroTemplate.durationSec}s
              </span>
              <span style={styles.showcaseMetaItem}>
                {showcase.motion}: {heroTemplate.motion}
              </span>
              <span style={styles.showcaseMetaItem}>
                {showcase.mood}: {heroTemplate.mood}
              </span>
            </div>

            <p style={styles.showcasePrompt}>
              <span>{showcase.prompt}</span>
              {heroTemplate.prompt}
            </p>

            <div style={styles.showcaseActionRow}>
              <Link
                href={buildVideoTemplateHref(heroTemplate, "generate")}
                style={styles.showcasePrimaryAction}
              >
                {showcase.generate}
              </Link>
              <Link
                href={buildVideoTemplateHref(heroTemplate, "remix")}
                style={styles.showcaseGhostAction}
              >
                {showcase.remix}
              </Link>
              <Link
                href={buildVideoTemplateHref(heroTemplate, "edit")}
                style={styles.showcaseGhostAction}
              >
                {showcase.editPrompt}
              </Link>
              <button
                type="button"
                onClick={() => saveTemplate(heroTemplate)}
                style={styles.showcaseGhostButton}
              >
                {savedTemplateId === heroTemplate.id ? showcase.saved : showcase.save}
              </button>
            </div>
          </div>
        </article>

        <div
          style={{
            ...styles.videoTemplateGrid,
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
          }}
        >
          {loopTemplates.map((template) => (
            <article
              key={template.id}
              className="showcase-template-card"
              style={styles.videoTemplateCard}
            >
              <Link
                href={buildVideoTemplateHref(template, "generate")}
                style={styles.videoTemplateMedia}
              >
                {renderShowcaseScene(template)}
              </Link>

              <div style={styles.videoTemplateBody}>
                <div style={styles.showcaseKicker}>{template.useCase}</div>
                <h3 style={styles.videoTemplateTitle}>{template.title}</h3>
                <div style={styles.videoTemplateMeta}>
                  <span>{template.durationSec}s</span>
                  <span>{template.motion}</span>
                  <span>{template.mood}</span>
                </div>

                <div style={styles.videoTemplateActions}>
                  <Link
                    href={buildVideoTemplateHref(template, "remix")}
                    style={styles.videoTemplateAction}
                  >
                    {showcase.remix}
                  </Link>
                  <Link
                    href={buildVideoTemplateHref(template, "edit")}
                    style={styles.videoTemplateAction}
                  >
                    {showcase.editPrompt}
                  </Link>
                  <Link
                    href={buildVideoTemplateHref(template, "regenerate")}
                    style={styles.videoTemplateAction}
                  >
                    {showcase.regenerate}
                  </Link>
                  <button
                    type="button"
                    onClick={() => saveTemplate(template)}
                    style={styles.videoTemplateButton}
                  >
                    {savedTemplateId === template.id ? showcase.saved : showcase.save}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {communityTemplates.length > 0 ? (
          <div style={styles.communityBand}>
            <div style={styles.communityHeader}>
              <h3 style={styles.communityTitle}>{showcase.communityTitle}</h3>
              <p style={styles.communityText}>{showcase.communityDescription}</p>
            </div>

            <div
              style={{
                ...styles.communityGrid,
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(4, minmax(0, 1fr))",
              }}
            >
              {communityTemplates.map((template) => {
                const isImage = template.type === "image";
                const thumbnailUrl = template.thumbnailUrl || template.mediaUrl;

                return (
                  <article
                    key={template.id}
                    className="community-template-card"
                    style={styles.communityCard}
                  >
                    <Link
                      href={buildCommunityTemplateHref(template, "remix")}
                      style={styles.communityMedia}
                    >
                      {isImage ? (
                        <span
                          className="community-template-image"
                          style={{
                            ...styles.communityImage,
                            backgroundImage: `url(${thumbnailUrl})`,
                          }}
                        />
                      ) : (
                        <video
                          src={template.mediaUrl}
                          poster={template.thumbnailUrl || undefined}
                          muted
                          playsInline
                          loop
                          autoPlay
                          preload="metadata"
                          style={styles.communityVideo}
                        />
                      )}
                    </Link>

                    <div style={styles.communityBody}>
                      <div style={styles.showcaseKicker}>
                        {isImage ? t.visualLabels.image : t.visualLabels.video}
                      </div>
                      <h3 style={styles.videoTemplateTitle}>{template.title}</h3>
                      <p style={styles.communityPrompt}>
                        {template.prompt || template.title}
                      </p>

                      <div style={styles.videoTemplateActions}>
                        <Link
                          href={buildCommunityTemplateHref(template, "remix")}
                          style={styles.videoTemplateAction}
                        >
                          {showcase.remix}
                        </Link>
                        <Link
                          href={buildCommunityTemplateHref(template, "edit")}
                          style={styles.videoTemplateAction}
                        >
                          {showcase.editPrompt}
                        </Link>
                        <button
                          type="button"
                          onClick={() => saveTemplate(template)}
                          style={styles.videoTemplateButton}
                        >
                          {savedTemplateId === template.id
                            ? showcase.saved
                            : showcase.save}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>{t.toolsTitle}</h2>
          <p style={styles.sectionText}>{t.toolsDescription}</p>
        </div>

        <div
          style={{
            ...styles.toolGrid,
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
          }}
        >
          {t.tools.map((tool) => (
            <Link key={tool.title} href={tool.href} style={styles.toolCard}>
              <span style={styles.toolKicker}>{t.visualLabels.live}</span>
              <span style={styles.toolTitle}>{tool.title}</span>
              <span style={styles.toolText}>{tool.text}</span>
            </Link>
          ))}
        </div>
      </section>

      <section
        id="api"
        style={{
          ...styles.apiSection,
          gridTemplateColumns: isMobile ? "1fr" : "1fr 0.9fr",
        }}
      >
        <div>
          <div style={styles.eyebrow}>{t.nav.api}</div>
          <h2 style={styles.sectionTitle}>{t.apiTitle}</h2>
          <Link href="/developers" style={styles.primaryButton}>
            {t.apiButton}
          </Link>
        </div>

        <div style={styles.codePanel} aria-label="API preview">
          <div style={styles.codeHeader}>
            <span style={styles.codeDot} />
            <span style={styles.codeDot} />
            <span style={styles.codeDot} />
          </div>
          <pre style={styles.codeBlock}>
            {`POST /api/v1/generate
Authorization: Bearer dms_live_...

{
  "mode": "text_to_video",
  "prompt": "cinematic product reveal",
  "ratio": "16:9",
  "durationSec": 8
}`}
          </pre>
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100dvh",
    background: "#f7f9fc",
    color: "#111827",
    padding: "18px 18px 56px",
  },
  header: {
    width: "min(1180px, 100%)",
    minHeight: 64,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
  },
  brandLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    color: "#111827",
    minWidth: 210,
  },
  logo: {
    borderRadius: 8,
    boxShadow: "0 10px 24px rgba(17,24,39,0.12)",
    flexShrink: 0,
  },
  brand: {
    display: "block",
    fontSize: 16,
    lineHeight: 1.1,
    fontWeight: 700,
    letterSpacing: 0,
  },
  subBrand: {
    display: "block",
    marginTop: 2,
    color: "#607083",
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: 0,
  },
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    flex: 1,
  },
  navMobile: {
    order: 3,
    width: "100%",
    overflowX: "auto",
    justifyContent: "flex-start",
    paddingBottom: 4,
  },
  navLink: {
    minHeight: 36,
    padding: "0 12px",
    borderRadius: 8,
    color: "#374151",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 500,
    whiteSpace: "nowrap",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  languagePicker: {
    minHeight: 38,
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    border: "1px solid #d9e2ec",
    borderRadius: 8,
    background: "#ffffff",
    padding: "0 8px",
  },
  flag: {
    borderRadius: 999,
    flexShrink: 0,
  },
  languageSelect: {
    border: 0,
    outline: "none",
    background: "transparent",
    color: "#111827",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  loginButton: {
    minHeight: 38,
    padding: "0 12px",
    borderRadius: 8,
    border: "1px solid #d9e2ec",
    background: "#ffffff",
    color: "#111827",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 600,
  },
  registerButton: {
    minHeight: 38,
    padding: "0 13px",
    borderRadius: 8,
    background: "#111827",
    color: "#ffffff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 600,
  },
  hero: {
    width: "min(1180px, 100%)",
    margin: "22px auto 0",
    position: "relative",
    overflow: "hidden",
    borderRadius: 8,
    border: "1px solid #dce5ee",
    background: "#edf3f8",
    display: "grid",
    gap: 18,
    alignItems: "center",
    padding: 24,
  },
  heroVisualLayer: {
    position: "relative",
    minHeight: 520,
    overflow: "hidden",
    borderRadius: 8,
  },
  heroVisualLayerMobile: {
    minHeight: 360,
  },
  heroMediaTile: {
    position: "absolute",
    borderRadius: 8,
    overflow: "hidden",
    border: "1px solid rgba(17,24,39,0.16)",
    boxShadow: "0 18px 44px rgba(17,24,39,0.18)",
    background: "#d7e5ee",
    animation: "home-float-soft 5s ease-in-out infinite",
  },
  heroMediaTileLarge: {
    right: "7%",
    top: "4%",
    width: "min(360px, 78%)",
    height: 410,
  },
  heroMediaTileAdult: {
    left: "4%",
    bottom: "5%",
    width: 210,
    height: 250,
    animationDelay: "900ms",
  },
  mediaImage: {
    objectFit: "cover",
    animation: "home-pan 9s ease-in-out infinite",
  },
  mediaBadge: {
    position: "absolute",
    left: 10,
    top: 10,
    borderRadius: 8,
    background: "rgba(255,255,255,0.88)",
    color: "#111827",
    padding: "6px 9px",
    fontSize: 11,
    lineHeight: 1,
    fontWeight: 600,
  },
  videoLoopCard: {
    position: "absolute",
    width: 240,
    height: 150,
    borderRadius: 8,
    border: "1px solid rgba(17,24,39,0.15)",
    background: "#111827",
    overflow: "hidden",
    boxShadow: "0 18px 42px rgba(17,24,39,0.16)",
  },
  videoLoopCardOne: {
    right: "0",
    bottom: "8%",
  },
  playDot: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 48,
    height: 48,
    transform: "translate(-50%, -50%)",
    borderRadius: 999,
    background: "#ffffff",
  },
  videoTrack: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    height: 5,
    borderRadius: 999,
    background: "rgba(255,255,255,0.22)",
    overflow: "hidden",
  },
  videoTrackFill: {
    display: "block",
    width: "55%",
    height: "100%",
    borderRadius: 999,
    background: "#22c55e",
    animation: "home-progress 2.8s linear infinite",
  },
  waveCard: {
    position: "absolute",
    width: 230,
    height: 135,
    borderRadius: 8,
    border: "1px solid rgba(17,24,39,0.14)",
    background: "#ffffff",
    boxShadow: "0 18px 42px rgba(17,24,39,0.14)",
    overflow: "hidden",
  },
  waveCardOne: {
    left: "0",
    top: "12%",
  },
  waveBars: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 20,
    height: 52,
    display: "flex",
    alignItems: "center",
    gap: 7,
  },
  waveBar: {
    width: 9,
    height: 42,
    borderRadius: 999,
    background: "#ef4444",
    transformOrigin: "center",
    animation: "home-pulse-line 900ms ease-in-out infinite",
  },
  heroContent: {
    position: "relative",
    zIndex: 2,
    width: "100%",
    padding: "34px 0",
  },
  eyebrow: {
    display: "inline-flex",
    minHeight: 30,
    alignItems: "center",
    borderRadius: 8,
    background: "#ffffff",
    border: "1px solid #d9e2ec",
    padding: "0 10px",
    color: "#166534",
    fontSize: 12,
    fontWeight: 600,
  },
  title: {
    margin: "18px 0 0",
    color: "#111827",
    fontSize: 52,
    lineHeight: 1.02,
    letterSpacing: 0,
    fontWeight: 700,
    maxWidth: 680,
  },
  titleMobile: {
    fontSize: 36,
    lineHeight: 1.08,
  },
  description: {
    margin: "18px 0 0",
    maxWidth: 590,
    color: "#374151",
    fontSize: 18,
    lineHeight: 1.65,
    fontWeight: 400,
  },
  descriptionMobile: {
    fontSize: 15,
    lineHeight: 1.55,
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 28,
  },
  primaryButton: {
    minHeight: 44,
    padding: "0 16px",
    borderRadius: 8,
    background: "#111827",
    color: "#ffffff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 600,
  },
  secondaryButton: {
    minHeight: 44,
    padding: "0 16px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#111827",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 500,
  },
  textButton: {
    minHeight: 44,
    padding: "0 10px",
    borderRadius: 8,
    color: "#166534",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 500,
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
    marginTop: 34,
    maxWidth: 570,
  },
  statsRowMobile: {
    gridTemplateColumns: "1fr",
  },
  statItem: {
    borderRadius: 8,
    background: "rgba(255,255,255,0.88)",
    border: "1px solid #dce5ee",
    padding: 12,
  },
  statValue: {
    display: "block",
    fontSize: 22,
    lineHeight: 1,
    fontWeight: 700,
    color: "#111827",
  },
  statLabel: {
    display: "block",
    marginTop: 5,
    color: "#607083",
    fontSize: 12,
    lineHeight: 1.35,
    fontWeight: 500,
  },
  section: {
    width: "min(1180px, 100%)",
    margin: "42px auto 0",
    scrollMarginTop: 90,
  },
  sectionHeader: {
    maxWidth: 760,
    marginBottom: 18,
  },
  sectionTitle: {
    margin: "0 0 10px",
    color: "#111827",
    fontSize: 34,
    lineHeight: 1.12,
    letterSpacing: 0,
    fontWeight: 700,
  },
  sectionText: {
    margin: 0,
    color: "#4b5563",
    fontSize: 16,
    lineHeight: 1.7,
    fontWeight: 400,
  },
  showcaseHeroCard: {
    display: "grid",
    gap: 18,
    borderRadius: 8,
    border: "1px solid #dce5ee",
    background: "#ffffff",
    padding: 14,
    boxShadow: "0 16px 38px rgba(17,24,39,0.06)",
  },
  showcaseHeroMedia: {
    position: "relative",
    minHeight: 390,
    borderRadius: 8,
    overflow: "hidden",
    background: "#111827",
    display: "block",
  },
  showcaseHeroBadge: {
    position: "absolute",
    left: 14,
    top: 14,
    zIndex: 5,
    borderRadius: 8,
    background: "rgba(255,255,255,0.9)",
    color: "#111827",
    padding: "7px 10px",
    fontSize: 12,
    fontWeight: 600,
  },
  showcaseHeroBody: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 14,
    padding: "8px 8px 8px 0",
  },
  showcaseKicker: {
    color: "#166534",
    fontSize: 12,
    lineHeight: 1.4,
    fontWeight: 600,
  },
  showcaseHeroTitle: {
    margin: 0,
    color: "#111827",
    fontSize: 34,
    lineHeight: 1.08,
    fontWeight: 700,
  },
  showcaseMetaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: 8,
  },
  showcaseMetaItem: {
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    padding: "9px 10px",
    color: "#334155",
    fontSize: 12,
    lineHeight: 1.4,
  },
  showcasePrompt: {
    margin: 0,
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    padding: 12,
    color: "#4b5563",
    fontSize: 13,
    lineHeight: 1.6,
  },
  showcaseActionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  showcasePrimaryAction: {
    minHeight: 38,
    padding: "0 13px",
    borderRadius: 8,
    background: "#111827",
    color: "#ffffff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 600,
  },
  showcaseGhostAction: {
    minHeight: 38,
    padding: "0 12px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#111827",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 500,
  },
  showcaseGhostButton: {
    appearance: "none",
    minHeight: 38,
    padding: "0 12px",
    borderRadius: 8,
    border: "1px solid #bbf7d0",
    background: "#f0fdf4",
    color: "#166534",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  videoTemplateGrid: {
    display: "grid",
    gap: 14,
    marginTop: 14,
  },
  videoTemplateCard: {
    borderRadius: 8,
    border: "1px solid #dce5ee",
    background: "#ffffff",
    overflow: "hidden",
    boxShadow: "0 16px 38px rgba(17,24,39,0.06)",
  },
  videoTemplateMedia: {
    position: "relative",
    height: 190,
    display: "block",
    overflow: "hidden",
    background: "#111827",
  },
  videoTemplateBody: {
    padding: 14,
    display: "grid",
    gap: 9,
  },
  videoTemplateTitle: {
    margin: 0,
    color: "#111827",
    fontSize: 18,
    lineHeight: 1.25,
    fontWeight: 600,
  },
  videoTemplateMeta: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    color: "#475569",
    fontSize: 12,
    lineHeight: 1.4,
  },
  videoTemplateActions: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
    marginTop: 4,
  },
  videoTemplateAction: {
    minHeight: 34,
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    color: "#111827",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    fontSize: 12,
    fontWeight: 500,
  },
  videoTemplateButton: {
    appearance: "none",
    minHeight: 34,
    borderRadius: 8,
    border: "1px solid #bbf7d0",
    background: "#f0fdf4",
    color: "#166534",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  communityBand: {
    marginTop: 20,
    borderRadius: 8,
    border: "1px solid #dce5ee",
    background: "#ffffff",
    padding: 16,
    boxShadow: "0 16px 38px rgba(17,24,39,0.05)",
  },
  communityHeader: {
    display: "grid",
    gap: 6,
    marginBottom: 14,
  },
  communityTitle: {
    margin: 0,
    color: "#111827",
    fontSize: 22,
    lineHeight: 1.22,
    fontWeight: 600,
  },
  communityText: {
    margin: 0,
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.65,
    maxWidth: 720,
  },
  communityGrid: {
    display: "grid",
    gap: 12,
  },
  communityCard: {
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    overflow: "hidden",
  },
  communityMedia: {
    position: "relative",
    display: "block",
    width: "100%",
    aspectRatio: "16 / 10",
    overflow: "hidden",
    background: "#111827",
  },
  communityImage: {
    position: "absolute",
    inset: 0,
    display: "block",
    backgroundSize: "cover",
    backgroundPosition: "center",
    transition: "transform 220ms ease",
  },
  communityVideo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  communityBody: {
    padding: 12,
    display: "grid",
    gap: 8,
  },
  communityPrompt: {
    margin: 0,
    minHeight: 44,
    color: "#475569",
    fontSize: 12,
    lineHeight: 1.55,
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },
  showcaseScene: {
    position: "absolute",
    inset: 0,
    display: "block",
    overflow: "hidden",
    transition: "transform 220ms ease",
    transformOrigin: "center",
  },
  showcaseSceneLarge: {
    minHeight: 390,
  },
  showcaseScene_neon: {
    background:
      "linear-gradient(180deg, #0f172a 0%, #16213d 48%, #07111f 100%)",
  },
  showcaseScene_train: {
    background:
      "linear-gradient(180deg, #f97316 0%, #facc15 32%, #7c2d12 64%, #111827 100%)",
  },
  showcaseScene_island: {
    background:
      "linear-gradient(180deg, #5eead4 0%, #bae6fd 48%, #f8fafc 100%)",
  },
  showcaseScene_ocean: {
    background:
      "linear-gradient(180deg, #0ea5e9 0%, #075985 45%, #082f49 100%)",
  },
  showcaseScene_rainy: {
    background:
      "linear-gradient(180deg, #111827 0%, #1f2937 54%, #020617 100%)",
  },
  showcaseScene_cherry: {
    background:
      "linear-gradient(180deg, #fbcfe8 0%, #fecdd3 44%, #e0f2fe 100%)",
  },
  showcaseScene_space: {
    background:
      "radial-gradient(circle at 70% 20%, rgba(147,197,253,0.8), transparent 18%), linear-gradient(180deg, #0f172a 0%, #312e81 54%, #020617 100%)",
  },
  showcaseSceneShade: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(2,6,23,0.08) 0%, rgba(2,6,23,0.28) 100%)",
    pointerEvents: "none",
  },
  showcasePlayline: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 16,
    height: 5,
    borderRadius: 999,
    background: "rgba(255,255,255,0.3)",
    overflow: "hidden",
    zIndex: 4,
  },
  showcasePlaylineFill: {
    display: "block",
    width: "45%",
    height: "100%",
    borderRadius: 999,
    background: "#ffffff",
    animation: "home-progress 2.8s linear infinite",
  },
  sceneMoon: {
    position: "absolute",
    right: "16%",
    top: "13%",
    width: 42,
    height: 42,
    borderRadius: 999,
    background: "#e0f2fe",
    boxShadow: "0 0 36px rgba(125,211,252,0.7)",
  },
  sceneRooftop: {
    position: "absolute",
    left: "8%",
    right: "8%",
    bottom: "21%",
    height: "12%",
    transform: "skewX(-8deg)",
    background: "#020617",
    borderTop: "2px solid rgba(56,189,248,0.5)",
  },
  sceneNeonCity: {
    position: "absolute",
    left: "5%",
    right: "5%",
    bottom: "4%",
    height: "34%",
    background:
      "repeating-linear-gradient(90deg, rgba(34,211,238,0.65) 0 10px, rgba(15,23,42,0.7) 10px 24px, rgba(244,114,182,0.65) 24px 32px, rgba(15,23,42,0.76) 32px 54px)",
    filter: "blur(0.2px)",
    opacity: 0.9,
  },
  sceneRain: {
    position: "absolute",
    inset: "-20%",
    background:
      "repeating-linear-gradient(115deg, rgba(255,255,255,0.0) 0 12px, rgba(255,255,255,0.45) 13px 14px, rgba(255,255,255,0.0) 15px 24px)",
    animation: "showcase-rain 800ms linear infinite",
    opacity: 0.42,
  },
  sceneCharacter: {
    position: "absolute",
    left: "49%",
    bottom: "28%",
    width: 34,
    height: 58,
    transform: "translateX(-50%)",
    borderRadius: "18px 18px 8px 8px",
    background: "#0f172a",
    boxShadow: "0 0 0 5px rgba(125,211,252,0.14)",
    animation: "home-float-soft 4s ease-in-out infinite",
  },
  sceneSun: {
    position: "absolute",
    left: "62%",
    top: "18%",
    width: 70,
    height: 70,
    borderRadius: 999,
    background: "#fde68a",
    boxShadow: "0 0 46px rgba(251,191,36,0.8)",
  },
  scenePlatform: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: "18%",
    height: "18%",
    background: "#1f2937",
    borderTop: "4px solid rgba(255,255,255,0.45)",
  },
  sceneTrain: {
    position: "absolute",
    left: 0,
    bottom: "28%",
    width: "76%",
    height: "22%",
    borderRadius: "8px 18px 8px 8px",
    background:
      "repeating-linear-gradient(90deg, #111827 0 30px, #f8fafc 30px 46px, #111827 46px 70px)",
    animation: "showcase-train 4.4s linear infinite",
  },
  sceneStandingCharacter: {
    position: "absolute",
    left: "28%",
    bottom: "36%",
    width: 24,
    height: 58,
    borderRadius: "18px 18px 6px 6px",
    background: "#111827",
    boxShadow: "8px -4px 0 -4px rgba(255,255,255,0.7)",
  },
  sceneClouds: {
    position: "absolute",
    left: "-6%",
    right: "-6%",
    bottom: "12%",
    height: "30%",
    background:
      "radial-gradient(circle at 20% 60%, rgba(255,255,255,0.9), transparent 24%), radial-gradient(circle at 48% 52%, rgba(255,255,255,0.8), transparent 28%), radial-gradient(circle at 75% 64%, rgba(255,255,255,0.82), transparent 26%)",
    animation: "showcase-drift 6s ease-in-out infinite alternate",
  },
  sceneIsland: {
    position: "absolute",
    left: "32%",
    top: "22%",
    width: "36%",
    height: "24%",
    borderRadius: "50% 50% 34% 34%",
    background: "linear-gradient(180deg, #22c55e 0%, #166534 50%, #713f12 100%)",
    boxShadow: "0 24px 28px rgba(21,128,61,0.2)",
    animation: "showcase-float 4s ease-in-out infinite",
  },
  sceneWaterfall: {
    position: "absolute",
    left: "51%",
    top: "43%",
    width: 18,
    height: "35%",
    borderRadius: 999,
    background: "linear-gradient(180deg, rgba(186,230,253,0.9), rgba(255,255,255,0))",
    filter: "blur(0.5px)",
  },
  sceneBirds: {
    position: "absolute",
    right: "18%",
    top: "25%",
    width: 96,
    height: 32,
    background:
      "radial-gradient(ellipse at 15% 55%, #0f172a 0 4px, transparent 5px), radial-gradient(ellipse at 52% 28%, #0f172a 0 3px, transparent 4px), radial-gradient(ellipse at 82% 70%, #0f172a 0 4px, transparent 5px)",
    animation: "showcase-drift 5s ease-in-out infinite alternate",
  },
  sceneLightRays: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(112deg, rgba(255,255,255,0.42) 0%, transparent 16%), linear-gradient(132deg, rgba(255,255,255,0.24) 10%, transparent 32%)",
    opacity: 0.75,
  },
  sceneWhale: {
    position: "absolute",
    left: "22%",
    top: "38%",
    width: "58%",
    height: "25%",
    borderRadius: "58% 48% 46% 52%",
    background: "linear-gradient(180deg, #334155, #0f172a)",
    boxShadow: "52px 10px 0 -28px #0f172a",
    animation: "showcase-drift 5.8s ease-in-out infinite alternate",
  },
  sceneParticles: {
    position: "absolute",
    inset: "8%",
    background:
      "radial-gradient(circle at 18% 26%, rgba(255,255,255,0.7) 0 2px, transparent 3px), radial-gradient(circle at 70% 30%, rgba(255,255,255,0.5) 0 2px, transparent 3px), radial-gradient(circle at 54% 76%, rgba(255,255,255,0.6) 0 2px, transparent 3px), radial-gradient(circle at 88% 60%, rgba(255,255,255,0.5) 0 2px, transparent 3px)",
    animation: "showcase-float 5s ease-in-out infinite",
  },
  sceneStreetLights: {
    position: "absolute",
    left: "8%",
    right: "8%",
    top: "18%",
    height: "52%",
    background:
      "radial-gradient(circle at 18% 15%, rgba(253,224,71,0.8), transparent 14%), radial-gradient(circle at 74% 12%, rgba(96,165,250,0.75), transparent 15%)",
  },
  sceneReflection: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "42%",
    background:
      "linear-gradient(180deg, rgba(15,23,42,0), rgba(15,23,42,0.8)), repeating-linear-gradient(90deg, rgba(56,189,248,0.16) 0 28px, rgba(251,191,36,0.14) 28px 54px)",
  },
  sceneWalkingCharacter: {
    position: "absolute",
    left: "48%",
    bottom: "24%",
    width: 28,
    height: 72,
    borderRadius: "18px 18px 8px 8px",
    background: "#020617",
    animation: "showcase-float 2.8s ease-in-out infinite",
  },
  scenePastelSky: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at 28% 28%, rgba(255,255,255,0.9), transparent 22%), radial-gradient(circle at 72% 38%, rgba(251,207,232,0.9), transparent 26%)",
  },
  sceneBranch: {
    position: "absolute",
    left: "-8%",
    top: "22%",
    width: "62%",
    height: 12,
    borderRadius: 999,
    background: "#7c2d12",
    transform: "rotate(-13deg)",
    boxShadow: "24px 18px 0 -4px #9f1239",
  },
  scenePetals: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(ellipse at 18% 40%, #fdf2f8 0 7px, transparent 8px), radial-gradient(ellipse at 40% 24%, #f9a8d4 0 6px, transparent 7px), radial-gradient(ellipse at 70% 58%, #fdf2f8 0 7px, transparent 8px), radial-gradient(ellipse at 86% 32%, #f9a8d4 0 5px, transparent 6px)",
    animation: "showcase-drift 4.6s ease-in-out infinite alternate",
  },
  sceneGalaxy: {
    position: "absolute",
    inset: "8%",
    background:
      "radial-gradient(circle at 20% 20%, #ffffff 0 2px, transparent 3px), radial-gradient(circle at 36% 48%, #bfdbfe 0 2px, transparent 3px), radial-gradient(circle at 64% 28%, #ffffff 0 2px, transparent 3px), radial-gradient(circle at 82% 64%, #bfdbfe 0 2px, transparent 3px)",
    opacity: 0.9,
  },
  sceneHill: {
    position: "absolute",
    left: "-10%",
    right: "-10%",
    bottom: "-8%",
    height: "38%",
    borderRadius: "50% 50% 0 0",
    background: "#020617",
  },
  sceneWatcher: {
    position: "absolute",
    left: "47%",
    bottom: "25%",
    width: 20,
    height: 48,
    borderRadius: "16px 16px 6px 6px",
    background: "#111827",
  },
  sceneShootingStar: {
    position: "absolute",
    left: "8%",
    top: "20%",
    width: 120,
    height: 3,
    borderRadius: 999,
    background:
      "linear-gradient(90deg, rgba(255,255,255,0), #ffffff, rgba(255,255,255,0))",
    boxShadow: "0 0 18px rgba(255,255,255,0.9)",
    animation: "showcase-star 3s ease-in-out infinite",
  },
  showcaseGrid: {
    display: "grid",
    gap: 14,
  },
  showcasePanel: {
    minHeight: 260,
    borderRadius: 8,
    border: "1px solid #dce5ee",
    background: "#ffffff",
    padding: 14,
    boxShadow: "0 16px 38px rgba(17,24,39,0.06)",
  },
  videoScene: {
    height: 174,
    position: "relative",
    overflow: "hidden",
    borderRadius: 8,
    background: "#20252e",
  },
  videoSky: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, #3ddc97 0%, #93e2c4 36%, #f43f5e 37%, #20252e 100%)",
    opacity: 0.92,
    animation: "home-pan 8s ease-in-out infinite",
  },
  videoSubject: {
    position: "absolute",
    left: "48%",
    bottom: 36,
    width: 58,
    height: 86,
    borderRadius: "28px 28px 8px 8px",
    background: "#111827",
    boxShadow: "0 0 0 8px rgba(255,255,255,0.16)",
    animation: "home-float-soft 2.8s ease-in-out infinite",
  },
  videoTimeline: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    height: 6,
    borderRadius: 999,
    background: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  videoTimelineFill: {
    display: "block",
    width: "60%",
    height: "100%",
    background: "#ffffff",
    borderRadius: 999,
    animation: "home-progress 3.1s linear infinite",
  },
  avatarDuo: {
    minHeight: 174,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 8,
    background: "#eef5f7",
    overflow: "hidden",
  },
  avatarThumb: {
    width: "46%",
    height: 154,
    objectFit: "cover",
    borderRadius: 8,
    border: "1px solid #dce5ee",
    animation: "home-float-soft 4.4s ease-in-out infinite",
  },
  musicPreview: {
    minHeight: 174,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 8,
    background: "#111827",
    overflow: "hidden",
  },
  musicColumn: {
    width: 8,
    borderRadius: 999,
    background: "#22c55e",
    animation: "home-pulse-line 880ms ease-in-out infinite",
  },
  panelTitle: {
    margin: "14px 0 0",
    color: "#111827",
    fontSize: 17,
    lineHeight: 1.25,
    fontWeight: 600,
  },
  panelText: {
    margin: "7px 0 0",
    color: "#566371",
    fontSize: 14,
    lineHeight: 1.55,
    fontWeight: 400,
  },
  templateShowcaseGrid: {
    display: "grid",
    gap: 14,
  },
  templateProduct: {
    minHeight: 390,
    borderRadius: 8,
    border: "1px solid #dce5ee",
    background: "#ffffff",
    color: "#111827",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 16px 38px rgba(17,24,39,0.06)",
  },
  templateImageWrap: {
    position: "relative",
    display: "block",
    height: 210,
    overflow: "hidden",
    background: "#eef5f7",
  },
  templateProductImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    transition: "transform 180ms ease",
  },
  templateBadge: {
    position: "absolute",
    left: 10,
    top: 10,
    borderRadius: 8,
    background: "rgba(255,255,255,0.92)",
    color: "#111827",
    padding: "6px 9px",
    fontSize: 11,
    lineHeight: 1,
    fontWeight: 600,
  },
  templateProductTitle: {
    margin: "14px 14px 0",
    color: "#111827",
    fontSize: 18,
    lineHeight: 1.25,
    fontWeight: 600,
  },
  templateProductText: {
    margin: "8px 14px 0",
    color: "#566371",
    fontSize: 14,
    lineHeight: 1.55,
    fontWeight: 400,
    flex: 1,
  },
  templateProductAction: {
    margin: "16px 14px 14px",
    minHeight: 38,
    borderRadius: 8,
    background: "#111827",
    color: "#ffffff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 600,
  },
  customUploadBand: {
    marginTop: 14,
    borderRadius: 8,
    border: "1px solid #dce5ee",
    background: "#ffffff",
    padding: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
  },
  customTitle: {
    margin: 0,
    color: "#111827",
    fontSize: 20,
    lineHeight: 1.25,
    fontWeight: 600,
  },
  customActions: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  toolGrid: {
    display: "grid",
    gap: 12,
  },
  toolCard: {
    minHeight: 142,
    borderRadius: 8,
    border: "1px solid #dce5ee",
    background: "#ffffff",
    padding: 16,
    color: "#111827",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 14px 34px rgba(17,24,39,0.05)",
  },
  toolKicker: {
    color: "#166534",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  toolTitle: {
    marginTop: 14,
    fontSize: 18,
    lineHeight: 1.25,
    fontWeight: 600,
  },
  toolText: {
    marginTop: 8,
    color: "#566371",
    fontSize: 14,
    lineHeight: 1.55,
    fontWeight: 400,
  },
  apiSection: {
    width: "min(1180px, 100%)",
    margin: "46px auto 0",
    display: "grid",
    gap: 18,
    alignItems: "center",
    borderRadius: 8,
    border: "1px solid #dce5ee",
    background: "#ffffff",
    padding: 24,
    scrollMarginTop: 90,
    boxShadow: "0 16px 38px rgba(17,24,39,0.06)",
  },
  codePanel: {
    borderRadius: 8,
    background: "#111827",
    color: "#e5e7eb",
    overflow: "hidden",
    border: "1px solid #2f3542",
  },
  codeHeader: {
    minHeight: 36,
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "0 12px",
    borderBottom: "1px solid rgba(255,255,255,0.09)",
  },
  codeDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    background: "#22c55e",
  },
  codeBlock: {
    margin: 0,
    padding: 16,
    overflowX: "auto",
    fontSize: 13,
    lineHeight: 1.7,
    color: "#f9fafb",
  },
};
