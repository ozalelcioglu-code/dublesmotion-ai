"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import AppShell from "@/components/layout/AppShell";
import { getSafeLanguage, type AppLanguage } from "@/lib/i18n";
import { useLanguage } from "@/provider/languageProvider";
import { useSession } from "@/provider/SessionProvider";

type ApiKeyItem = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  requestCount: number;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

type ApiKeyResponse = {
  ok: boolean;
  keys?: ApiKeyItem[];
  secret?: string;
  key?: ApiKeyItem;
  error?: string;
};

type ApiWallet = {
  balanceCents: number;
  totalPurchasedCents: number;
  totalSpentCents: number;
};

type ApiPrice = {
  mode: string;
  label: string;
  unitCents: number;
};

type ApiTopupPack = {
  id: string;
  label: string;
  amountCents: number;
  bonusCents: number;
};

type ApiLedgerItem = {
  id: string;
  kind: string;
  amount_cents: number;
  balance_after_cents: number | null;
  request_mode: string | null;
  description: string | null;
  created_at: string;
};

type ApiBillingResponse = {
  ok: boolean;
  wallet?: ApiWallet;
  prices?: ApiPrice[];
  packs?: ApiTopupPack[];
  ledger?: ApiLedgerItem[];
  error?: string;
};

function formatMoney(cents?: number | null) {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}

const COPY: Record<
  AppLanguage,
  {
    title: string;
    badge: string;
    loginTitle: string;
    login: string;
    createTitle: string;
    keyName: string;
    create: string;
    creating: string;
    newKey: string;
    saveOnce: string;
    keysTitle: string;
    noKeys: string;
    revoked: string;
    active: string;
    revoke: string;
    docsTitle: string;
    endpoint: string;
  }
> = {
  tr: {
    title: "Duble-S Motion Developer API",
    badge: "Geliştirici erişimi",
    loginTitle: "API key için giriş yap",
    login: "Giriş yap",
    createTitle: "Yeni API key oluştur",
    keyName: "Key adı",
    create: "API key oluştur",
    creating: "Oluşturuluyor...",
    newKey: "Yeni gizli key",
    saveOnce: "Bu değeri şimdi güvenli bir yerde sakla. Daha sonra tekrar gösterilmez.",
    keysTitle: "API keylerin",
    noKeys: "Henüz API key yok.",
    revoked: "Pasif",
    active: "Aktif",
    revoke: "İptal et",
    docsTitle: "İstek örneği",
    endpoint: "Endpoint",
  },
  en: {
    title: "Duble-S Motion Developer API",
    badge: "Developer access",
    loginTitle: "Sign in for API keys",
    login: "Login",
    createTitle: "Create a new API key",
    keyName: "Key name",
    create: "Create API key",
    creating: "Creating...",
    newKey: "New secret key",
    saveOnce: "Store this value securely now. It will not be shown again.",
    keysTitle: "Your API keys",
    noKeys: "No API keys yet.",
    revoked: "Inactive",
    active: "Active",
    revoke: "Revoke",
    docsTitle: "Request example",
    endpoint: "Endpoint",
  },
  de: {
    title: "Duble-S Motion Developer API",
    badge: "Entwicklerzugang",
    loginTitle: "Für API-Keys anmelden",
    login: "Anmelden",
    createTitle: "Neuen API-Key erstellen",
    keyName: "Key-Name",
    create: "API-Key erstellen",
    creating: "Wird erstellt...",
    newKey: "Neuer geheimer Key",
    saveOnce: "Speichere diesen Wert jetzt sicher. Er wird später nicht erneut angezeigt.",
    keysTitle: "Deine API-Keys",
    noKeys: "Noch keine API-Keys.",
    revoked: "Inaktiv",
    active: "Aktiv",
    revoke: "Deaktivieren",
    docsTitle: "Request-Beispiel",
    endpoint: "Endpoint",
  },
  ku: {
    title: "Duble-S Motion Developer API",
    badge: "Gihîştina developer",
    loginTitle: "Ji bo API key têkeve",
    login: "Têkeve",
    createTitle: "API key nû çêke",
    keyName: "Navê key",
    create: "API key çêke",
    creating: "Tê çêkirin...",
    newKey: "Key-a veşartî ya nû",
    saveOnce: "Vê nirxê niha li cihê ewle tomar bike. Paşê careke din nayê nîşandan.",
    keysTitle: "API keyên te",
    noKeys: "Hê API key tune.",
    revoked: "Neçalak",
    active: "Çalak",
    revoke: "Betal bike",
    docsTitle: "Mînaka daxwazê",
    endpoint: "Endpoint",
  },
};

