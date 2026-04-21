export type AppLanguage = "tr" | "en" | "de" | "ku";

export const APP_LANGUAGES: AppLanguage[] = ["tr", "en", "de", "ku"];

export function isAppLanguage(value: string): value is AppLanguage {
  return APP_LANGUAGES.includes(value as AppLanguage);
}

export function getSafeLanguage(value?: string | null): AppLanguage {
  if (!value) return "tr";
  return isAppLanguage(value) ? value : "tr";
}

export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  tr: "Türkçe",
  en: "English",
  de: "Deutsch",
  ku: "Kurdî",
};

export const LANGUAGE_FLAGS: Record<AppLanguage, string> = {
  tr: "/flags/tr.png",
  en: "/flags/en.png",
  de: "/flags/de.png",
  ku: "/flags/ku.png",
};

export const COMMON_I18N = {
  tr: {
    appName: "Duble-S Motion AI",
    appSubtitle: "AI Creative Platform",

    nav: {
      home: "Ana sayfa",
      chat: "Sohbet",
      music: "Müzik",
      textToImage: "Görsel",
      textToVideo: "Video",
      imageToVideo: "Resimden Video",
      videoClone: "Video Klon",
      history: "Geçmiş",
      editor: "Editör",
      billing: "Planlar",
    },

    user: {
      guest: "Kullanıcı",
      freePlan: "Free",
      credits: "Kredi",
      logout: "Çıkış",
      profile: "Profil",
    },

    actions: {
      generate: "Oluştur",
      save: "Kaydet",
      cancel: "İptal",
      reset: "Sıfırla",
      refresh: "Yenile",
      edit: "Düzenle",
      delete: "Sil",
      close: "Kapat",
      back: "Geri",
      next: "İleri",
      copy: "Kopyala",
      copied: "Kopyalandı",
      download: "İndir",
      upload: "Yükle",
      send: "Gönder",
      openEditor: "Editöre ekle",
      openHistory: "Geçmiş",
      openBilling: "Planlar",
      openChat: "Sohbet",
    },

    states: {
      loading: "Yükleniyor...",
      preparing: "Hazırlanıyor...",
      processing: "İşleniyor...",
      success: "İşlem başarılı",
      empty: "Henüz içerik yok",
      error: "Bir hata oluştu",
    },

    chat: {
      placeholder: "Mesajını yaz...",
      helper: "Enter gönderir • Shift+Enter alt satır açar",
      thinking: "Yazıyor...",
      title: "Duble-S Motion AI",
      subtitle: "Ne yapmak istediğini doğal şekilde yaz. Seni doğru akışa yönlendireyim.",
      copy: "Kopyala",
      like: "Beğen",
      dislike: "Beğenme",
      share: "Paylaş",
    },
  },

  en: {
    appName: "Duble-S Motion AI",
    appSubtitle: "AI Creative Platform",

    nav: {
      home: "Home",
      chat: "Chat",
      music: "Music",
      textToImage: "Image",
      textToVideo: "Video",
      imageToVideo: "Image to Video",
      videoClone: "Video Clone",
      history: "History",
      editor: "Editor",
      billing: "Plans",
    },

    user: {
      guest: "User",
      freePlan: "Free",
      credits: "Credits",
      logout: "Logout",
      profile: "Profile",
    },

    actions: {
      generate: "Generate",
      save: "Save",
      cancel: "Cancel",
      reset: "Reset",
      refresh: "Refresh",
      edit: "Edit",
      delete: "Delete",
      close: "Close",
      back: "Back",
      next: "Next",
      copy: "Copy",
      copied: "Copied",
      download: "Download",
      upload: "Upload",
      send: "Send",
      openEditor: "Add to editor",
      openHistory: "History",
      openBilling: "Plans",
      openChat: "Chat",
    },

    states: {
      loading: "Loading...",
      preparing: "Preparing...",
      processing: "Processing...",
      success: "Completed successfully",
      empty: "No content yet",
      error: "Something went wrong",
    },

    chat: {
      placeholder: "Type your message...",
      helper: "Press Enter to send • Shift+Enter for a new line",
      thinking: "Thinking...",
      title: "Duble-S Motion AI",
      subtitle: "Write naturally what you want to do, and I’ll guide you into the right flow.",
      copy: "Copy",
      like: "Like",
      dislike: "Dislike",
      share: "Share",
    },
  },

  de: {
    appName: "Duble-S Motion AI",
    appSubtitle: "AI Creative Platform",

    nav: {
      home: "Startseite",
      chat: "Chat",
      music: "Musik",
      textToImage: "Bild",
      textToVideo: "Video",
      imageToVideo: "Bild zu Video",
      videoClone: "Video-Klon",
      history: "Verlauf",
      editor: "Editor",
      billing: "Pläne",
    },

    user: {
      guest: "Benutzer",
      freePlan: "Free",
      credits: "Credits",
      logout: "Abmelden",
      profile: "Profil",
    },

    actions: {
      generate: "Erzeugen",
      save: "Speichern",
      cancel: "Abbrechen",
      reset: "Zurücksetzen",
      refresh: "Aktualisieren",
      edit: "Bearbeiten",
      delete: "Löschen",
      close: "Schließen",
      back: "Zurück",
      next: "Weiter",
      copy: "Kopieren",
      copied: "Kopiert",
      download: "Download",
      upload: "Hochladen",
      send: "Senden",
      openEditor: "Zum Editor",
      openHistory: "Verlauf",
      openBilling: "Pläne",
      openChat: "Chat",
    },

    states: {
      loading: "Wird geladen...",
      preparing: "Wird vorbereitet...",
      processing: "Wird verarbeitet...",
      success: "Erfolgreich abgeschlossen",
      empty: "Noch kein Inhalt",
      error: "Ein Fehler ist aufgetreten",
    },

    chat: {
      placeholder: "Nachricht eingeben...",
      helper: "Enter zum Senden • Shift+Enter für neue Zeile",
      thinking: "Schreibt...",
      title: "Duble-S Motion AI",
      subtitle: "Schreibe natürlich, was du machen möchtest, und ich leite dich in den richtigen Ablauf.",
      copy: "Kopieren",
      like: "Gefällt mir",
      dislike: "Gefällt mir nicht",
      share: "Teilen",
    },
  },

  ku: {
    appName: "Duble-S Motion AI",
    appSubtitle: "AI Creative Platform",

    nav: {
      home: "Destpêk",
      chat: "Chat",
      music: "Muzîk",
      textToImage: "Wêne",
      textToVideo: "Vîdyo",
      imageToVideo: "Ji Wêneyê Vîdyo",
      videoClone: "Klona Vîdyoyê",
      history: "History",
      editor: "Editor",
      billing: "Plan",
    },

    user: {
      guest: "Bikarhêner",
      freePlan: "Free",
      credits: "Kredit",
      logout: "Derkeve",
      profile: "Profil",
    },

    actions: {
      generate: "Çêke",
      save: "Tomar bike",
      cancel: "Betal bike",
      reset: "Ji nû ve",
      refresh: "Nû bike",
      edit: "Sererast bike",
      delete: "Jê bibe",
      close: "Bigire",
      back: "Paşve",
      next: "Pêşve",
      copy: "Kopî bike",
      copied: "Hat kopîkirin",
      download: "Daxe",
      upload: "Bar bike",
      send: "Bişîne",
      openEditor: "Li editor zêde bike",
      openHistory: "History",
      openBilling: "Plan",
      openChat: "Chat",
    },

    states: {
      loading: "Tê barkirin...",
      preparing: "Tê amadekirin...",
      processing: "Tê xebitandin...",
      success: "Bi ser ket",
      empty: "Hê ti naverok tune ye",
      error: "Xeletiyek çêbû",
    },

    chat: {
      placeholder: "Peyama xwe binivîse...",
      helper: "Enter ji bo şandinê • Shift+Enter ji bo rêza nû",
      thinking: "Tê nivîsandin...",
      title: "Duble-S Motion AI",
      subtitle: "Bi awayekî xwezayî binivîse tu dixwazî çi bikî, ez ê te bînim bo rêya rast.",
      copy: "Kopî bike",
      like: "Hez kir",
      dislike: "Hez nekir",
      share: "Parve bike",
    },
  },
} as const;

export function getCommonI18n(language?: string | null) {
  const lang = getSafeLanguage(language);
  return COMMON_I18N[lang];
}
