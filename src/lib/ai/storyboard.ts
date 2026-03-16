type StoryboardScene = {
  title: string;
  prompt: string;
};

function safeFallbackStoryboard(prompt: string, sceneCount: number): StoryboardScene[] {
  const scenes: StoryboardScene[] = [
    {
      title: "Scene 1",
      prompt: `${prompt}, opening scene, establish the subject and environment`,
    },
    {
      title: "Scene 2",
      prompt: `${prompt}, middle scene, continue the same story with stronger action`,
    },
    {
      title: "Scene 3",
      prompt: `${prompt}, final scene, emotional or cinematic ending`,
    },
    {
      title: "Scene 4",
      prompt: `${prompt}, final closing beat, polished resolution`,
    },
  ];

  return scenes.slice(0, sceneCount);
}

export async function generateStoryboard(
  prompt: string,
  sceneCount: number
): Promise<StoryboardScene[]> {
  if (!process.env.OPENAI_API_KEY) {
    return safeFallbackStoryboard(prompt, sceneCount);
  }

  try {
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
              "You are a cinematic storyboard writer. Create a short sequence of connected scenes. Output valid JSON with this shape: { \"scenes\": [{\"title\":\"...\",\"prompt\":\"...\"}] }. Each scene must continue the previous scene. Keep the same subject, same world, and a clear beginning-middle-end progression. Do not include markdown.",
          },
          {
            role: "user",
            content: `Create ${sceneCount} connected scenes for this video idea: ${prompt}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      return safeFallbackStoryboard(prompt, sceneCount);
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;

    if (!content) {
      return safeFallbackStoryboard(prompt, sceneCount);
    }

    const parsed = JSON.parse(content);
    const scenes = Array.isArray(parsed?.scenes) ? parsed.scenes : [];

    const normalized = scenes
      .map((scene: any, index: number) => ({
        title:
          typeof scene?.title === "string" && scene.title.trim()
            ? scene.title.trim()
            : `Scene ${index + 1}`,
        prompt:
          typeof scene?.prompt === "string" && scene.prompt.trim()
            ? scene.prompt.trim()
            : `${prompt}, scene ${index + 1}`,
      }))
      .slice(0, sceneCount);

    if (!normalized.length) {
      return safeFallbackStoryboard(prompt, sceneCount);
    }

    return normalized;
  } catch {
    return safeFallbackStoryboard(prompt, sceneCount);
  }
}