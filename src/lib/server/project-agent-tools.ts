import { promises as fs } from "fs";
import path from "path";

const DEFAULT_SKIP_DIRS = new Set([
  ".git",
  ".next",
  "node_modules",
  "public/uploads",
  "coverage",
  "dist",
  "build",
]);

const TEXT_FILE_EXTENSIONS = new Set([
  ".css",
  ".env",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".sql",
  ".ts",
  ".tsx",
  ".txt",
  ".yml",
  ".yaml",
]);

export type ProjectAgentToolResult = {
  ok: boolean;
  error?: string;
  data?: unknown;
};

function getWorkspaceRoot() {
  if (process.env.NODE_ENV !== "production" && process.env.AGENT_WORKSPACE_ROOT) {
    return path.resolve(process.env.AGENT_WORKSPACE_ROOT);
  }

  return path.join(/*turbopackIgnore: true*/ process.cwd(), "src");
}

function normalizeRelativePath(inputPath: string) {
  return inputPath.replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

function resolveSafePath(inputPath: string) {
  const root = getWorkspaceRoot();
  const relativePath = normalizeRelativePath(inputPath);
  const absolutePath = path.resolve(root, relativePath);

  if (!absolutePath.startsWith(`${root}${path.sep}`) && absolutePath !== root) {
    throw new Error("Path is outside the allowed project workspace.");
  }

  return { root, relativePath, absolutePath };
}

function isProbablyTextFile(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_FILE_EXTENSIONS.has(ext) || path.basename(filePath).startsWith(".");
}

function shouldSkip(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/");
  return Array.from(DEFAULT_SKIP_DIRS).some(
    (dir) => normalized === dir || normalized.startsWith(`${dir}/`)
  );
}

async function walkFiles(
  directory: string,
  root: string,
  query: string,
  limit: number,
  results: string[]
) {
  if (results.length >= limit) return;

  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (results.length >= limit) break;

    const fullPath = path.join(directory, entry.name);
    const relativePath = path.relative(root, fullPath).replace(/\\/g, "/");

    if (shouldSkip(relativePath)) continue;

    if (entry.isDirectory()) {
      await walkFiles(fullPath, root, query, limit, results);
      continue;
    }

    if (!entry.isFile()) continue;
    if (query && !relativePath.toLowerCase().includes(query.toLowerCase())) {
      continue;
    }

    results.push(relativePath);
  }
}

export function isProjectAgentEnabled() {
  return (
    process.env.PROJECT_AGENT_ENABLED === "true" ||
    process.env.NODE_ENV !== "production"
  );
}

export async function listProjectFiles(params: {
  query?: string;
  limit?: number;
}): Promise<ProjectAgentToolResult> {
  try {
    const root = getWorkspaceRoot();
    const files: string[] = [];
    await walkFiles(root, root, params.query || "", params.limit || 80, files);

    return {
      ok: true,
      data: {
        root,
        files,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to list files.",
    };
  }
}

export async function readProjectFile(params: {
  path: string;
  maxBytes?: number;
}): Promise<ProjectAgentToolResult> {
  try {
    const { relativePath, absolutePath } = resolveSafePath(params.path);

    if (!isProbablyTextFile(absolutePath)) {
      throw new Error("Only text/code files can be read by the project agent.");
    }

    const stat = await fs.stat(absolutePath);
    const maxBytes = params.maxBytes || 120_000;

    if (stat.size > maxBytes) {
      throw new Error(`File is too large. Limit is ${maxBytes} bytes.`);
    }

    const content = await fs.readFile(absolutePath, "utf8");

    return {
      ok: true,
      data: {
        path: relativePath,
        content,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to read file.",
    };
  }
}

export async function writeProjectFile(params: {
  path: string;
  content: string;
}): Promise<ProjectAgentToolResult> {
  try {
    const { relativePath, absolutePath } = resolveSafePath(params.path);

    if (!isProbablyTextFile(absolutePath)) {
      throw new Error("Only text/code files can be written by the project agent.");
    }

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, params.content, "utf8");

    return {
      ok: true,
      data: {
        path: relativePath,
        bytes: Buffer.byteLength(params.content, "utf8"),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to write file.",
    };
  }
}

export async function runProjectAgentTool(
  name: string,
  params: Record<string, unknown>,
  canWrite: boolean
): Promise<ProjectAgentToolResult> {
  if (!isProjectAgentEnabled()) {
    return {
      ok: false,
      error:
        "Project agent file access is disabled. Set PROJECT_AGENT_ENABLED=true in a trusted sandbox to enable it.",
    };
  }

  if (name === "list_project_files") {
    return listProjectFiles({
      query: typeof params.query === "string" ? params.query : undefined,
      limit: typeof params.limit === "number" ? params.limit : undefined,
    });
  }

  if (name === "read_project_file") {
    return readProjectFile({
      path: String(params.path || ""),
      maxBytes: typeof params.maxBytes === "number" ? params.maxBytes : undefined,
    });
  }

  if (name === "write_project_file") {
    if (!canWrite) {
      return {
        ok: false,
        error: "Your plan does not allow editing project files.",
      };
    }

    return writeProjectFile({
      path: String(params.path || ""),
      content: String(params.content || ""),
    });
  }

  return {
    ok: false,
    error: `Unknown project agent tool: ${name}`,
  };
}
