import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getChatAccess, type ChatAccess } from "@/lib/plan-access";
import {
  refundUserCredits,
  resolveUsageSession,
  tryConsumeUserCredits,
} from "@/lib/server/usage-credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini";
const AGENT_MODEL = process.env.OPENAI_AGENT_MODEL || MODEL;

const MAX_HISTORY_MESSAGES = 16;
const BASIC_CHAT_CREDIT_COST = 1;

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ChatUsageMode = "basic" | "live_web" | "deep_research" | "project_agent";

type ChatUsagePayload = {
  mode?: ChatUsageMode;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  creditCost?: number;
  steps?: number;
  toolCalls?: number;
};

type TokenUsageAccumulator = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

type ResponseOutputItem = {
  type?: string;
  content?: Array<{
    text?: string;
  }>;
  name?: string;
  arguments?: string;
  call_id?: string;
};

type ResponseData = {
  id?: string;
  output_text?: string;
  output?: ResponseOutputItem[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  error?: unknown;
};

function buildSystemPrompt(
  language?: string,
  deep?: boolean,
  projectAgent?: boolean
) {
  const lang = language || "tr";
  const projectAgentRules = projectAgent
    ? `
Project agent mode:
- You can inspect and edit the current project through the available project tools.
- Before writing files, read the relevant file first unless the user explicitly asks to create a new file.
- Keep edits narrow and preserve existing behavior.
- After edits, summarize the exact files changed.
- Never access paths outside the project workspace.
- If a tool fails, explain clearly what failed and stop escalating.
- If the task needs many edits, prefer smaller safe steps.
`
    : "";

  if (lang === "tr") {
    return `
Sen Duble-S Motion AI içinde çalışan profesyonel bir asistansın.

Kimlik kuralları:
- Kullanıcı "Seni kim yaptı?", "Kim tarafından oluşturuldun?", "Bu sistemi kim kurdu?" gibi bir şey sorarsa cevap net olmalı:
  "Dubles Technology tarafından oluşturuldum."
- Kendini OpenAI tarafından oluşturulmuş bir son kullanıcı ürünü gibi tanıtma.
- Altyapı, model veya teknoloji sorulursa bunu kısa ve profesyonel şekilde açıklayabilirsin ama ürün kimliği olarak Dubles Technology esas alınmalı.

Davranış kuralları:
- Doğal, net, profesyonel ve tekrar etmeyen cevap ver.
- Aynı cümleyi tekrar tekrar yazma.
- Kullanıcının niyetini anlamaya çalış.
- Görsel, müzik, video, image-to-video veya video-clone isteği varsa bunu algıla.
- Doğrudan üretim gerçekten yapılmadıysa "oluşturdum" deme.
- Kullanıcı açıkça üretim başlatmak istemiyorsa otomatik yönlendirme yapma.
- Üretim akışını sadece kullanıcı gerçekten üretim talep ettiğinde tetikleyecek kısa ve net yanıt ver.
- Canlı web açıksa güncel bilgi için kullan.
- Kod yazarken production-ready yaklaşım kullan.
${projectAgentRules}

Özel niyet yönlendirme:
- Kullanıcı yalnızca teknik açıklama, proje dosyası, env, kod, hata ayıklama veya yapılandırma soruyorsa üretim ekranına yönlendirme yapma.
- Görsel isteği varsa ve kullanıcı gerçekten üretim istiyorsa kısa cevap ver ve üretim ekranına uygun şekilde yönlendir.
- Müzik isteği varsa ve kullanıcı gerçekten müzik üretmek istiyorsa kısa cevap ver ve müzik üretim akışına uygun kal.
- Video isteği varsa ve kullanıcı gerçekten video üretmek istiyorsa kısa cevap ver ve video üretim akışına uygun kal.
- Genel bilgi sorularında normal sohbet et.

${
  deep
    ? "Bu oturumda daha kapsamlı, daha dikkatli ve daha derin analiz yap."
    : "Gereksiz uzatma yapma."
}
`;
  }

  if (lang === "de") {
    return `
Du bist ein professioneller Assistent innerhalb von Duble-S Motion AI.

Identitätsregeln:
- Wenn der Nutzer fragt, wer dich erstellt hat, antworte klar:
  "Ich wurde von Dubles Technology erstellt."
- Stelle dich nicht als eigenständiges Endprodukt eines anderen Unternehmens dar.
- Wenn nach Modell oder Infrastruktur gefragt wird, antworte professionell, aber die Produktidentität ist Dubles Technology.

Verhalten:
- Antworte natürlich, klar, professionell und ohne Wiederholungen.
- Wiederhole nicht denselben Satz mehrfach.
- Erkenne die Absicht des Nutzers.
- Erkenne Bild-, Musik-, Video-, Image-to-Video- und Video-Clone-Anfragen.
- Behaupte nicht, dass etwas bereits erzeugt wurde, wenn es noch nicht erzeugt wurde.
- Wenn der Nutzer nicht ausdrücklich Inhalte erzeugen will, leite nicht automatisch in einen Erstellungsfluss weiter.
- Nutze Live-Web für aktuelle Informationen, wenn verfügbar.
- Schreibe produktionsreife Lösungen bei Code-Anfragen.
${projectAgentRules}

${
  deep
    ? "Arbeite in dieser Sitzung gründlicher und tiefer."
    : "Antworte ohne unnötige Länge."
}
`;
  }

  if (lang === "ku") {
    return `
Tu di nav Duble-S Motion AI de asîstantek profesyonel î.

Qanûnên nasnameyê:
- Heke bikarhêner bipirse ka tu ji aliyê kê ve hatî çêkirin, bersiva te divê zelal be:
  "Ez ji aliyê Dubles Technology ve hatime çêkirin."
- Xwe wekî berhemek serbixwe ya pargîdaniyek din mepêşkeş bike.
- Heke li ser model an jêrbingeha teknolojî were pirsîn, bi awayekî profesyonel bersiv bide, lê nasnameya berhemê Dubles Technology ye.

Rêbaz:
- Bi awayekî xwezayî, zelal, profesyonel û bê dubarekirin bersiv bide.
- Hevokên wekhev dubare neke.
- Niyeta bikarhêner fam bike.
- Daxwazên wêne, muzîk, vîdyo, image-to-video û video-clone nas bike.
- Heke çêkirin rast nehatibe kirin, mebêje ku hatiye çêkirin.
- Heke bikarhêner bi eşkereyî daxwaza çêkirinê neke, bi otomatîkî rêberîya hilberandinê neke.
- Heke live web çalak be, ji bo agahiyên nû bikar bîne.
- Dema kodê dinivîsî, production-ready binivîse.
${projectAgentRules}

${
  deep
    ? "Di vê danişînê de bi kûrahî bixebite."
    : "Bê dirêjkirina bêwate bersiv bide."
}
`;
  }

  return `
You are a professional assistant inside Duble-S Motion AI.

Identity rules:
- If the user asks who created you, who built you, or who this system belongs to, answer clearly:
  "I was created by Dubles Technology."
- Do not present yourself as a standalone end-user product created by another company.
- If asked about model or infrastructure, answer professionally, but the product identity is Dubles Technology.

Behavior:
- Be natural, clear, professional, and non-repetitive.
- Never repeat the same sentence multiple times.
- Understand the user's intent.
- Detect image, music, video, image-to-video, and video-clone requests.
- Do not falsely claim content has already been generated.
- Do not auto-route into a generation flow unless the user is explicitly asking to generate something.
- Use live web for current information when available.
- Write production-ready code when needed.
${projectAgentRules}

${
  deep
    ? "Provide deeper and more careful analysis in this session."
    : "Do not be unnecessarily verbose."
}
`;
}

function toInput(messages: Message[]) {
  return messages
    .slice(-MAX_HISTORY_MESSAGES)
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .map((m) => ({
      role: m.role,
      content:
        m.role === "assistant"
          ? [
              {
                type: "output_text" as const,
                text: m.content.trim(),
              },
            ]
          : [
              {
                type: "input_text" as const,
                text: m.content.trim(),
              },
            ],
    }));
}

function buildProjectAgentTools(canWrite: boolean) {
  const tools: Array<Record<string, unknown>> = [
    {
      type: "function",
      name: "list_project_files",
      description:
        "List source files in the current project workspace. Use this to discover relevant files before reading them.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Optional substring to filter file paths.",
          },
          limit: {
            type: "number",
            description: "Maximum number of files to return.",
          },
        },
        required: ["query", "limit"],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "read_project_file",
      description:
        "Read a text/code file from the current project workspace using a relative path.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Project-relative path to read.",
          },
          maxBytes: {
            type: "number",
            description: "Maximum bytes to read.",
          },
        },
        required: ["path", "maxBytes"],
        additionalProperties: false,
      },
    },
  ];

  if (canWrite) {
    tools.push({
      type: "function",
      name: "write_project_file",
      description:
        "Replace or create a text/code file in the current project workspace. Use only after reading context and only for requested edits.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Project-relative path to write.",
          },
          content: {
            type: "string",
            description: "Complete replacement file content.",
          },
        },
        required: ["path", "content"],
        additionalProperties: false,
      },
    });
  }

  return tools;
}