const API_BILLING_COPY: Record<
  AppLanguage,
  {
    balanceTitle: string;
    currentBalance: string;
    purchased: string;
    spent: string;
    topupTitle: string;
    addBalance: string;
    openingCheckout: string;
    pricingTitle: string;
    perRequest: string;
    ledgerTitle: string;
    noLedger: string;
  }
> = {
  tr: {
    balanceTitle: "API bakiyesi",
    currentBalance: "Mevcut bakiye",
    purchased: "Toplam yüklenen",
    spent: "Toplam harcanan",
    topupTitle: "Bakiye ekle",
    addBalance: "Bakiye yükle",
    openingCheckout: "Ödeme açılıyor...",
    pricingTitle: "API ücretlendirme",
    perRequest: "istek başına",
    ledgerTitle: "Son API hareketleri",
    noLedger: "Henüz API hareketi yok.",
  },
  en: {
    balanceTitle: "API balance",
    currentBalance: "Current balance",
    purchased: "Total added",
    spent: "Total spent",
    topupTitle: "Add balance",
    addBalance: "Add balance",
    openingCheckout: "Opening checkout...",
    pricingTitle: "API pricing",
    perRequest: "per request",
    ledgerTitle: "Recent API activity",
    noLedger: "No API activity yet.",
  },
  de: {
    balanceTitle: "API-Guthaben",
    currentBalance: "Aktuelles Guthaben",
    purchased: "Insgesamt geladen",
    spent: "Insgesamt genutzt",
    topupTitle: "Guthaben hinzufügen",
    addBalance: "Guthaben laden",
    openingCheckout: "Checkout wird geöffnet...",
    pricingTitle: "API-Preise",
    perRequest: "pro Request",
    ledgerTitle: "Letzte API-Aktivität",
    noLedger: "Noch keine API-Aktivität.",
  },
  ku: {
    balanceTitle: "Balansa API",
    currentBalance: "Balansa heyî",
    purchased: "Hemû barkirî",
    spent: "Hemû xerckirî",
    topupTitle: "Balans zêde bike",
    addBalance: "Balans barke",
    openingCheckout: "Checkout tê vekirin...",
    pricingTitle: "Bihaya API",
    perRequest: "ji bo her daxwazê",
    ledgerTitle: "Çalakiyên dawî yên API",
    noLedger: "Hê çalakiyek API tune.",
  },
};

