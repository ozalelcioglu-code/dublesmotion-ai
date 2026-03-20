type PlanType = "free" | "starter" | "pro" | "agency";

export type StoryboardScene = {
  title: string;
  prompt: string;
  durationSec: number;
};

function getSceneCount(plan: PlanType, durationSec: number) {
  if (plan === "free") return 1;

  if (plan === "starter") {
    if (durationSec >= 20) return 3;
    if (durationSec >= 10) return 2;
    return 1;
  }

  if (plan === "pro" || plan === "agency") {
    if (durationSec >= 30) return 4;
    if (durationSec >= 20) return 3;
    return 2;
  }

  return 1;
}

function distributeDurations(total: number, count: number): number[] {
  if (count === 1) return [total];

  if (total <= 10 && count === 2) return [5, 5];
  if (total <= 20 && count === 3) return [6, 7, 7];
  if (total <= 30 && count === 4) return [7, 7, 8, 8];

  const base = Math.floor(total / count);
  const remainder = total % count;

  return Array.from({ length: count }).map((_, i) =>
    base + (i < remainder ? 1 : 0)
  );
}

function getFallbackTitles(sceneCount: number) {
  if (sceneCount === 1) return ["Hero"];
  if (sceneCount === 2) return ["Hook", "Payoff"];
  if (sceneCount === 3) return ["Hook", "Build", "Payoff"];
  return ["Hook", "Problem / Desire", "Solution / Proof", "CTA"];
}

function fallbackStoryboard(
  prompt: string,
  sceneCount: number,
  durations: number[]
): StoryboardScene[] {
  const clean = prompt.trim();
  const titles = getFallbackTitles(sceneCount);

  if (sceneCount === 1) {
    return [
      {
        title: titles[0],
        durationSec: durations[0],
        prompt:
          `${clean}, premium hero shot, instant attention, strong visual impact, ` +
          `clear subject focus, polished cinematic composition, commercial-quality final result`,
      },
    ];
  }

  if (sceneCount === 2) {
    return [
      {
        title: titles[0],
        durationSec: durations[0],
        prompt:
          `${clean}, high-impact opening hook, scroll-stopping first frame, ` +
          `same subject and same visual world, premium lighting, cinematic ad energy`,
      },
      {
        title: titles[1],
        durationSec: durations[1],
        prompt:
          `${clean}, strong payoff ending, same subject continuity, premium final reveal, ` +
          `clean composition, memorable finish, commercial-quality closing shot`,
      },
    ];
  }

  if (sceneCount === 3) {
    return [
      {
        title: titles[0],
        durationSec: durations[0],
        prompt:
          `${clean}, attention-grabbing opening hook, same subject, same environment, ` +
          `scroll-stopping composition, premium cinematic ad opening`,
      },
      {
        title: titles[1],
        durationSec: durations[1],
        prompt:
          `${clean}, story development, same subject continues naturally, ` +
          `show motion, value, transformation or emotional progression, premium continuity`,
      },
      {
        title: titles[2],
        durationSec: durations[2],
        prompt:
          `${clean}, strong final payoff, satisfying resolution, same subject and world, ` +
          `high-end commercial finish, emotionally memorable ending`,
      },
    ];
  }

  return [
    {
      title: titles[0],
      durationSec: durations[0],
      prompt:
        `${clean}, viral ad hook, stop-the-scroll opening, immediate attention, ` +
        `same subject and environment, premium composition`,
    },
    {
      title: titles[1],
      durationSec: durations[1],
      prompt:
        `${clean}, show the desire, problem, tension, or need, same subject continuity, ` +
        `same visual world, stronger motion and emotional engagement`,
    },
    {
      title: titles[2],
      durationSec: durations[2],
      prompt:
        `${clean}, show the solution, transformation, benefit, or proof, ` +
        `same subject identity, polished premium reveal, cinematic clarity`,
    },
    {
      title: titles[3],
      durationSec: durations[3],
      prompt:
        `${clean}, final branded payoff, premium call-to-action energy, ` +
        `same subject and world, elegant commercial ending frame`,
    },
  ];
}

function normalizeScenes(
  rawScenes: any[],
  sceneCount: number,
  durations: number[],
  fallbackPrompt: string
): StoryboardScene[] {
  const titles = getFallbackTitles(sceneCount);

  const normalized = rawScenes
    .map((scene, index) => ({
      title:
        typeof scene?.title === "string" && scene.title.trim()
          ? scene.title.trim()
          : titles[index] || `Scene ${index + 1}`,
      prompt:
        typeof scene?.prompt === "string" && scene.prompt.trim()
          ? scene.prompt.trim()
          : `${fallbackPrompt}, scene ${index + 1}`,
      durationSec: durations[index],
    }))
    .slice(0, sceneCount);

  return normalized;
}

export async function generateStoryboard(input: {
  prompt: string;
  plan: PlanType;
  totalDurationSec: number;
}): Promise<StoryboardScene[]> {
  const { prompt, plan, totalDurationSec } = input;

  const sceneCount = getSceneCount(plan, totalDurationSec);
  const durations = distributeDurations(totalDurationSec, sceneCount);

  if (!process.env.OPENAI_API_KEY) {
    return fallbackStoryboard(prompt, sceneCount, durations);
  }

  try {
    const structure =
      sceneCount === 1
        ? "hero"
        : sceneCount === 2
        ? "hook -> payoff"
        : sceneCount === 3
        ? "hook -> build -> payoff"
        : "hook -> desire/problem -> solution/proof -> CTA";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.8,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a world-class storyboard director for viral ads and premium AI videos. " +
              "Transform any user prompt in any language into a connected sequence of scenes for a short-form commercial video. " +
              "All scenes must keep the same main subject, same world, same identity, same visual language, and strong continuity. " +
              "The scenes should feel like a high-converting short ad or premium social video. " +
              "Write prompts in English for best image/video model performance. " +
              'Return valid JSON only in this exact format: {"scenes":[{"title":"...","prompt":"..."}]}',
          },
          {
            role: "user",
            content:
              `Create a ${sceneCount}-scene storyboard for this idea:\n${prompt}\n\n` +
              `Video requirements:\n` +
              `- Total duration: ${totalDurationSec} seconds\n` +
              `- Structure: ${structure}\n` +
              `- Keep the same main subject in every scene\n` +
              `- Keep the same world, same styling, same environment logic\n` +
              `- Strong continuity from one scene to the next\n` +
              `- Make it feel premium, ad-ready, and visually compelling\n` +
              `- Avoid repetitive scenes\n` +
              `- Each scene should have a clear purpose in the narrative`,
          },
        ],
      }),
    });

    if (!res.ok) {
      return fallbackStoryboard(prompt, sceneCount, durations);
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;

    if (!content) {
      return fallbackStoryboard(prompt, sceneCount, durations);
    }

    const parsed = JSON.parse(content);
    const scenes = Array.isArray(parsed?.scenes) ? parsed.scenes : [];

    const normalized = normalizeScenes(
      scenes,
      sceneCount,
      durations,
      prompt
    );

    if (!normalized.length) {
      return fallbackStoryboard(prompt, sceneCount, durations);
    }

    return normalized;
  } catch {
    return fallbackStoryboard(prompt, sceneCount, durations);
  }
}