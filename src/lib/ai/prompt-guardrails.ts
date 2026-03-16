// lib/ai/prompt-guardrails.ts

export type PromptKind =
  | "logo_animation"
  | "text_animation"
  | "product"
  | "architecture"
  | "general";

export type PromptGuardrailResult = {
  kind: PromptKind;
  originalPrompt: string;
  safePrompt: string;
  isLogoLike: boolean;
  isTextLike: boolean;
};

function clean(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

export function analyzePromptKind(input: string): PromptGuardrailResult {
  const originalPrompt = clean(input);
  const lower = ` ${originalPrompt.toLowerCase()} `;

  const logoTerms = [
    " logo ",
    " brand ",
    " company name ",
    " company logo ",
    " wordmark ",
    " emblem ",
    " icon ",
    " duble-s ",
    " duble s ",
    " technology logo ",
    " marka ",
    " logo'su ",
    " logosu ",
    " amblem ",
  ];

  const textTerms = [
    " text ",
    " typography ",
    " letters ",
    " title ",
    " word ",
    " writing ",
    " yazı ",
    " harf ",
    " metin ",
    " kelime ",
  ];

  const productTerms = [
    " perfume ",
    " watch ",
    " cosmetic ",
    " bottle ",
    " shoe ",
    " bag ",
    " product ",
    " ürün ",
    " parfüm ",
    " saat ",
  ];

  const architectureTerms = [
    " building ",
    " tower ",
    " office ",
    " skyscraper ",
    " architecture ",
    " bina ",
    " kule ",
    " plaza ",
    " gökdelen ",
    " ofis ",
  ];

  const explosionTerms = [
    " explode ",
    " explosion ",
    " fire ",
    " burning ",
    " flames ",
    " patla",
    " alev ",
    " yan",
    " ateş ",
  ];

  const isLogoLike = includesAny(lower, logoTerms);
  const isTextLike = includesAny(lower, textTerms);
  const isProductLike = includesAny(lower, productTerms);
  const isArchitectureLike = includesAny(lower, architectureTerms);
  const hasExplosionLikeTerms = includesAny(lower, explosionTerms);

  if (isLogoLike) {
    return {
      kind: "logo_animation",
      originalPrompt,
      isLogoLike: true,
      isTextLike,
      safePrompt: clean(
        [
          "A clean premium cinematic logo reveal",
          "subtle light sweep",
          "soft particles",
          "glow accents",
          "dark elegant background",
          "slow camera movement",
          "high-end technology brand intro",
          "no explosion",
          "no fire",
          "no text distortion",
        ].join(", ")
      ),
    };
  }

  if (isTextLike) {
    return {
      kind: "text_animation",
      originalPrompt,
      isLogoLike,
      isTextLike: true,
      safePrompt: clean(
        [
          "A clean cinematic title reveal",
          "minimal elegant motion",
          "soft glow",
          "premium dark background",
          "subtle particles",
          "high-end commercial intro",
          "no explosion",
          "no fire",
          "no distortion",
        ].join(", ")
      ),
    };
  }

  if (isProductLike) {
    return {
      kind: "product",
      originalPrompt,
      isLogoLike,
      isTextLike,
      safePrompt: originalPrompt,
    };
  }

  if (isArchitectureLike && hasExplosionLikeTerms) {
    return {
      kind: "architecture",
      originalPrompt,
      isLogoLike,
      isTextLike,
      safePrompt: clean(
        [
          originalPrompt,
          "cinematic architectural reveal",
          "dramatic atmosphere",
          "controlled energy effects",
          "no destruction",
          "no collapsing structure",
          "premium commercial look",
        ].join(", ")
      ),
    };
  }

  if (isArchitectureLike) {
    return {
      kind: "architecture",
      originalPrompt,
      isLogoLike,
      isTextLike,
      safePrompt: originalPrompt,
    };
  }

  return {
    kind: "general",
    originalPrompt,
    isLogoLike,
    isTextLike,
    safePrompt: originalPrompt,
  };
}