import { NextResponse } from "next/server";
import { POST as generatePost } from "@/app/api/generate/route";
import {
  markDeveloperApiKeyUsed,
  validateDeveloperApiKey,
} from "@/lib/server/developer-api-keys";
import {
  createInternalApiBillingSignature,
  getDeveloperApiPriceForMode,
  refundDeveloperApiUsage,
  reserveDeveloperApiUsage,
} from "@/lib/server/developer-api-billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function readBearerToken(req: Request) {
  const authorization = req.headers.get("authorization") || "";
  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  return req.headers.get("x-api-key")?.trim() || "";
}

export async function POST(req: Request) {
  let chargedCents = 0;
  let usageId: string | null = null;
  let requestMode: string | null = null;
  let apiKeyContext: Awaited<ReturnType<typeof validateDeveloperApiKey>> = null;
  let refunded = false;
  let shouldRefundOnCatch = true;

  try {
    const token = readBearerToken(req);
    const apiKey = token ? await validateDeveloperApiKey(token) : null;
    apiKeyContext = apiKey;

    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid or missing API key",
        },
        { status: 401 }
      );
    }

    if (!apiKey.scopes.includes("generate")) {
      return NextResponse.json(
        {
          ok: false,
          error: "API key does not have generate scope",
        },
        { status: 403 }
      );
    }

    const body = await req.text();
    const parsedBody = JSON.parse(body || "{}") as {
      mode?: string;
      preview?: boolean;
    };
    requestMode = typeof parsedBody.mode === "string" ? parsedBody.mode : null;
    chargedCents = getDeveloperApiPriceForMode(
      requestMode || undefined,
      parsedBody.preview === true
    );

    const usage = await reserveDeveloperApiUsage({
      userId: apiKey.userId,
      email: apiKey.email,
      apiKeyId: apiKey.id,
      amountCents: chargedCents,
      requestMode,
      metadata: {
        endpoint: "/api/v1/generate",
      },
    });

    if (!usage.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: "API_BALANCE_REQUIRED",
          error: "API balance is not enough for this request.",
          apiBilling: {
            chargedCents,
            balanceCents: usage.wallet?.balanceCents ?? 0,
          },
        },
        { status: 402 }
      );
    }

    usageId = usage.usageId;

    const headers = new Headers(req.headers);
    headers.set("Content-Type", "application/json");
    headers.set("x-user-id", apiKey.userId);
    headers.set("x-user-email", apiKey.email);
    headers.set("x-user-name", apiKey.email.split("@")[0] || "API User");
    headers.set("x-api-key-id", apiKey.id);
    headers.set("x-api-wallet-billing", "true");
    headers.set(
      "x-dms-internal-api-billing",
      createInternalApiBillingSignature(apiKey.id)
    );
    headers.delete("authorization");
    headers.delete("x-api-key");

    const forwardedRequest = new Request(req.url, {
      method: "POST",
      headers,
      body,
    });

    const response = await generatePost(forwardedRequest);

    if (response.ok) {
      await markDeveloperApiKeyUsed(apiKey.id);
      shouldRefundOnCatch = false;
    } else if (chargedCents > 0) {
      await refundDeveloperApiUsage({
        userId: apiKey.userId,
        email: apiKey.email,
        apiKeyId: apiKey.id,
        usageId,
        amountCents: chargedCents,
        requestMode,
        description: "API generation failed before completion",
      });
      refunded = true;
    }

    const responseText = await response.text();
    const responseData = responseText
      ? JSON.parse(responseText)
      : { ok: response.ok };

    if (!response.ok) {
      return NextResponse.json(responseData, { status: response.status });
    }

    return NextResponse.json(
      {
        ...responseData,
        apiBilling: {
          chargedCents,
          balanceCents: usage.wallet?.balanceCents ?? null,
          usageId,
        },
      },
      { status: response.status }
    );
  } catch (error: unknown) {
    if (apiKeyContext && chargedCents > 0 && !refunded && shouldRefundOnCatch) {
      try {
        await refundDeveloperApiUsage({
          userId: apiKeyContext.userId,
          email: apiKeyContext.email,
          apiKeyId: apiKeyContext.id,
          usageId,
          amountCents: chargedCents,
          requestMode,
          description: "API generation failed with exception",
        });
      } catch (refundError) {
        console.error("Developer API refund failed:", refundError);
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Developer API request failed",
      },
      { status: 500 }
    );
  }
}