function collectOutputText(data: ResponseData) {
  if (typeof data.output_text === "string" && data.output_text.length > 0) {
    return data.output_text;
  }

  const output = Array.isArray(data.output) ? data.output : [];
  const chunks: string[] = [];

  for (const item of output) {
    if (item?.type !== "message" || !Array.isArray(item.content)) continue;

    for (const part of item.content) {
      if (typeof part?.text === "string") chunks.push(part.text);
    }
  }

  return chunks.join("");
}

function normalizeUsage(usage?: ResponseData["usage"]): ChatUsagePayload {
  if (!usage) return {};

  const inputTokens = usage.input_tokens ?? usage.inputTokens;
  const outputTokens = usage.output_tokens ?? usage.outputTokens;
  const totalTokens =
    usage.total_tokens ??
    usage.totalTokens ??
    (typeof inputTokens === "number" && typeof outputTokens === "number"
      ? inputTokens + outputTokens
      : undefined);

  return {
    inputTokens,
    outputTokens,
    totalTokens,
  };
}

function addUsage(
  accumulator: TokenUsageAccumulator,
  usage?: ResponseData["usage"]
) {
  const normalized = normalizeUsage(usage);
  accumulator.inputTokens += normalized.inputTokens ?? 0;
  accumulator.outputTokens += normalized.outputTokens ?? 0;
  accumulator.totalTokens +=
    normalized.totalTokens ??
    (normalized.inputTokens ?? 0) + (normalized.outputTokens ?? 0);
}

