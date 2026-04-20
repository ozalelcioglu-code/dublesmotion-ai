export type ChatMessageRole = "user" | "assistant" | "system";

export type ChatAttachmentType = "image" | "file" | "audio";

export type ChatAttachment = {
  id: string;
  type: ChatAttachmentType;
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
};

export type ChatGenerationResult = {
  kind: "image" | "video" | "audio";
  title: string;
  url: string;
  prompt?: string;
  thumbnailUrl?: string;
  durationSec?: number | null;
};

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
  attachments?: ChatAttachment[];
  generation?: ChatGenerationResult;
  liked?: boolean | null;
};

export type ChatThread = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
};

const THREADS_KEY_PREFIX = "dubles_chat_threads_v4_";
const ACTIVE_THREAD_KEY_PREFIX = "dubles_active_chat_thread_v1_";

function getUserScopedKey(prefix: string, email?: string | null) {
  return `${prefix}${email || "guest"}`;
}

export function createChatThreadStorageKey(email?: string | null) {
  return getUserScopedKey(THREADS_KEY_PREFIX, email);
}

export function createActiveChatThreadStorageKey(email?: string | null) {
  return getUserScopedKey(ACTIVE_THREAD_KEY_PREFIX, email);
}

export function createId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createMessage(
  role: ChatMessageRole,
  content: string,
  attachments?: ChatAttachment[],
  generation?: ChatGenerationResult
): ChatMessage {
  return {
    id: createId("msg"),
    role,
    content,
    createdAt: new Date().toISOString(),
    attachments: attachments?.length ? attachments : undefined,
    generation,
    liked: null,
  };
}

export function buildThreadTitleFromText(text: string, maxLength = 48) {
  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(/[\r\n]+/g, " ")
    .trim();

  if (!cleaned) return "Yeni sohbet";
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength).trim()}...`;
}

export function createThreadFromFirstMessage(firstUserMessage: ChatMessage): ChatThread {
  const title = buildThreadTitleFromText(firstUserMessage.content);

  return {
    id: createId("thread"),
    title,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [firstUserMessage],
  };
}

export function readThreads(email?: string | null): ChatThread[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(createChatThreadStorageKey(email));
    if (!raw) return [];

    const parsed = JSON.parse(raw) as ChatThread[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((thread) => thread && typeof thread.id === "string")
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  } catch {
    return [];
  }
}

export function writeThreads(threads: ChatThread[], email?: string | null) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      createChatThreadStorageKey(email),
      JSON.stringify(threads)
    );
  } catch {
    // no-op
  }
}

export function readActiveThreadId(email?: string | null): string | null {
  if (typeof window === "undefined") return null;

  try {
    return (
      window.localStorage.getItem(createActiveChatThreadStorageKey(email)) || null
    );
  } catch {
    return null;
  }
}

export function writeActiveThreadId(threadId: string | null, email?: string | null) {
  if (typeof window === "undefined") return;

  try {
    const key = createActiveChatThreadStorageKey(email);

    if (!threadId) {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(key, threadId);
  } catch {
    // no-op
  }
}

export function upsertThread(thread: ChatThread, email?: string | null) {
  const threads = readThreads(email);
  const existingIndex = threads.findIndex((item) => item.id === thread.id);

  const nextThread: ChatThread = {
    ...thread,
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    threads[existingIndex] = nextThread;
  } else {
    threads.unshift(nextThread);
  }

  const sorted = threads.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  writeThreads(sorted, email);
  writeActiveThreadId(nextThread.id, email);

  return sorted;
}

export function deleteThread(threadId: string, email?: string | null) {
  const threads = readThreads(email);
  const filtered = threads.filter((thread) => thread.id !== threadId);

  writeThreads(filtered, email);

  const activeThreadId = readActiveThreadId(email);
  if (activeThreadId === threadId) {
    writeActiveThreadId(filtered[0]?.id || null, email);
  }

  return filtered;
}

export function findThreadById(threadId: string, email?: string | null) {
  const threads = readThreads(email);
  return threads.find((thread) => thread.id === threadId) || null;
}

export function appendMessagesToThread(
  threadId: string,
  messages: ChatMessage[],
  email?: string | null
) {
  const threads = readThreads(email);
  const threadIndex = threads.findIndex((thread) => thread.id === threadId);

  if (threadIndex < 0) return null;

  const target = threads[threadIndex];
  const nextThread: ChatThread = {
    ...target,
    messages: [...target.messages, ...messages],
    updatedAt: new Date().toISOString(),
  };

  threads[threadIndex] = nextThread;
  writeThreads(threads, email);
  writeActiveThreadId(nextThread.id, email);

  return nextThread;
}

export function replaceThreadMessages(
  threadId: string,
  messages: ChatMessage[],
  email?: string | null
) {
  const threads = readThreads(email);
  const threadIndex = threads.findIndex((thread) => thread.id === threadId);

  if (threadIndex < 0) return null;

  const target = threads[threadIndex];
  const nextThread: ChatThread = {
    ...target,
    messages,
    updatedAt: new Date().toISOString(),
  };

  threads[threadIndex] = nextThread;
  writeThreads(threads, email);

  return nextThread;
}

export function updateThreadTitle(
  threadId: string,
  title: string,
  email?: string | null
) {
  const threads = readThreads(email);
  const threadIndex = threads.findIndex((thread) => thread.id === threadId);

  if (threadIndex < 0) return null;

  const nextThread: ChatThread = {
    ...threads[threadIndex],
    title: title.trim() || threads[threadIndex].title,
    updatedAt: new Date().toISOString(),
  };

  threads[threadIndex] = nextThread;
  writeThreads(threads, email);

  return nextThread;
}
