export type AppLanguage = "tr" | "en" | "de";

export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  tr: "Türkçe",
  en: "English",
  de: "Deutsch",
};

export const DEFAULT_LANGUAGE: AppLanguage = "en";
export const LANGUAGE_STORAGE_KEY = "app-language";
export const LANGUAGE_COOKIE_KEY = "app-language";

export const translations = {
  tr: {
    common: {
      appName: "Duble-S Motion AI",
      loading: "Yükleniyor...",
      close: "Kapat",
      cancel: "İptal",
      save: "Kaydet",
      logout: "Çıkış Yap",
      login: "Giriş Yap",
      signup: "Kayıt Ol",
      dashboard: "Panel",
      settings: "Ayarlar",
      billing: "Faturalandırma",
      createVideo: "Video Oluştur",
      freePlan: "Free",
      signedInUser: "Giriş yapan kullanıcı",
      unlimitedCredits: "Sınırsız kredi",
      creditsLeft: "kredi kaldı",
      language: "Dil",
      preview: "Ön İzleme",
      finalVideo: "Final Video",
      delete: "Sil",
      select: "Seç",
      generate: "Oluştur",
      reset: "Sıfırla",
      comingSoon: "Yakında",
    },
    nav: {
      createVideo: "Video Oluştur",
      dashboard: "Panel",
      myVideos: "Videolarım",
      templates: "Şablonlar",
      billing: "Faturalandırma",
      settings: "Ayarlar",
    },
    sidebar: {
      platform: "Yapay Zeka Video Üretim Platformu",
      engine: "Motor: Remotion + AI",
      creditsInfo: "Plan limitleri ve kalan krediler burada görünür.",
    },
    header: {
      workspace: "Çalışma alanı",
      openMenu: "Menüyü aç",
      guestText: "Video üretmeye başlamak için giriş yapın.",
    },
    auth: {
      subtitle: "AI video çalışma alanınızı yönetmek için giriş yapın.",
      title: "Dakikalar içinde sinematik AI videolar üretin",
      description:
        "Storyboard, sahne üretimi ve final render akışını tek bir profesyonel panelden yönetin.",
      feature1: "Çoklu dil destekli profesyonel video üretimi",
      feature2: "Storyboard → scene video → final render akışı",
      feature3: "Plan, kredi ve kullanıcı yönetimi tek ekranda",
      fullName: "Ad Soyad",
      email: "Email",
      password: "Şifre",
      createAccount: "Hesap Oluştur",
      pleaseWait: "Lütfen bekleyin...",
      signupFailed: "Kayıt başarısız",
      loginFailed: "Giriş başarısız",
      authFailed: "Kimlik doğrulama başarısız",
      welcomeBack: "Tekrar hoş geldiniz",
      createNewAccount: "Yeni hesap oluşturun",
    },
    myVideos: {
      empty:
        "Bu hesap için henüz video bulunmuyor. İlk videonuzu oluşturduğunuzda burada görünecek.",
      searchPlaceholder: "Başlık, mod veya format ile ara...",
      countSingle: "video",
      countPlural: "video",
      noSearchResult: "Aramanızla eşleşen video bulunamadı.",
      play: "Oynat",
      download: "İndir",
      delete: "Sil",
      deleting: "Siliniyor...",
      confirmDelete: "Bu videoyu silmek istediğinize emin misiniz?",
      deleteFailed: "Silme işlemi başarısız",
      untitled: "İsimsiz video",
      processing: "İşleniyor",
      ready: "Hazır",
      failed: "Başarısız",
    },
    createVideo: {
      title: "AI Video Oluştur",
      subtitle:
        "Metin, görsel veya ürün bağlantısından profesyonel reklam videoları üretin.",
    },
    home: {
      title: "AI Video Studio",
      subtitle: "Video, ses ve destek araçlarını tek panelden yönetin.",
      studio: "Stüdyo",
      tools: "Araçlar",
      videoTool: "Video",
      voiceTool: "Ses",
      supportTool: "Destek",
      promptLabel: "Prompt",
      promptPlaceholder:
        "Örn: Berlin sokaklarında yürüyen sinematik bir gezgin, yumuşak ışık, profesyonel reklam hissi",
      ratioLabel: "Oran",
      sourceUrlLabel: "Kaynak URL",
      uploadImageLabel: "Görüntü Ekle",
      chooseImage: "Görüntü Seç",
      imageUploaded: "Görsel yüklendi",
      noImageSelected: "Henüz görsel seçilmedi",
      uploadInProgress: "Yükleniyor...",
      generateHint:
        "Plan limitiniz ve kalan krediniz bu panelde dikkate alınır.",
      accountCardTitle: "Hesap",
      currentPlan: "Mevcut Plan",
      remainingCredits: "Kalan Kredi",
      maxDuration: "Maks. Süre",
      lifetimeLimitReached:
        "Free plan limitinize ulaştınız. Yeni video oluşturmak için plan yükseltin.",
      monthlyLimitReached:
        "Aylık video limitinize ulaştınız. Devam etmek için plan yükseltin.",
      loginToCreate: "Video oluşturmak için giriş yapın",
      sceneRailTitle: "Sahneler",
      sceneEmpty: "Henüz sahne oluşmadı.",
      finalPreviewTitle: "Final Preview",
      scenePreviewTitle: "Sahne Ön İzleme",
      outputTitle: "Çıktı",
      statusReady: "Hazır",
      statusGenerating: "Oluşturuluyor",
      statusDone: "Tamamlandı",
      statusError: "Hata",
      noVideoYet: "Video ön izlemesi burada görünecek.",
      generatingVideo: "Video oluşturuluyor...",
      upgradeCta: "Planı Yükselt",
      finalVideoButton: "Final Video",
      selectedScene: "Seçili Sahne",
      mode: "Mod",
      scenes: "Sahneler",
      duration: "Süre",
      status: "Durum",
      downloadVideo: "Videoyu indir",
    },
    voice: {
      title: "Metinden Sese",
      subtitle: "Tarayıcı destekli ses ön izleme ve konuşmacı seçimi.",
      textLabel: "Metin",
      textPlaceholder:
        "Seslendirmek istediğiniz metni bu alana yazın...",
      voiceLabel: "Sanatçı / Ses",
      preview: "Ses Ön İzleme",
      stop: "Durdur",
      noVoices: "Tarayıcı sesi bulunamadı.",
      note:
        "İndirilebilir profesyonel ses üretimi bir sonraki aşamada provider entegrasyonu ile eklenecek.",
    },
    support: {
      title: "Müşteri Desteği",
      subtitle: "Mesajınız info@dublestechnology.com adresine yönlendirilir.",
      subjectLabel: "Konu",
      subjectPlaceholder: "Kısa bir konu yazın",
      messageLabel: "Mesaj",
      messagePlaceholder:
        "Sorununuzu, talebinizi veya istediğiniz geliştirmeyi yazın...",
      send: "Mail ile Gönder",
      hint:
        "Bu ilk sürüm, mesajınızı e-posta uygulamanız üzerinden hazırlar.",
    },
  },

  en: {
    common: {
      appName: "Duble-S Motion AI",
      loading: "Loading...",
      close: "Close",
      cancel: "Cancel",
      save: "Save",
      logout: "Logout",
      login: "Login",
      signup: "Sign Up",
      dashboard: "Dashboard",
      settings: "Settings",
      billing: "Billing",
      createVideo: "Create Video",
      freePlan: "Free",
      signedInUser: "Signed in user",
      unlimitedCredits: "Unlimited credits",
      creditsLeft: "credits left",
      language: "Language",
      preview: "Preview",
      finalVideo: "Final Video",
      delete: "Delete",
      select: "Select",
      generate: "Generate",
      reset: "Reset",
      comingSoon: "Coming soon",
    },
    nav: {
      createVideo: "Create Video",
      dashboard: "Dashboard",
      myVideos: "My Videos",
      templates: "Templates",
      billing: "Billing",
      settings: "Settings",
    },
    sidebar: {
      platform: "AI Video Creation Platform",
      engine: "Engine: Remotion + AI",
      creditsInfo: "Plan limits and remaining credits are visible here.",
    },
    header: {
      workspace: "Workspace",
      openMenu: "Open menu",
      guestText: "Sign in to manage videos, billing, and account settings.",
    },
    auth: {
      subtitle: "Sign in to manage your AI video workspace.",
      title: "Create cinematic AI videos in minutes",
      description:
        "Manage storyboard generation, scene creation, and final rendering from one professional workspace.",
      feature1: "Professional multi-language AI video generation",
      feature2: "Storyboard → scene video → final render workflow",
      feature3: "Plans, credits, and user controls in one place",
      fullName: "Full Name",
      email: "Email",
      password: "Password",
      createAccount: "Create account",
      pleaseWait: "Please wait...",
      signupFailed: "Signup failed",
      loginFailed: "Login failed",
      authFailed: "Auth failed",
      welcomeBack: "Welcome back",
      createNewAccount: "Create a new account",
    },
    myVideos: {
      empty:
        "No videos found for this account yet. Create your first video and it will appear here.",
      searchPlaceholder: "Search by title, mode, or ratio...",
      countSingle: "video",
      countPlural: "videos",
      noSearchResult: "No videos matched your search.",
      play: "Play",
      download: "Download",
      delete: "Delete",
      deleting: "Deleting...",
      confirmDelete: "Are you sure you want to delete this video?",
      deleteFailed: "Delete failed",
      untitled: "Untitled video",
      processing: "Processing",
      ready: "Ready",
      failed: "Failed",
    },
    createVideo: {
      title: "Create AI Video",
      subtitle:
        "Generate professional ad videos from text, images, or product URLs.",
    },
    home: {
      title: "AI Video Studio",
      subtitle: "Manage video, voice, and support tools in one workspace.",
      studio: "Studio",
      tools: "Tools",
      videoTool: "Video",
      voiceTool: "Voice",
      supportTool: "Support",
      promptLabel: "Prompt",
      promptPlaceholder:
        "Example: A cinematic traveler walking through Berlin streets, soft light, premium ad mood",
      ratioLabel: "Ratio",
      sourceUrlLabel: "Source URL",
      uploadImageLabel: "Upload Image",
      chooseImage: "Choose image",
      imageUploaded: "Image uploaded",
      noImageSelected: "No image selected yet",
      uploadInProgress: "Uploading...",
      generateHint:
        "Your plan limits and remaining credits are respected in this panel.",
      accountCardTitle: "Account",
      currentPlan: "Current Plan",
      remainingCredits: "Remaining Credits",
      maxDuration: "Max Duration",
      lifetimeLimitReached:
        "You reached your Free plan limit. Upgrade to create more videos.",
      monthlyLimitReached:
        "You reached your monthly video limit. Upgrade to continue.",
      loginToCreate: "Sign in to create videos",
      sceneRailTitle: "Scenes",
      sceneEmpty: "No scenes yet.",
      finalPreviewTitle: "Final Preview",
      scenePreviewTitle: "Scene Preview",
      outputTitle: "Output",
      statusReady: "Ready",
      statusGenerating: "Generating",
      statusDone: "Done",
      statusError: "Error",
      noVideoYet: "Your video preview will appear here.",
      generatingVideo: "Generating video...",
      upgradeCta: "Upgrade Plan",
      finalVideoButton: "Final Video",
      selectedScene: "Selected Scene",
      mode: "Mode",
      scenes: "Scenes",
      duration: "Duration",
      status: "Status",
      downloadVideo: "Download video",
    },
    voice: {
      title: "Text to Speech",
      subtitle: "Browser-based voice preview with selectable speakers.",
      textLabel: "Text",
      textPlaceholder: "Write the text you want to turn into speech...",
      voiceLabel: "Artist / Voice",
      preview: "Preview Voice",
      stop: "Stop",
      noVoices: "No browser voices found.",
      note:
        "Downloadable professional voice generation can be added next with a provider integration.",
    },
    support: {
      title: "Customer Support",
      subtitle:
        "Your message will be routed to info@dublestechnology.com.",
      subjectLabel: "Subject",
      subjectPlaceholder: "Write a short subject",
      messageLabel: "Message",
      messagePlaceholder:
        "Describe your issue, request, or the feature you want...",
      send: "Send via Email",
      hint:
        "This first version prepares the message through your email app.",
    },
  },

  de: {
    common: {
      appName: "Duble-S Motion AI",
      loading: "Wird geladen...",
      close: "Schließen",
      cancel: "Abbrechen",
      save: "Speichern",
      logout: "Abmelden",
      login: "Anmelden",
      signup: "Registrieren",
      dashboard: "Dashboard",
      settings: "Einstellungen",
      billing: "Abrechnung",
      createVideo: "Video erstellen",
      freePlan: "Free",
      signedInUser: "Angemeldeter Benutzer",
      unlimitedCredits: "Unbegrenzte Credits",
      creditsLeft: "Credits übrig",
      language: "Sprache",
      preview: "Vorschau",
      finalVideo: "Finales Video",
      delete: "Löschen",
      select: "Auswählen",
      generate: "Erstellen",
      reset: "Zurücksetzen",
      comingSoon: "Demnächst",
    },
    nav: {
      createVideo: "Video erstellen",
      dashboard: "Dashboard",
      myVideos: "Meine Videos",
      templates: "Vorlagen",
      billing: "Abrechnung",
      settings: "Einstellungen",
    },
    sidebar: {
      platform: "KI-Videoerstellungsplattform",
      engine: "Engine: Remotion + KI",
      creditsInfo: "Planlimits und verbleibende Credits werden hier angezeigt.",
    },
    header: {
      workspace: "Arbeitsbereich",
      openMenu: "Menü öffnen",
      guestText:
        "Melden Sie sich an, um Videos, Abrechnung und Kontoeinstellungen zu verwalten.",
    },
    auth: {
      subtitle:
        "Melden Sie sich an, um Ihren KI-Video-Arbeitsbereich zu verwalten.",
      title: "Erstellen Sie kinoreife KI-Videos in wenigen Minuten",
      description:
        "Verwalten Sie Storyboard, Szenenerstellung und finales Rendering in einem professionellen Workspace.",
      feature1: "Professionelle mehrsprachige KI-Videoerstellung",
      feature2: "Storyboard → Szenenvideo → finales Rendering",
      feature3: "Pläne, Credits und Benutzerverwaltung an einem Ort",
      fullName: "Vollständiger Name",
      email: "Email",
      password: "Passwort",
      createAccount: "Konto erstellen",
      pleaseWait: "Bitte warten...",
      signupFailed: "Registrierung fehlgeschlagen",
      loginFailed: "Anmeldung fehlgeschlagen",
      authFailed: "Authentifizierung fehlgeschlagen",
      welcomeBack: "Willkommen zurück",
      createNewAccount: "Neues Konto erstellen",
    },
    myVideos: {
      empty:
        "Für dieses Konto wurden noch keine Videos gefunden. Sobald Sie Ihr erstes Video erstellen, erscheint es hier.",
      searchPlaceholder: "Nach Titel, Modus oder Format suchen...",
      countSingle: "Video",
      countPlural: "Videos",
      noSearchResult: "Keine Videos entsprechen Ihrer Suche.",
      play: "Abspielen",
      download: "Herunterladen",
      delete: "Löschen",
      deleting: "Wird gelöscht...",
      confirmDelete: "Möchten Sie dieses Video wirklich löschen?",
      deleteFailed: "Löschen fehlgeschlagen",
      untitled: "Unbenanntes Video",
      processing: "Wird verarbeitet",
      ready: "Bereit",
      failed: "Fehlgeschlagen",
    },
    createVideo: {
      title: "KI-Video erstellen",
      subtitle:
        "Erstellen Sie professionelle Werbevideos aus Text, Bildern oder Produkt-URLs.",
    },
    home: {
      title: "AI Video Studio",
      subtitle:
        "Verwalten Sie Video-, Sprach- und Support-Tools in einem Workspace.",
      studio: "Studio",
      tools: "Werkzeuge",
      videoTool: "Video",
      voiceTool: "Stimme",
      supportTool: "Support",
      promptLabel: "Prompt",
      promptPlaceholder:
        "Beispiel: Ein cineastischer Reisender in den Straßen Berlins, weiches Licht, hochwertiger Werbestil",
      ratioLabel: "Format",
      sourceUrlLabel: "Quell-URL",
      uploadImageLabel: "Bild hochladen",
      chooseImage: "Bild auswählen",
      imageUploaded: "Bild hochgeladen",
      noImageSelected: "Noch kein Bild ausgewählt",
      uploadInProgress: "Wird hochgeladen...",
      generateHint:
        "Ihre Planlimits und verbleibenden Credits werden in diesem Bereich berücksichtigt.",
      accountCardTitle: "Konto",
      currentPlan: "Aktueller Plan",
      remainingCredits: "Verbleibende Credits",
      maxDuration: "Max. Dauer",
      lifetimeLimitReached:
        "Sie haben Ihr Free-Plan-Limit erreicht. Bitte upgraden Sie für weitere Videos.",
      monthlyLimitReached:
        "Sie haben Ihr monatliches Video-Limit erreicht. Bitte upgraden Sie, um fortzufahren.",
      loginToCreate: "Bitte anmelden, um Videos zu erstellen",
      sceneRailTitle: "Szenen",
      sceneEmpty: "Noch keine Szenen vorhanden.",
      finalPreviewTitle: "Finale Vorschau",
      scenePreviewTitle: "Szenenvorschau",
      outputTitle: "Ausgabe",
      statusReady: "Bereit",
      statusGenerating: "Wird erstellt",
      statusDone: "Fertig",
      statusError: "Fehler",
      noVideoYet: "Ihre Videovorschau erscheint hier.",
      generatingVideo: "Video wird erstellt...",
      upgradeCta: "Plan upgraden",
      finalVideoButton: "Finales Video",
      selectedScene: "Ausgewählte Szene",
      mode: "Modus",
      scenes: "Szenen",
      duration: "Dauer",
      status: "Status",
      downloadVideo: "Video herunterladen",
    },
    voice: {
      title: "Text zu Sprache",
      subtitle:
        "Browserbasierte Sprachvorschau mit auswählbaren Stimmen.",
      textLabel: "Text",
      textPlaceholder:
        "Schreiben Sie den Text, den Sie vertonen möchten...",
      voiceLabel: "Künstler / Stimme",
      preview: "Stimme anhören",
      stop: "Stopp",
      noVoices: "Keine Browser-Stimmen gefunden.",
      note:
        "Herunterladbare professionelle Sprachgenerierung kann im nächsten Schritt mit einer Provider-Integration ergänzt werden.",
    },
    support: {
      title: "Kundensupport",
      subtitle:
        "Ihre Nachricht wird an info@dublestechnology.com weitergeleitet.",
      subjectLabel: "Betreff",
      subjectPlaceholder: "Schreiben Sie einen kurzen Betreff",
      messageLabel: "Nachricht",
      messagePlaceholder:
        "Beschreiben Sie Ihr Problem, Ihre Anfrage oder die gewünschte Funktion...",
      send: "Per E-Mail senden",
      hint:
        "Diese erste Version bereitet die Nachricht über Ihre E-Mail-App vor.",
    },
  },
} as const;

export function normalizeLanguage(value?: string | null): AppLanguage {
  if (value === "tr" || value === "en" || value === "de") return value;
  return DEFAULT_LANGUAGE;
}

export function persistLanguage(language: AppLanguage) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {}

  try {
    document.cookie = `${LANGUAGE_COOKIE_KEY}=${language}; path=/; max-age=31536000; samesite=lax`;
  } catch {}

  try {
    document.documentElement.lang = language;
  } catch {}
}

export function getInitialLanguage(): AppLanguage {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;

  const cookieMatch = document.cookie.match(
    new RegExp(`${LANGUAGE_COOKIE_KEY}=(tr|en|de)`)
  );
  if (cookieMatch?.[1]) {
    return normalizeLanguage(cookieMatch[1]);
  }

  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved) return normalizeLanguage(saved);
  } catch {}

  const browser = window.navigator.language.toLowerCase();
  if (browser.startsWith("tr")) return "tr";
  if (browser.startsWith("de")) return "de";
  return DEFAULT_LANGUAGE;
}