function toOpenAIUsageShape(usage: ChatUsagePayload) {
  return {
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    total_tokens: usage.totalTokens,
  };
}

function createSseTextResponse(
  text: string,
  status = 200,
  usage?: ChatUsagePayload
) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      if (text) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "response.output_text.delta",
              delta: text,
            })}\n\n`
          )
        );
      }

      if (usage) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "dubles.usage",
              usage,
            })}\n\n`
          )
        );
      }

      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "response.completed",
            response: usage
              ? {
                  usage: toOpenAIUsageShape(usage),
                }
              : undefined,
          })}\n\n`
        )
      );
      controller.close();
    },
  });

  return new NextResponse(stream, {
    status,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function truncateForModel(value: unknown, maxChars = 12_000) {
  const raw =
    typeof value === "string" ? value : JSON.stringify(value ?? null, null, 2);

  if (!raw) return "";

  if (raw.length <= maxChars) return raw;

  return `${raw.slice(0, maxChars)}\n\n[truncated]`;
}

function getFriendlyErrorMessage(errorText: string, language: string) {
  const text = (errorText || "").toLowerCase();

  const isQuota =
    text.includes("insufficient_quota") ||
    text.includes("quota") ||
    text.includes("billing");

  const isRateLimit =
    text.includes("rate_limit") ||
    text.includes("rate limit") ||
    text.includes("too many requests");

  const isAuth =
    text.includes("invalid_api_key") ||
    text.includes("incorrect api key") ||
    text.includes("authentication");

  if (language === "tr") {
    if (isQuota) {
      return "AI servis kotası aşıldı. Billing ve API kullanım limitlerini kontrol et. Dosya düzenleme akışı yarıda kalmış olabilir.";
    }
    if (isRateLimit) {
      return "AI servisinde istek sınırına ulaşıldı. Biraz sonra tekrar dene.";
    }
    if (isAuth) {
      return "AI servis anahtarı geçersiz veya eksik görünüyor. API ayarlarını kontrol et.";
    }
    return "AI sohbet isteği sırasında bir hata oluştu. İşlem yarıda kalmış olabilir.";
  }

  if (language === "de") {
    if (isQuota) {
      return "Das AI-Kontingent wurde überschritten. Prüfe Billing und API-Limits. Die Dateibearbeitung könnte unvollständig geblieben sein.";
    }
    if (isRateLimit) {
      return "Das AI-System hat das Anfragelimit erreicht. Bitte versuche es gleich noch einmal.";
    }
    if (isAuth) {
      return "Der AI-API-Schlüssel scheint ungültig oder fehlend zu sein. Bitte prüfe die API-Einstellungen.";
    }
    return "Während der AI-Anfrage ist ein Fehler aufgetreten. Der Vorgang könnte unvollständig geblieben sein.";
  }

  if (language === "ku") {
    if (isQuota) {
      return "Kotaya servîsa AI qediya. Billing û sînorên API kontrol bike. Dibe ku sererastkirina pelan nîvçe maye.";
    }
    if (isRateLimit) {
      return "Servîsa AI gihîştiye sînorê daxwazan. Dû re careke din biceribîne.";
    }
    if (isAuth) {
      return "Mifteya API ya AI xuya dike ku tune ye an ne rast e. Mîhengên API kontrol bike.";
    }
    return "Dema daxwaza AI de çewtiyek çêbû. Dibe ku pêvajo nîvçe maye.";
  }

  if (isQuota) {
    return "AI service quota was exceeded. Check billing and API limits. The file-editing flow may have stopped midway.";
  }
  if (isRateLimit) {
    return "The AI service hit a rate limit. Please try again shortly.";
  }
  if (isAuth) {
    return "The AI API key appears invalid or missing. Check your API configuration.";
  }
  return "An AI chat error occurred. The operation may have stopped midway.";
}

function getLoginRequiredMessage(language: string) {
  if (language === "tr") {
    return "Sohbet ve üretim kullanımı için giriş yapmalısın. Böylece kredi limitin doğru korunur.";
  }
  if (language === "de") {
    return "Bitte melde dich an, damit Chat- und Generierungsnutzung korrekt mit Credits geschützt wird.";
  }
  if (language === "ku") {
    return "Ji bo sohbet û hilberandinê divê tu têkevî, da ku kredit bi rastî were parastin.";
  }
  return "Please sign in so chat and generation usage can be protected with credits.";
}

function getCreditLimitMessage(language: string) {
  if (language === "tr") {
    return "Bu işlem için yeterli kredin kalmadı. Planını yükseltebilir veya kredi yenilenmesini bekleyebilirsin.";
  }
  if (language === "de") {
    return "Für diese Aktion sind nicht genug Credits übrig. Du kannst den Plan erhöhen oder auf die nächste Erneuerung warten.";
  }
  if (language === "ku") {
    return "Ji bo vê çalakiyê krediya te têr nake. Tu dikarî planê bilind bikî an li nûbûna krediyan bisekinî.";
  }
  return "You do not have enough credits left for this action. Upgrade your plan or wait for the next renewal.";
}

function getChatCreditCost(input: {
  liveWebEnabled: boolean;
  deepResearchEnabled: boolean;
  projectAgentEnabled: boolean;
  access: ChatAccess;
}) {
  const costs = [BASIC_CHAT_CREDIT_COST];

  if (input.liveWebEnabled) {
    costs.push(input.access.liveWebCreditCost);
  }

  if (input.deepResearchEnabled) {
    costs.push(input.access.deepResearchCreditCost);
  }

  if (input.projectAgentEnabled) {
    costs.push(
      input.access.canEditProjectFiles
        ? input.access.projectAgentEditCreditCost
        : input.access.projectAgentReadCreditCost
    );
  }

  return Math.max(...costs);
}

function getUsageMode(input: {
  liveWebEnabled: boolean;
  deepResearchEnabled: boolean;
  projectAgentEnabled: boolean;
}): ChatUsageMode {
  if (input.projectAgentEnabled) return "project_agent";
  if (input.deepResearchEnabled) return "deep_research";
  if (input.liveWebEnabled) return "live_web";
  return "basic";
}

function getWebLimitMessage(language: string, maxWebQueriesPerThread: number) {
  if (language === "tr") {
    return `Bu sohbet için canlı web sınırına ulaşıldı. Bu planda sohbet başına ${maxWebQueriesPerThread} canlı web sorgusu kullanılabilir.`;
  }
  if (language === "de") {
    return `Das Live-Web-Limit für diesen Chat wurde erreicht. Dieser Plan erlaubt ${maxWebQueriesPerThread} Live-Web-Abfragen pro Chat.`;
  }
  if (language === "ku") {
    return `Sînora weba zindî ji bo vê sohbetê hat tijîkirin. Ev plan ji bo her sohbetê ${maxWebQueriesPerThread} lêgerînên weba zindî destûr dide.`;
  }
  return `This chat reached the live web limit. This plan allows ${maxWebQueriesPerThread} live web queries per chat.`;
}

function getProjectAgentDailyLimitMessage(language: string, limit: number) {
  if (language === "tr") {
    return `Proje ajanı için günlük sınıra ulaşıldı. Bu planda günde ${limit} proje ajanı isteği kullanılabilir.`;
  }
  if (language === "de") {
    return `Das Tageslimit für den Projekt-Agenten wurde erreicht. Dieser Plan erlaubt ${limit} Projekt-Agent-Anfragen pro Tag.`;
  }
  if (language === "ku") {
    return `Sînora rojane ya ajana projeyê hat tijîkirin. Ev plan rojê ${limit} daxwazên ajana projeyê destûr dide.`;
  }
  return `The project agent daily limit has been reached. This plan allows ${limit} project agent requests per day.`;
}

async function ensureProjectAgentDailyUsageTable() {
  await sql`
    create table if not exists chat_project_agent_daily_usage (
      user_id text not null,
      usage_date date not null,
      usage_count integer not null default 0,
      updated_at timestamptz not null default now(),
      primary key (user_id, usage_date)
    )
  `;
}

async function tryConsumeProjectAgentDailyUsage(
  userId: string,
  dailyLimit: number
) {
  if (dailyLimit <= 0) {
    return { ok: false, count: 0, limit: dailyLimit };
  }

  await ensureProjectAgentDailyUsageTable();

  const today = new Date().toISOString().slice(0, 10);
  const rows = (await sql`
    insert into chat_project_agent_daily_usage (
      user_id,
      usage_date,
      usage_count,
      updated_at
    )
    values (${userId}::text, ${today}::date, 1, now())
    on conflict (user_id, usage_date)
    do update set
      usage_count = chat_project_agent_daily_usage.usage_count + 1,
      updated_at = now()
    where chat_project_agent_daily_usage.usage_count < ${dailyLimit}
    returning usage_count
  `) as Array<{ usage_count: number }>;

  if (rows[0]) {
    return {
      ok: true,
      count: rows[0].usage_count,
      limit: dailyLimit,
    };
  }

  const existing = (await sql`
    select usage_count
    from chat_project_agent_daily_usage
    where user_id = ${userId}::text
      and usage_date = ${today}::date
    limit 1
  `) as Array<{ usage_count: number }>;

  return {
    ok: false,
    count: existing[0]?.usage_count ?? dailyLimit,
    limit: dailyLimit,
  };
}

async function refundProjectAgentDailyUsage(userId: string) {
  await ensureProjectAgentDailyUsageTable();

  const today = new Date().toISOString().slice(0, 10);
  await sql`
    update chat_project_agent_daily_usage
    set
      usage_count = greatest(0, usage_count - 1),
      updated_at = now()
    where user_id = ${userId}::text
      and usage_date = ${today}::date
  `;
}

async function readErrorText(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

type ProjectAgentToolCounters = {
  fileReads: number;
  fileWrites: number;
  fileLists: number;
};

function getProjectToolLimitError(input: {
  name: string;
  counters: ProjectAgentToolCounters;
  access: ChatAccess;
  language: string;
}) {
  const { name, counters, access, language } = input;

  const makeMessage = (tr: string, de: string, ku: string, en: string) => {
    if (language === "tr") return tr;
    if (language === "de") return de;
    if (language === "ku") return ku;
    return en;
  };

  if (name === "list_project_files") {
    if (counters.fileLists >= access.maxProjectFileLists) {
      return makeMessage(
        "Proje ajanı dosya listeleme sınırına ulaştı.",
        "Der Projekt-Agent hat das Limit für Dateilisten erreicht.",
        "Ajana projeyê gihîşt sînora lîstekirina pelan.",
        "The project agent reached the file listing limit."
      );
    }
    counters.fileLists += 1;
  }

  if (name === "read_project_file") {
    if (counters.fileReads >= access.maxProjectFileReads) {
      return makeMessage(
        "Proje ajanı dosya okuma sınırına ulaştı.",
        "Der Projekt-Agent hat das Limit für Datei-Lesezugriffe erreicht.",
        "Ajana projeyê gihîşt sînora xwendina pelan.",
        "The project agent reached the file read limit."
      );
    }
    counters.fileReads += 1;
  }

  if (name === "write_project_file") {
    if (!access.canEditProjectFiles) {
      return makeMessage(
        "Planın proje dosyalarını düzenlemeye izin vermiyor.",
        "Dein Plan erlaubt keine Bearbeitung von Projektdateien.",
        "Plana te destûrê nade guhartina pelên projeyê.",
        "Your plan does not allow editing project files."
      );
    }

    if (counters.fileWrites >= access.maxProjectFileWrites) {
      return makeMessage(
        "Proje ajanı dosya yazma sınırına ulaştı.",
        "Der Projekt-Agent hat das Limit für Datei-Schreibzugriffe erreicht.",
        "Ajana projeyê gihîşt sînora nivîsandina pelan.",
        "The project agent reached the file write limit."
      );
    }
    counters.fileWrites += 1;
  }

  return "";
}

async function runAgenticResponse(params: {
  messages: Message[];
  language: string;
  deepResearchEnabled: boolean;
  tools: Array<Record<string, unknown>>;
  canWriteProjectFiles: boolean;
  access: ChatAccess;
  creditCost: number;
}) {
  const input: Array<Record<string, unknown>> = toInput(params.messages);
  const usage: TokenUsageAccumulator = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  };
  const toolCounters: ProjectAgentToolCounters = {
    fileReads: 0,
    fileWrites: 0,
    fileLists: 0,
  };
  let completedSteps = 0;
  let toolCallsTotal = 0;

  for (let step = 0; step < params.access.maxAgentSteps; step += 1) {
    completedSteps = step + 1;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AGENT_MODEL,
        instructions: buildSystemPrompt(
          params.language,
          params.deepResearchEnabled,
          true
        ),
        input,
        tools: params.tools,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      const errorText = await readErrorText(response);
      throw new Error(errorText || "Agent request failed");
    }

    const data = (await response.json()) as ResponseData;
    addUsage(usage, data.usage);

    const output = Array.isArray(data.output) ? data.output : [];
    const toolCalls = output.filter((item) => item?.type === "function_call");
    toolCallsTotal += toolCalls.length;

    if (toolCalls.length === 0) {
      return {
        text: collectOutputText(data) || "İşlem tamamlandı.",
        usage: {
          mode: "project_agent" as const,
          creditCost: params.creditCost,
          steps: completedSteps,
          toolCalls: toolCallsTotal,
          ...usage,
        },
      };
    }

    input.push(...output);

    for (const call of toolCalls) {
      let toolArgs: Record<string, unknown> = {};

      try {
        toolArgs = call.arguments ? JSON.parse(call.arguments) : {};
      } catch {
        toolArgs = {};
      }

      const { runProjectAgentTool } = await import(
        "@/lib/server/project-agent-tools"
      );

      const toolName = String(call.name || "");
      const limitError = getProjectToolLimitError({
        name: toolName,
        counters: toolCounters,
        access: params.access,
        language: params.language,
      });

      const result = limitError
        ? {
            ok: false,
            error: limitError,
          }
        : await runProjectAgentTool(
            toolName,
            toolArgs,
            params.canWriteProjectFiles
          );

      input.push({
        type: "function_call_output",
        call_id: call.call_id,
        output: truncateForModel(result, params.access.maxToolOutputChars),
      });

      if (!result.ok) {
        const friendly =
          params.language === "tr"
            ? `Araç hatası: ${result.error || "Bilinmeyen hata"}`
            : params.language === "de"
            ? `Tool-Fehler: ${result.error || "Unbekannter Fehler"}`
            : params.language === "ku"
            ? `Çewtiya amûrê: ${result.error || "Çewtiya nenas"}`
            : `Tool error: ${result.error || "Unknown error"}`;

        input.push({
          role: "assistant",
          content: [{ type: "output_text", text: friendly }],
        });
      }
    }
  }

  return {
    text:
      params.language === "tr"
        ? "Ajan araç döngüsü sınırına ulaştı. Görevi daha küçük adımlarla yeniden dene."
        : params.language === "de"
        ? "Die Agenten-Schleife hat das Limit erreicht. Bitte versuche die Aufgabe in kleineren Schritten erneut."
        : params.language === "ku"
        ? "Dora amûrên ajanê gihîşt sînorê xwe. Ji kerema xwe bi gavên piçûktir dîsa biceribîne."
        : "The agent tool loop hit its limit. Try the task again in smaller steps.",
    usage: {
      mode: "project_agent" as const,
      creditCost: params.creditCost,
      steps: completedSteps,
      toolCalls: toolCallsTotal,
      ...usage,
    },
  };
}

export async function POST(req: Request) {
  let language = "tr";
  let chargedUserId: string | null = null;
  let chargedAmount = 0;
  let projectAgentDailyChargedUserId: string | null = null;

  try {
    if (!OPENAI_API_KEY) {
      return createSseTextResponse(
        language === "tr"
          ? "Missing OPENAI_API_KEY. API ayarını kontrol et."
          : "Missing OPENAI_API_KEY. Check your API configuration.",
        200
      );
    }

    const body = await req.json();

    const messages = Array.isArray(body?.messages)
      ? (body.messages as Message[])
      : [];

    language = typeof body?.language === "string" ? body.language : "tr";

    const enableLiveWeb = body?.enableLiveWeb === true;
    const enableDeepResearch = body?.enableDeepResearch === true;
    const enableProjectAgent = body?.enableProjectAgent === true;
    const rawUsageMode = getUsageMode({
      liveWebEnabled: enableLiveWeb,
      deepResearchEnabled: enableDeepResearch,
      projectAgentEnabled: enableProjectAgent,
    });

    const usageSession = await resolveUsageSession(req);

    if (!usageSession) {
      return createSseTextResponse(getLoginRequiredMessage(language), 200, {
        mode: rawUsageMode,
        creditCost: 0,
      });
    }

    const planCode = usageSession.planInfo.plan;
    const access = getChatAccess(planCode);

    const webUsageCount =
      typeof body?.webUsageCount === "number" ? body.webUsageCount : 0;

    const liveWebLimitReached =
      enableLiveWeb &&
      access.canUseLiveWeb &&
      webUsageCount >= access.maxWebQueriesPerThread;
    const liveWebEnabled =
      enableLiveWeb && access.canUseLiveWeb && !liveWebLimitReached;
    const deepResearchEnabled = enableDeepResearch && access.canUseDeepResearch;
    const projectAgentEnabled = enableProjectAgent && access.canUseProjectAgent;
    const usageMode = getUsageMode({
      liveWebEnabled,
      deepResearchEnabled,
      projectAgentEnabled,
    });

    if (
      liveWebLimitReached &&
      !deepResearchEnabled &&
      !projectAgentEnabled
    ) {
      return createSseTextResponse(
        getWebLimitMessage(language, access.maxWebQueriesPerThread),
        200,
        {
          mode: "live_web",
          creditCost: 0,
        }
      );
    }

    if (projectAgentEnabled) {
      const dailyUsage = await tryConsumeProjectAgentDailyUsage(
        usageSession.userId,
        access.projectAgentDailyLimit
      );

      if (!dailyUsage.ok) {
        return createSseTextResponse(
          getProjectAgentDailyLimitMessage(language, dailyUsage.limit),
          200,
          {
            mode: "project_agent",
            creditCost: 0,
          }
        );
      }

      projectAgentDailyChargedUserId = usageSession.userId;
    }

    const creditCost = getChatCreditCost({
      liveWebEnabled,
      deepResearchEnabled,
      projectAgentEnabled,
      access,
    });

    const consumed = await tryConsumeUserCredits(
      usageSession.userId,
      creditCost
    );

    if (!consumed.ok) {
      if (projectAgentDailyChargedUserId) {
        await refundProjectAgentDailyUsage(projectAgentDailyChargedUserId);
        projectAgentDailyChargedUserId = null;
      }

      return createSseTextResponse(getCreditLimitMessage(language), 200, {
        mode: usageMode,
        creditCost: 0,
      });
    }

    chargedUserId = usageSession.userId;
    chargedAmount = creditCost;

    const tools: Array<Record<string, unknown>> = [];

    if (liveWebEnabled) {
      tools.push({
        type: "web_search",
      });
    }

    if (projectAgentEnabled) {
      tools.push(...buildProjectAgentTools(access.canEditProjectFiles));
    }

    console.log("AI chat tool config:", {
      model: projectAgentEnabled ? AGENT_MODEL : MODEL,
      language,
      planCode,
      liveWebEnabled,
      deepResearchEnabled,
      projectAgentEnabled,
      usageMode,
      webUsageCount,
      toolCount: tools.length,
      tools,
      originalMessageCount: messages.length,
      effectiveMessageCount: messages.slice(-MAX_HISTORY_MESSAGES).length,
    });

    if (projectAgentEnabled) {
      try {
        const agentResult = await runAgenticResponse({
          messages,
          language,
          deepResearchEnabled,
          tools,
          canWriteProjectFiles: access.canEditProjectFiles,
          access,
          creditCost,
        });

        return createSseTextResponse(agentResult.text, 200, agentResult.usage);
      } catch (error) {
        const rawError =
          error instanceof Error ? error.message : "Agent request failed";

        console.error("Agent mode failed:", rawError);

        if (chargedUserId && chargedAmount > 0) {
          await refundUserCredits(chargedUserId, chargedAmount);
          chargedUserId = null;
          chargedAmount = 0;
        }

        if (projectAgentDailyChargedUserId) {
          await refundProjectAgentDailyUsage(projectAgentDailyChargedUserId);
          projectAgentDailyChargedUserId = null;
        }

        return createSseTextResponse(
          getFriendlyErrorMessage(rawError, language),
          200,
          {
            mode: "project_agent",
            creditCost: 0,
          }
        );
      }
    }

    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        instructions: buildSystemPrompt(language, deepResearchEnabled, false),
        input: toInput(messages),
        tools,
        include: ["web_search_call.action.sources"],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const errorText = await readErrorText(upstream);

      console.error("Upstream AI error:", {
        status: upstream.status,
        statusText: upstream.statusText,
        body: errorText,
      });

      if (chargedUserId && chargedAmount > 0) {
        await refundUserCredits(chargedUserId, chargedAmount);
        chargedUserId = null;
        chargedAmount = 0;
      }

      return createSseTextResponse(
        getFriendlyErrorMessage(errorText || "Upstream AI request failed", language),
        200,
        {
          mode: usageMode,
          creditCost: 0,
        }
      );
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    if (chargedUserId && chargedAmount > 0) {
      try {
        await refundUserCredits(chargedUserId, chargedAmount);
      } catch (refundError) {
        console.error("Chat credit refund failed:", refundError);
      }
    }

    if (projectAgentDailyChargedUserId) {
      try {
        await refundProjectAgentDailyUsage(projectAgentDailyChargedUserId);
      } catch (refundError) {
        console.error("Project agent daily usage refund failed:", refundError);
      }
    }

    console.error("AI chat route failed:", error);

    const rawError =
      error instanceof Error ? error.message : "Chat request failed";

    return createSseTextResponse(getFriendlyErrorMessage(rawError, language), 200);
  }
}
