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