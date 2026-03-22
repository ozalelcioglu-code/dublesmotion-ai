export type LegalSection = {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalPageContent = {
  title: string;
  updatedLabel: string;
  updatedValue: string;
  sections: LegalSection[];
};

export type LegalPageKey =
  | "impressum"
  | "privacy-policy"
  | "terms-of-service"
  | "refund-policy"
  | "cookie-policy";

export const LEGAL_PAGES: Record<
  LegalPageKey,
  Record<"tr" | "en" | "de", LegalPageContent>
> = {
  impressum: {
    tr: {
      title: "Künye / Impressum",
      updatedLabel: "Son güncelleme",
      updatedValue: "21.03.2026",
      sections: [
        {
          paragraphs: [
            "DDG § 5 uyarınca sağlayıcı bilgileri aşağıda yer almaktadır.",
          ],
        },
        {
          heading: "Şirket Bilgileri",
          paragraphs: [
            "Duble-S Technology",
            "LangStrasse 12053 Berlin",
            "Almanya",
          ],
        },
        {
          heading: "Yetkili Kişi",
          paragraphs: ["Özal Elçioğlu"],
        },
        {
          heading: "İletişim",
          paragraphs: [
            "Telefon: +4917632854727",
            "E-posta: info@dublestechnology.com",
            "Yasal / idari iletişim: ozal@dublestechnology.com",
          ],
        },
        {
          heading: "İçerikten Sorumlu Kişi",
          paragraphs: [
            "Özal Elçioğlu",
            "LangStrasse 12053 Berlin",
          ],
        },
        {
          heading: "İçerik Sorumluluğu",
          paragraphs: [
            "Hizmet sağlayıcı olarak kendi içeriklerimizden genel yasal düzenlemeler çerçevesinde sorumluyuz. Bununla birlikte sunulan bilgilerin doğruluğu, eksiksizliği ve güncelliği konusunda garanti verilmez.",
          ],
        },
        {
          heading: "Bağlantılar Hakkında Sorumluluk",
          paragraphs: [
            "Bu web sitesi üçüncü taraf sitelere bağlantılar içerebilir. Bu dış içerikler üzerinde kontrolümüz bulunmadığından, söz konusu içerikler için sorumluluk kabul edilmez.",
          ],
        },
        {
          heading: "Telif Hakkı",
          paragraphs: [
            "Bu sitede yayınlanan metinler, tasarımlar, görseller, markalar ve medya içerikleri aksi belirtilmedikçe telif hakkı ve ilgili fikri mülkiyet hakları kapsamında korunur.",
          ],
        },
      ],
    },
    en: {
      title: "Impressum / Legal Notice",
      updatedLabel: "Last updated",
      updatedValue: "21.03.2026",
      sections: [
        {
          paragraphs: [
            "Provider information pursuant to Section 5 DDG is listed below.",
          ],
        },
        {
          heading: "Company Information",
          paragraphs: [
            "Duble-S Technology",
            "LangStrasse 12053 Berlin",
            "Germany",
          ],
        },
        {
          heading: "Authorized Representative",
          paragraphs: ["Özal Elçioğlu"],
        },
        {
          heading: "Contact",
          paragraphs: [
            "Phone: +4917632854727",
            "Email: info@dublestechnology.com",
            "Legal / administrative contact: ozal@dublestechnology.com",
          ],
        },
        {
          heading: "Responsible for Content",
          paragraphs: [
            "Özal Elçioğlu",
            "LangStrasse 12053 Berlin",
          ],
        },
        {
          heading: "Liability for Content",
          paragraphs: [
            "As a service provider, we are responsible for our own content under the general laws. However, we do not guarantee the accuracy, completeness or timeliness of the information provided.",
          ],
        },
        {
          heading: "Liability for Links",
          paragraphs: [
            "This website may contain links to third-party websites. We have no control over external content and therefore assume no liability for such content.",
          ],
        },
        {
          heading: "Copyright",
          paragraphs: [
            "Unless otherwise stated, the texts, designs, visuals, brands and media published on this website are protected by copyright and related intellectual property rights.",
          ],
        },
      ],
    },
    de: {
      title: "Impressum",
      updatedLabel: "Zuletzt aktualisiert",
      updatedValue: "21.03.2026",
      sections: [
        {
          paragraphs: [
            "Angaben gemäß § 5 DDG finden Sie nachfolgend.",
          ],
        },
        {
          heading: "Unternehmensangaben",
          paragraphs: [
            "Duble-S Technology",
            "LangStrasse 12053 Berlin",
            "Deutschland",
          ],
        },
        {
          heading: "Vertreten durch",
          paragraphs: ["Özal Elçioğlu"],
        },
        {
          heading: "Kontakt",
          paragraphs: [
            "Telefon: +4917632854727",
            "E-Mail: info@dublestechnology.com",
            "Rechtlicher / administrativer Kontakt: ozal@dublestechnology.com",
          ],
        },
        {
          heading: "Verantwortlich für den Inhalt",
          paragraphs: [
            "Özal Elçioğlu",
            "LangStrasse 12053 Berlin",
          ],
        },
        {
          heading: "Haftung für Inhalte",
          paragraphs: [
            "Als Diensteanbieter sind wir nach den allgemeinen Gesetzen für eigene Inhalte verantwortlich. Für die Richtigkeit, Vollständigkeit und Aktualität der bereitgestellten Informationen übernehmen wir jedoch keine Gewähr.",
          ],
        },
        {
          heading: "Haftung für Links",
          paragraphs: [
            "Diese Website kann Links zu externen Websites Dritter enthalten. Auf deren Inhalte haben wir keinen Einfluss und übernehmen daher keine Haftung.",
          ],
        },
        {
          heading: "Urheberrecht",
          paragraphs: [
            "Die auf dieser Website veröffentlichten Texte, Designs, Bilder, Marken und Medieninhalte sind, soweit nicht anders angegeben, urheberrechtlich und durch verwandte Schutzrechte geschützt.",
          ],
        },
      ],
    },
  },

  "privacy-policy": {
    tr: {
      title: "Gizlilik Politikası",
      updatedLabel: "Son güncelleme",
      updatedValue: "21.03.2026",
      sections: [
        {
          heading: "1. Veri Sorumlusu",
          paragraphs: [
            "Duble-S Technology, bu platform ve ilişkili hizmetler kapsamında işlenen kişisel veriler bakımından veri sorumlusudur.",
            "Adres: LangStrasse 12053 Berlin",
            "E-posta: info@dublestechnology.com",
          ],
        },
        {
          heading: "2. Topladığımız Veriler",
          bullets: [
            "Ad, e-posta adresi ve hesap bilgileri",
            "Plan, faturalama ve kullanım bilgileri",
            "Destek talepleri ve iletişim kayıtları",
            "IP adresi, tarayıcı ve cihaz bilgileri",
            "Yüklenen medya, promptlar ve üretilen çıktılar",
            "Güvenlik ve kötüye kullanım önleme amaçlı teknik kayıtlar",
          ],
        },
        {
          heading: "3. Verileri Hangi Amaçlarla İşliyoruz",
          bullets: [
            "Hesap oluşturmak ve yönetmek",
            "AI video, ses ve medya hizmetlerini sunmak",
            "Kimlik doğrulama ve oturum güvenliğini sağlamak",
            "Abonelik ve ödeme süreçlerini yürütmek",
            "Destek taleplerine yanıt vermek",
            "Kötüye kullanım, dolandırıcılık ve yetkisiz erişimi önlemek",
            "Platform performansını ve kullanıcı deneyimini geliştirmek",
          ],
        },
        {
          heading: "4. Hukuki Dayanak",
          paragraphs: [
            "Veriler; sözleşmenin ifası, yasal yükümlülük, meşru menfaat ve gerekli hallerde açık rıza hukuki sebeplerine dayanılarak işlenebilir.",
          ],
        },
        {
          heading: "5. Veri Paylaşımı",
          paragraphs: [
            "Verileriniz, yalnızca hizmetin çalışması için gerekli olduğu ölçüde barındırma, kimlik doğrulama, ödeme, e-posta, analiz ve güvenlik altyapısı sağlayıcıları ile paylaşılabilir.",
          ],
        },
        {
          heading: "6. Saklama Süresi",
          paragraphs: [
            "Kişisel veriler yalnızca gerekli olduğu süre boyunca ve yasal, muhasebesel, güvenlik veya sözleşmesel gereklilikler ölçüsünde saklanır.",
          ],
        },
        {
          heading: "7. Haklarınız",
          bullets: [
            "Verilerinize erişim talep etme",
            "Yanlış verilerin düzeltilmesini isteme",
            "Silme talep etme",
            "İşlemeyi kısıtlama",
            "İşlemeye itiraz etme",
            "Veri taşınabilirliği talep etme",
          ],
        },
        {
          heading: "8. Güvenlik",
          paragraphs: [
            "Kişisel verilerinizi yetkisiz erişim, kayıp, kötüye kullanım veya ifşaya karşı korumak için teknik ve organizasyonel önlemler uyguluyoruz.",
          ],
        },
        {
          heading: "9. İletişim",
          paragraphs: [
            "Gizlilik ve veri koruma ile ilgili talepleriniz için: info@dublestechnology.com",
          ],
        },
      ],
    },
    en: {
      title: "Privacy Policy",
      updatedLabel: "Last updated",
      updatedValue: "21.03.2026",
      sections: [
        {
          heading: "1. Controller",
          paragraphs: [
            "Duble-S Technology is the controller for personal data processed through this platform and related services.",
            "Address: LangStrasse 12053 Berlin",
            "Email: info@dublestechnology.com",
          ],
        },
        {
          heading: "2. Data We Collect",
          bullets: [
            "Name, email address and account information",
            "Plan, billing and usage information",
            "Support requests and communication records",
            "IP address, browser and device information",
            "Uploaded media, prompts and generated outputs",
            "Technical logs used for security and abuse prevention",
          ],
        },
        {
          heading: "3. Why We Process Data",
          bullets: [
            "To create and manage accounts",
            "To provide AI video, audio and media services",
            "To authenticate users and secure sessions",
            "To handle subscriptions and payments",
            "To respond to support requests",
            "To prevent abuse, fraud and unauthorized access",
            "To improve platform performance and user experience",
          ],
        },
        {
          heading: "4. Legal Bases",
          paragraphs: [
            "Personal data may be processed based on contract performance, legal obligation, legitimate interests and, where required, consent.",
          ],
        },
        {
          heading: "5. Data Sharing",
          paragraphs: [
            "Your data may be shared with hosting, authentication, payment, email, analytics and security providers only to the extent necessary to operate the service.",
          ],
        },
        {
          heading: "6. Retention",
          paragraphs: [
            "Personal data is retained only for as long as necessary for legal, accounting, security or contractual purposes.",
          ],
        },
        {
          heading: "7. Your Rights",
          bullets: [
            "Request access to your data",
            "Request correction of inaccurate data",
            "Request deletion",
            "Request restriction of processing",
            "Object to processing",
            "Request data portability",
          ],
        },
        {
          heading: "8. Security",
          paragraphs: [
            "We use technical and organizational measures designed to protect personal data against unauthorized access, loss, misuse or disclosure.",
          ],
        },
        {
          heading: "9. Contact",
          paragraphs: [
            "For privacy and data protection requests, contact: info@dublestechnology.com",
          ],
        },
      ],
    },
    de: {
      title: "Datenschutzerklärung",
      updatedLabel: "Zuletzt aktualisiert",
      updatedValue: "21.03.2026",
      sections: [
        {
          heading: "1. Verantwortlicher",
          paragraphs: [
            "Duble-S Technology ist Verantwortlicher für die personenbezogenen Daten, die über diese Plattform und die zugehörigen Dienste verarbeitet werden.",
            "Adresse: LangStrasse 12053 Berlin",
            "E-Mail: info@dublestechnology.com",
          ],
        },
        {
          heading: "2. Welche Daten wir erfassen",
          bullets: [
            "Name, E-Mail-Adresse und Kontoinformationen",
            "Plan-, Abrechnungs- und Nutzungsdaten",
            "Supportanfragen und Kommunikationsdaten",
            "IP-Adresse, Browser- und Geräteinformationen",
            "Hochgeladene Medien, Prompts und generierte Ergebnisse",
            "Technische Protokolle zur Sicherheit und Missbrauchsprävention",
          ],
        },
        {
          heading: "3. Zwecke der Verarbeitung",
          bullets: [
            "Erstellung und Verwaltung von Benutzerkonten",
            "Bereitstellung von KI-Video-, Audio- und Mediendiensten",
            "Authentifizierung und Sitzungssicherheit",
            "Abwicklung von Abonnements und Zahlungen",
            "Bearbeitung von Supportanfragen",
            "Verhinderung von Missbrauch, Betrug und unbefugtem Zugriff",
            "Verbesserung von Plattformleistung und Nutzererlebnis",
          ],
        },
        {
          heading: "4. Rechtsgrundlagen",
          paragraphs: [
            "Die Verarbeitung personenbezogener Daten kann auf Vertragserfüllung, gesetzlicher Verpflichtung, berechtigten Interessen und – soweit erforderlich – Einwilligung beruhen.",
          ],
        },
        {
          heading: "5. Weitergabe von Daten",
          paragraphs: [
            "Ihre Daten können nur insoweit an Hosting-, Authentifizierungs-, Zahlungs-, E-Mail-, Analyse- und Sicherheitsdienstleister weitergegeben werden, wie dies für den Betrieb des Dienstes erforderlich ist.",
          ],
        },
        {
          heading: "6. Speicherdauer",
          paragraphs: [
            "Personenbezogene Daten werden nur so lange gespeichert, wie dies für rechtliche, buchhalterische, sicherheitsbezogene oder vertragliche Zwecke erforderlich ist.",
          ],
        },
        {
          heading: "7. Ihre Rechte",
          bullets: [
            "Auskunft über Ihre Daten verlangen",
            "Berichtigung unrichtiger Daten verlangen",
            "Löschung verlangen",
            "Einschränkung der Verarbeitung verlangen",
            "Widerspruch gegen die Verarbeitung einlegen",
            "Datenübertragbarkeit verlangen",
          ],
        },
        {
          heading: "8. Sicherheit",
          paragraphs: [
            "Wir setzen technische und organisatorische Maßnahmen ein, um personenbezogene Daten vor unbefugtem Zugriff, Verlust, Missbrauch oder Offenlegung zu schützen.",
          ],
        },
        {
          heading: "9. Kontakt",
          paragraphs: [
            "Für Datenschutzanfragen kontaktieren Sie bitte: info@dublestechnology.com",
          ],
        },
      ],
    },
  },

  "terms-of-service": {
    tr: {
      title: "Kullanım Şartları",
      updatedLabel: "Son güncelleme",
      updatedValue: "21.03.2026",
      sections: [
        {
          heading: "1. Kapsam",
          paragraphs: [
            "Bu şartlar, Dublesmotion AI platformuna ve ilişkili hizmetlere erişiminizi ve kullanımınızı düzenler.",
          ],
        },
        {
          heading: "2. Hesaplar",
          paragraphs: [
            "Hesap bilgilerinizin güvenliğinden ve hesabınız üzerinden gerçekleşen tüm işlemlerden siz sorumlusunuz.",
          ],
        },
        {
          heading: "3. Yasaklı Kullanım",
          bullets: [
            "Yasadışı faaliyetlerde bulunmak",
            "Sisteme izinsiz erişmeye çalışmak",
            "Kotayı, kredileri veya fiyatlamayı kötüye kullanmak",
            "Başkalarının haklarını ihlal eden içerik üretmek veya yüklemek",
          ],
        },
        {
          heading: "4. AI Çıktıları",
          paragraphs: [
            "AI tarafından üretilen içerikler hatalı, eksik veya başka çıktılarla benzer olabilir. Nihai kullanım öncesinde kontrol sorumluluğu kullanıcıya aittir.",
          ],
        },
        {
          heading: "5. Planlar, Ödemeler ve Krediler",
          paragraphs: [
            "Bazı özellikler ücretli plan veya kullanım kredisi gerektirebilir. Fiyatlar, limitler ve paket içerikleri zaman zaman güncellenebilir.",
          ],
        },
        {
          heading: "6. Hizmet Sürekliliği",
          paragraphs: [
            "Hizmeti kesintisiz, hatasız veya her zaman erişilebilir şekilde sunacağımız garanti edilmez.",
          ],
        },
        {
          heading: "7. Hesap Askıya Alma / Sonlandırma",
          paragraphs: [
            "Şartların ihlali, güvenlik riski, ödeme ihlali veya kötüye kullanım halinde hesabı askıya alma veya sonlandırma hakkımız saklıdır.",
          ],
        },
        {
          heading: "8. Sorumluluk Sınırı",
          paragraphs: [
            "Hizmet, mevzuatın izin verdiği ölçüde 'olduğu gibi' sunulur. Dolaylı zararlar, veri kaybı, gelir kaybı veya iş kesintileri için sorumluluk kabul edilmez.",
          ],
        },
      ],
    },
    en: {
      title: "Terms of Service",
      updatedLabel: "Last updated",
      updatedValue: "21.03.2026",
      sections: [
        {
          heading: "1. Scope",
          paragraphs: [
            "These Terms govern your access to and use of the Dublesmotion AI platform and related services.",
          ],
        },
        {
          heading: "2. Accounts",
          paragraphs: [
            "You are responsible for the security of your account credentials and for all activity under your account.",
          ],
        },
        {
          heading: "3. Prohibited Use",
          bullets: [
            "Engaging in unlawful activity",
            "Attempting unauthorized access",
            "Abusing quotas, credits or pricing",
            "Uploading or generating content that infringes third-party rights",
          ],
        },
        {
          heading: "4. AI Outputs",
          paragraphs: [
            "AI-generated content may be inaccurate, incomplete or similar to other outputs. Users are responsible for reviewing outputs before use.",
          ],
        },
        {
          heading: "5. Plans, Payments and Credits",
          paragraphs: [
            "Certain features may require paid plans or usage credits. Prices, limits and package details may change from time to time.",
          ],
        },
        {
          heading: "6. Service Availability",
          paragraphs: [
            "We do not guarantee uninterrupted, error-free or permanent availability of the service.",
          ],
        },
        {
          heading: "7. Suspension / Termination",
          paragraphs: [
            "We may suspend or terminate accounts in cases of Terms violations, security risks, payment issues or abuse.",
          ],
        },
        {
          heading: "8. Limitation of Liability",
          paragraphs: [
            "To the extent permitted by law, the service is provided 'as is'. We are not liable for indirect damages, loss of data, loss of revenue or business interruption.",
          ],
        },
      ],
    },
    de: {
      title: "Nutzungsbedingungen",
      updatedLabel: "Zuletzt aktualisiert",
      updatedValue: "21.03.2026",
      sections: [
        {
          heading: "1. Geltungsbereich",
          paragraphs: [
            "Diese Bedingungen regeln Ihren Zugang zur Dublesmotion AI Plattform und deren Nutzung.",
          ],
        },
        {
          heading: "2. Konten",
          paragraphs: [
            "Sie sind für die Sicherheit Ihrer Zugangsdaten und für alle Aktivitäten unter Ihrem Konto verantwortlich.",
          ],
        },
        {
          heading: "3. Verbotene Nutzung",
          bullets: [
            "Rechtswidrige Nutzung",
            "Versuche unbefugten Zugriffs",
            "Missbrauch von Quoten, Credits oder Preisen",
            "Hochladen oder Erzeugen von Inhalten, die Rechte Dritter verletzen",
          ],
        },
        {
          heading: "4. KI-Ergebnisse",
          paragraphs: [
            "KI-generierte Inhalte können ungenau, unvollständig oder anderen Ergebnissen ähnlich sein. Nutzer sind verpflichtet, die Ergebnisse vor der Verwendung zu prüfen.",
          ],
        },
        {
          heading: "5. Pläne, Zahlungen und Credits",
          paragraphs: [
            "Bestimmte Funktionen können kostenpflichtige Tarife oder Nutzungsguthaben erfordern. Preise, Limits und Paketdetails können sich von Zeit zu Zeit ändern.",
          ],
        },
        {
          heading: "6. Verfügbarkeit des Dienstes",
          paragraphs: [
            "Wir garantieren keine unterbrechungsfreie, fehlerfreie oder dauerhafte Verfügbarkeit des Dienstes.",
          ],
        },
        {
          heading: "7. Sperrung / Kündigung",
          paragraphs: [
            "Wir können Konten bei Verstößen gegen diese Bedingungen, Sicherheitsrisiken, Zahlungsproblemen oder Missbrauch sperren oder kündigen.",
          ],
        },
        {
          heading: "8. Haftungsbeschränkung",
          paragraphs: [
            "Soweit gesetzlich zulässig, wird der Dienst 'wie besehen' bereitgestellt. Für indirekte Schäden, Datenverlust, Umsatzausfälle oder Betriebsunterbrechungen übernehmen wir keine Haftung.",
          ],
        },
      ],
    },
  },

  "refund-policy": {
    tr: {
      title: "İade Politikası",
      updatedLabel: "Son güncelleme",
      updatedValue: "21.03.2026",
      sections: [
        {
          heading: "1. Genel Kural",
          paragraphs: [
            "Abonelikler, kullanım kredileri ve dijital hizmet ödemeleri, aksi yasal olarak zorunlu olmadıkça genel olarak iade edilmez.",
          ],
        },
        {
          heading: "2. İade Değerlendirilebilecek Durumlar",
          bullets: [
            "Aynı ödeme için mükerrer tahsilat yapılması",
            "Doğrulanmış teknik bir arıza nedeniyle satın alınan hizmetin sunulamaması",
            "Yanlış tutarda faturalandırma yapılması",
            "Mevzuat gereği iade hakkı doğması",
          ],
        },
        {
          heading: "3. Genel Olarak İade Dışı Durumlar",
          bullets: [
            "Abonelik döneminin kısmen kullanılmış olması",
            "Kullanıcı girdisine bağlı kalite memnuniyetsizliği",
            "Kredilerin kullanıcı tarafından tüketilmiş olması",
            "Üçüncü taraf kesintileri veya kullanıcı hataları",
          ],
        },
        {
          heading: "4. Başvuru Süreci",
          paragraphs: [
            "İade talepleri için info@dublestechnology.com adresine ödeme tarihi, hesap e-postası ve gerekçeniz ile birlikte başvurabilirsiniz.",
          ],
        },
      ],
    },
    en: {
      title: "Refund Policy",
      updatedLabel: "Last updated",
      updatedValue: "21.03.2026",
      sections: [
        {
          heading: "1. General Rule",
          paragraphs: [
            "Payments for subscriptions, usage credits and digital services are generally non-refundable unless required by law.",
          ],
        },
        {
          heading: "2. Cases We May Review",
          bullets: [
            "Duplicate charges",
            "Verified technical failure preventing delivery of the purchased service",
            "Incorrect billing amount",
            "Refund rights arising under applicable law",
          ],
        },
        {
          heading: "3. Generally Non-Refundable Cases",
          bullets: [
            "Partial use of a subscription period",
            "Dissatisfaction caused by user inputs or subjective output expectations",
            "Credits already used by the account",
            "Third-party outages or user-side errors",
          ],
        },
        {
          heading: "4. Request Process",
          paragraphs: [
            "Refund requests may be sent to info@dublestechnology.com together with the payment date, account email and reason for the request.",
          ],
        },
      ],
    },
    de: {
      title: "Rückerstattungsrichtlinie",
      updatedLabel: "Zuletzt aktualisiert",
      updatedValue: "21.03.2026",
      sections: [
        {
          heading: "1. Allgemeine Regel",
          paragraphs: [
            "Zahlungen für Abonnements, Nutzungsguthaben und digitale Dienstleistungen sind grundsätzlich nicht erstattungsfähig, sofern gesetzlich nichts anderes vorgeschrieben ist.",
          ],
        },
        {
          heading: "2. Fälle, die geprüft werden können",
          bullets: [
            "Doppelte Abbuchungen",
            "Bestätigter technischer Fehler, durch den der gekaufte Dienst nicht erbracht werden konnte",
            "Fehlerhafte Rechnungsstellung",
            "Rückerstattungsansprüche nach geltendem Recht",
          ],
        },
        {
          heading: "3. Im Regelfall nicht erstattungsfähig",
          bullets: [
            "Teilweise genutzte Abonnementzeiträume",
            "Unzufriedenheit aufgrund von Nutzereingaben oder subjektiven Ergebniserwartungen",
            "Bereits verbrauchte Credits",
            "Ausfälle Dritter oder Nutzerfehler",
          ],
        },
        {
          heading: "4. Antragsverfahren",
          paragraphs: [
            "Rückerstattungsanfragen können an info@dublestechnology.com mit Zahlungsdatum, Kontaktemail und Begründung gesendet werden.",
          ],
        },
      ],
    },
  },

  "cookie-policy": {
    tr: {
      title: "Çerez Politikası",
      updatedLabel: "Son güncelleme",
      updatedValue: "21.03.2026",
      sections: [
        {
          heading: "1. Çerez Nedir",
          paragraphs: [
            "Çerezler, web sitesini kullandığınızda cihazınıza kaydedilen küçük metin dosyalarıdır.",
          ],
        },
        {
          heading: "2. Çerezleri Neden Kullanıyoruz",
          bullets: [
            "Oturum ve giriş işlemlerini sürdürmek",
            "Hesap ve güvenlik kontrollerini sağlamak",
            "Dil ve tercihleri hatırlamak",
            "Performans ve kullanım analizi yapmak",
          ],
        },
        {
          heading: "3. Çerez Türleri",
          bullets: [
            "Zorunlu çerezler",
            "Tercih çerezleri",
            "Analitik / performans çerezleri",
          ],
        },
        {
          heading: "4. Kontrol",
          paragraphs: [
            "Tarayıcı ayarlarınız üzerinden çerezleri yönetebilir veya engelleyebilirsiniz. Ancak bazı çerezleri devre dışı bırakmak platformun çalışmasını etkileyebilir.",
          ],
        },
      ],
    },
    en: {
      title: "Cookie Policy",
      updatedLabel: "Last updated",
      updatedValue: "21.03.2026",
      sections: [
        {
          heading: "1. What Are Cookies",
          paragraphs: [
            "Cookies are small text files stored on your device when you use a website.",
          ],
        },
        {
          heading: "2. Why We Use Cookies",
          bullets: [
            "To maintain sessions and sign-in state",
            "To support account and security controls",
            "To remember language and preferences",
            "To analyze performance and usage",
          ],
        },
        {
          heading: "3. Types of Cookies",
          bullets: [
            "Essential cookies",
            "Preference cookies",
            "Analytics / performance cookies",
          ],
        },
        {
          heading: "4. Control",
          paragraphs: [
            "You may manage or block cookies through your browser settings. Disabling certain cookies may affect platform functionality.",
          ],
        },
      ],
    },
    de: {
      title: "Cookie-Richtlinie",
      updatedLabel: "Zuletzt aktualisiert",
      updatedValue: "21.03.2026",
      sections: [
        {
          heading: "1. Was sind Cookies",
          paragraphs: [
            "Cookies sind kleine Textdateien, die beim Besuch einer Website auf Ihrem Gerät gespeichert werden.",
          ],
        },
        {
          heading: "2. Warum wir Cookies verwenden",
          bullets: [
            "Zur Aufrechterhaltung von Sitzungen und Login-Zuständen",
            "Zur Unterstützung von Konto- und Sicherheitsfunktionen",
            "Zum Speichern von Sprache und Einstellungen",
            "Zur Analyse von Leistung und Nutzung",
          ],
        },
        {
          heading: "3. Arten von Cookies",
          bullets: [
            "Notwendige Cookies",
            "Präferenz-Cookies",
            "Analyse- / Performance-Cookies",
          ],
        },
        {
          heading: "4. Kontrolle",
          paragraphs: [
            "Sie können Cookies über Ihre Browsereinstellungen verwalten oder blockieren. Das Deaktivieren bestimmter Cookies kann jedoch die Funktionalität der Plattform beeinträchtigen.",
          ],
        },
      ],
    },
  },
};