export default function DeveloperPortalClient() {
  const { language } = useLanguage();
  const { user, isAuthenticated } = useSession();
  const safeLanguage = getSafeLanguage(language);
  const t = COPY[safeLanguage];
  const billingText = API_BILLING_COPY[safeLanguage];

  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [wallet, setWallet] = useState<ApiWallet | null>(null);
  const [prices, setPrices] = useState<ApiPrice[]>([]);
  const [packs, setPacks] = useState<ApiTopupPack[]>([]);
  const [ledger, setLedger] = useState<ApiLedgerItem[]>([]);
  const [name, setName] = useState("Production integration");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [processingPackId, setProcessingPackId] = useState("");

  const codeSample = useMemo(
    () => `curl https://www.dublesmotion.com/api/v1/generate \\
  -H "Authorization: Bearer dms_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "mode": "text_to_video",
    "prompt": "cinematic product reveal",
    "ratio": "16:9",
    "durationSec": 8
  }'`,
    []
  );

  const loadKeys = useCallback(async () => {
    if (!isAuthenticated) return;

    const res = await fetch("/api/developer/keys", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as ApiKeyResponse | null;

    if (res.ok && data?.ok) {
      setKeys(data.keys || []);
    }
  }, [isAuthenticated]);

  const loadBilling = useCallback(
    async (checkoutSessionId?: string | null) => {
      if (!isAuthenticated) return;

      const suffix = checkoutSessionId
        ? `?session_id=${encodeURIComponent(checkoutSessionId)}`
        : "";

      const res = await fetch(`/api/developer/billing/profile${suffix}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as ApiBillingResponse | null;

      if (res.ok && data?.ok) {
        setWallet(data.wallet || null);
        setPrices(data.prices || []);
        setPacks(data.packs || []);
        setLedger(data.ledger || []);
      }
    },
    [isAuthenticated]
  );

  useEffect(() => {
    void loadKeys();
    void loadBilling();
  }, [loadBilling, loadKeys]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("api_topup");
    const checkoutSessionId = params.get("session_id");

    if (checkout === "success") {
      void loadBilling(checkoutSessionId);
    }
  }, [isAuthenticated, loadBilling]);

  async function createKey() {
    if (loading) return;

    try {
      setLoading(true);
      setError("");
      setSecret("");

      const res = await fetch("/api/developer/keys", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json().catch(() => null)) as ApiKeyResponse | null;

      if (!res.ok || !data?.ok || !data.secret) {
        throw new Error(data?.error || "API key could not be created");
      }

      setSecret(data.secret);
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "API key could not be created");
    } finally {
      setLoading(false);
    }
  }

  async function revokeKey(id: string) {
    const res = await fetch(`/api/developer/keys/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (res.ok) {
      await loadKeys();
    }
  }

  async function startTopup(packId: string) {
    if (processingPackId) return;

    try {
      setProcessingPackId(packId);
      setError("");

      const res = await fetch("/api/developer/billing/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; url?: string; error?: string }
        | null;

      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Checkout could not be started");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout could not be started");
      setProcessingPackId("");
    }
  }

  return (
    <AppShell
      currentPath="/developers"
      pageTitle={t.title}
    >
      <div style={styles.page}>
        <section style={styles.hero}>
          <div style={styles.badge}>{t.badge}</div>
          <h1 style={styles.title}>{t.title}</h1>
          {user ? (
            <div style={styles.accountPill}>
              {user.email} · {user.planLabel}
            </div>
          ) : null}
        </section>

        {!isAuthenticated ? (
          <section style={styles.panel}>
            <h2 style={styles.panelTitle}>{t.loginTitle}</h2>
            <Link href="/login" style={styles.primaryButton}>
              {t.login}
            </Link>
          </section>
        ) : (
          <>
            <section style={styles.balanceGrid}>
              <div style={styles.panel}>
                <h2 style={styles.panelTitle}>{billingText.balanceTitle}</h2>
                <div style={styles.walletStats}>
                  <div style={styles.walletStat}>
                    <span style={styles.walletLabel}>
                      {billingText.currentBalance}
                    </span>
                    <span style={styles.walletValue}>
                      {formatMoney(wallet?.balanceCents)}
                    </span>
                  </div>
                  <div style={styles.walletStat}>
                    <span style={styles.walletLabel}>{billingText.purchased}</span>
                    <span style={styles.walletValueSmall}>
                      {formatMoney(wallet?.totalPurchasedCents)}
                    </span>
                  </div>
                  <div style={styles.walletStat}>
                    <span style={styles.walletLabel}>{billingText.spent}</span>
                    <span style={styles.walletValueSmall}>
                      {formatMoney(wallet?.totalSpentCents)}
                    </span>
                  </div>
                </div>
              </div>

              <div style={styles.panel}>
                <h2 style={styles.panelTitle}>{billingText.topupTitle}</h2>
                <div style={styles.packGrid}>
                  {packs.map((pack) => (
                    <button
                      key={pack.id}
                      type="button"
                      onClick={() => startTopup(pack.id)}
                      style={styles.packButton}
                    >
                      <span style={styles.packLabel}>{pack.label}</span>
                      <span style={styles.packAmount}>
                        {formatMoney(pack.amountCents + pack.bonusCents)}
                      </span>
                      {pack.bonusCents > 0 ? (
                        <span style={styles.packBonus}>
                          +{formatMoney(pack.bonusCents)}
                        </span>
                      ) : null}
                      <span style={styles.packAction}>
                        {processingPackId === pack.id
                          ? billingText.openingCheckout
                          : billingText.addBalance}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section style={styles.panel}>
              <h2 style={styles.panelTitle}>{billingText.pricingTitle}</h2>
              <div style={styles.priceGrid}>
                {prices.map((price) => (
                  <div key={price.mode} style={styles.priceRow}>
                    <span style={styles.priceName}>{price.label}</span>
                    <span style={styles.priceValue}>
                      {formatMoney(price.unitCents)} / {billingText.perRequest}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section style={styles.grid}>
              <div style={styles.panel}>
                <h2 style={styles.panelTitle}>{t.createTitle}</h2>

                <label style={styles.label}>
                  {t.keyName}
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    style={styles.input}
                  />
                </label>

                <button
                  type="button"
                  onClick={createKey}
                  disabled={loading}
                  style={styles.primaryButton}
                >
                  {loading ? t.creating : t.create}
                </button>

                {secret ? (
                  <div style={styles.secretBox}>
                    <div style={styles.secretTitle}>{t.newKey}</div>
                    <code style={styles.secretCode}>{secret}</code>
                    <p style={styles.warning}>{t.saveOnce}</p>
                  </div>
                ) : null}

                {error ? <div style={styles.error}>{error}</div> : null}
              </div>

              <div style={styles.panel}>
                <h2 style={styles.panelTitle}>{t.keysTitle}</h2>
                <div style={styles.keyList}>
                  {keys.length === 0 ? (
                    <div style={styles.empty}>{t.noKeys}</div>
                  ) : (
                    keys.map((item) => (
                      <div key={item.id} style={styles.keyRow}>
                        <div>
                          <div style={styles.keyName}>{item.name}</div>
                          <div style={styles.keyMeta}>
                            {item.keyPrefix} · {item.requestCount} requests
                          </div>
                        </div>
                        <div style={styles.keyActions}>
                          <span
                            style={{
                              ...styles.status,
                              ...(item.revokedAt ? styles.statusOff : null),
                            }}
                          >
                            {item.revokedAt ? t.revoked : t.active}
                          </span>
                          {!item.revokedAt ? (
                            <button
                              type="button"
                              onClick={() => revokeKey(item.id)}
                              style={styles.revokeButton}
                            >
                              {t.revoke}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            <section style={styles.panel}>
              <h2 style={styles.panelTitle}>{billingText.ledgerTitle}</h2>
              <div style={styles.ledgerList}>
                {ledger.length === 0 ? (
                  <div style={styles.empty}>{billingText.noLedger}</div>
                ) : (
                  ledger.map((item) => (
                    <div key={item.id} style={styles.ledgerRow}>
                      <div>
                        <div style={styles.keyName}>
                          {item.description || item.kind}
                        </div>
                        <div style={styles.keyMeta}>
                          {item.request_mode || item.kind} ·{" "}
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div
                        style={{
                          ...styles.ledgerAmount,
                          color: item.amount_cents >= 0 ? "#166534" : "#991b1b",
                        }}
                      >
                        {item.amount_cents >= 0 ? "+" : ""}
                        {formatMoney(item.amount_cents)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}

        <section style={styles.docs}>
          <div>
            <div style={styles.badge}>{t.endpoint}</div>
            <h2 style={styles.panelTitle}>{t.docsTitle}</h2>
          </div>
          <pre style={styles.code}>{codeSample}</pre>
        </section>
      </div>
    </AppShell>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    display: "grid",
    gap: 18,
  },
  hero: {
    borderRadius: 8,
    border: "1px solid #dce5ee",
    background: "#ffffff",
    padding: 22,
  },
  badge: {
    display: "inline-flex",
    minHeight: 28,
    alignItems: "center",
    borderRadius: 8,
    background: "#ecfdf5",
    color: "#166534",
    padding: "0 10px",
    fontSize: 12,
    fontWeight: 600,
  },
  title: {
    margin: "14px 0 0",
    color: "#111827",
    fontSize: 36,
    lineHeight: 1.12,
    letterSpacing: 0,
    fontWeight: 700,
  },
  text: {
    margin: "10px 0 0",
    color: "#52606d",
    fontSize: 15,
    lineHeight: 1.65,
    fontWeight: 400,
  },
  accountPill: {
    display: "inline-flex",
    marginTop: 16,
    borderRadius: 8,
    border: "1px solid #dce5ee",
    background: "#f8fafc",
    color: "#111827",
    padding: "9px 11px",
    fontSize: 13,
    fontWeight: 500,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
  },
  balanceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 16,
  },
  panel: {
    borderRadius: 8,
    border: "1px solid #dce5ee",
    background: "#ffffff",
    padding: 18,
  },
  panelTitle: {
    margin: 0,
    color: "#111827",
    fontSize: 22,
    lineHeight: 1.2,
    fontWeight: 700,
  },
  label: {
    display: "grid",
    gap: 8,
    marginTop: 16,
    color: "#111827",
    fontSize: 13,
    fontWeight: 500,
  },
  input: {
    width: "100%",
    height: 42,
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    padding: "0 12px",
    color: "#111827",
    background: "#ffffff",
    boxSizing: "border-box",
  },
  walletStats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: 10,
    marginTop: 16,
  },
  walletStat: {
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    padding: 12,
  },
  walletLabel: {
    display: "block",
    color: "#64748b",
    fontSize: 11,
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  walletValue: {
    display: "block",
    marginTop: 7,
    color: "#111827",
    fontSize: 28,
    lineHeight: 1,
    fontWeight: 700,
  },
  walletValueSmall: {
    display: "block",
    marginTop: 7,
    color: "#111827",
    fontSize: 18,
    lineHeight: 1.2,
    fontWeight: 600,
  },
  packGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(138px, 1fr))",
    gap: 10,
    marginTop: 16,
  },
  packButton: {
    appearance: "none",
    border: "1px solid #dce5ee",
    borderRadius: 8,
    background: "#ffffff",
    color: "#111827",
    padding: 12,
    textAlign: "left",
    cursor: "pointer",
    display: "grid",
    gap: 6,
  },
  packLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "#334155",
  },
  packAmount: {
    fontSize: 24,
    lineHeight: 1,
    fontWeight: 700,
    color: "#111827",
  },
  packBonus: {
    color: "#166534",
    fontSize: 12,
    fontWeight: 600,
  },
  packAction: {
    minHeight: 30,
    borderRadius: 8,
    background: "#111827",
    color: "#ffffff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 9px",
    fontSize: 12,
    fontWeight: 600,
  },
  priceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
    marginTop: 16,
  },
  priceRow: {
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    padding: 12,
    display: "grid",
    gap: 6,
  },
  priceName: {
    color: "#111827",
    fontSize: 13,
    fontWeight: 600,
  },
  priceValue: {
    color: "#166534",
    fontSize: 13,
    fontWeight: 600,
  },
  primaryButton: {
    appearance: "none",
    border: 0,
    minHeight: 42,
    marginTop: 16,
    padding: "0 15px",
    borderRadius: 8,
    background: "#111827",
    color: "#ffffff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  secretBox: {
    marginTop: 16,
    borderRadius: 8,
    border: "1px solid #bbf7d0",
    background: "#f0fdf4",
    padding: 12,
  },
  secretTitle: {
    color: "#166534",
    fontSize: 12,
    fontWeight: 600,
  },
  secretCode: {
    display: "block",
    marginTop: 8,
    overflowX: "auto",
    color: "#111827",
    fontSize: 12,
    lineHeight: 1.6,
  },
  warning: {
    margin: "9px 0 0",
    color: "#7c2d12",
    fontSize: 12,
    lineHeight: 1.5,
    fontWeight: 400,
  },
  error: {
    marginTop: 12,
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: 500,
  },
  keyList: {
    display: "grid",
    gap: 10,
    marginTop: 14,
  },
  ledgerList: {
    display: "grid",
    gap: 10,
    marginTop: 14,
  },
  empty: {
    borderRadius: 8,
    border: "1px dashed #cbd5e1",
    padding: 14,
    color: "#64748b",
    fontSize: 13,
    fontWeight: 400,
  },
  keyRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    padding: 12,
    flexWrap: "wrap",
  },
  ledgerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    padding: 12,
    flexWrap: "wrap",
  },
  ledgerAmount: {
    fontSize: 15,
    fontWeight: 600,
  },
  keyName: {
    color: "#111827",
    fontSize: 14,
    fontWeight: 600,
  },
  keyMeta: {
    marginTop: 4,
    color: "#64748b",
    fontSize: 12,
    fontWeight: 400,
  },
  keyActions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  status: {
    borderRadius: 8,
    background: "#dcfce7",
    color: "#166534",
    padding: "6px 8px",
    fontSize: 11,
    fontWeight: 600,
  },
  statusOff: {
    background: "#f1f5f9",
    color: "#64748b",
  },
  revokeButton: {
    appearance: "none",
    border: "1px solid #fecaca",
    borderRadius: 8,
    background: "#fff1f2",
    color: "#991b1b",
    minHeight: 30,
    padding: "0 9px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  docs: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
    alignItems: "start",
    borderRadius: 8,
    border: "1px solid #dce5ee",
    background: "#ffffff",
    padding: 18,
  },
  note: {
    margin: "12px 0 0",
    color: "#166534",
    fontSize: 13,
    lineHeight: 1.55,
    fontWeight: 400,
  },
  code: {
    margin: 0,
    borderRadius: 8,
    background: "#111827",
    color: "#f8fafc",
    overflowX: "auto",
    padding: 16,
    fontSize: 12,
    lineHeight: 1.7,
  },
};
