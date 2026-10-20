/**
 * Clintoy's image engine.
 *
 * Local mode: a deterministic, seeded generative-art renderer. No API key,
 * no network call — every prompt maps to a unique abstract composition built
 * from gradients, layered blobs and shapes derived from a hash of the text.
 * Cloud mode: if OPENAI_API_KEY is configured, real photographic/illustrative
 * images are generated through the OpenAI Images API instead.
 */

import { InferenceClient } from "@huggingface/inference";

export type ImageResult = {
  dataUrl: string;
  engine: "cloud" | "local";
  caption: string;
};

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTES: [string, string, string, string][] = [
  ["#ff6b6b", "#ffd166", "#06d6a0", "#118ab2"],
  ["#f72585", "#7209b7", "#3a0ca3", "#4cc9f0"],
  ["#ef476f", "#ffd166", "#06d6a0", "#073b4c"],
  ["#fb8500", "#ffb703", "#219ebc", "#023047"],
  ["#e76f51", "#f4a261", "#2a9d8f", "#264653"],
  ["#amber", "#ff9f1c", "#2ec4b6", "#011627"],
  ["#ff006e", "#fb5607", "#ffbe0b", "#3a86ff"],
  ["#06d6a0", "#118ab2", "#073b4c", "#ef476f"],
];

function pickPalette(random: () => number): [string, string, string, string] {
  const palette = PALETTES[Math.floor(random() * PALETTES.length)];
  return palette[0] === "#amber" ? ["#ffb703", "#fb8500", "#023047", "#219ebc"] : palette;
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrapCaption(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
    if (lines.length === 2) break;
  }
  if (line && lines.length < 2) lines.push(line);
  return lines;
}

function renderLocalSvg(prompt: string): string {
  const seed = hashString(prompt.toLowerCase().trim() || "clintoy");
  const random = mulberry32(seed);
  const [a, b, c, d] = pickPalette(random);
  const size = 768;
  const shapeCount = 5 + Math.floor(random() * 4);

  const defs = `
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${a}" />
      <stop offset="100%" stop-color="${c}" />
    </linearGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="${18 + random() * 20}" /></filter>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
      <feComponentTransfer><feFuncA type="linear" slope="0.05" /></feComponentTransfer>
      <feComposite operator="over" in2="SourceGraphic" />
    </filter>
  `;

  const shapes: string[] = [];
  for (let i = 0; i < shapeCount; i += 1) {
    const palette = [a, b, c, d];
    const fill = palette[Math.floor(random() * palette.length)];
    const cx = random() * size;
    const cy = random() * size;
    const r = 80 + random() * 220;
    const opacity = (0.35 + random() * 0.4).toFixed(2);
    if (random() > 0.5) {
      shapes.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" opacity="${opacity}" filter="url(#soft)" />`);
    } else {
      const rot = (random() * 360).toFixed(1);
      const w = r * (1.2 + random());
      const h = r * (0.6 + random() * 0.8);
      shapes.push(
        `<rect x="${(cx - w / 2).toFixed(1)}" y="${(cy - h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${(h / 3).toFixed(1)}" fill="${fill}" opacity="${opacity}" filter="url(#soft)" transform="rotate(${rot} ${cx.toFixed(1)} ${cy.toFixed(1)})" />`,
      );
    }
  }

  // A few thin arcs/lines for structure
  const lineCount = 2 + Math.floor(random() * 3);
  for (let i = 0; i < lineCount; i += 1) {
    const x1 = random() * size;
    const y1 = random() * size;
    const x2 = random() * size;
    const y2 = random() * size;
    shapes.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${d}" stroke-width="${(1 + random() * 2).toFixed(1)}" opacity="0.35" stroke-linecap="round" />`,
    );
  }

  const captionLines = wrapCaption(prompt.trim(), 34);
  const captionSvg = captionLines
    .map(
      (line, index) =>
        `<text x="32" y="${size - 56 + index * 30}" font-family="Inter, system-ui, sans-serif" font-size="22" font-weight="600" fill="rgba(255,255,255,0.92)" style="paint-order: stroke; stroke: rgba(0,0,0,0.35); stroke-width: 6px;">${escapeXml(line)}</text>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <defs>${defs}</defs>
    <rect width="${size}" height="${size}" fill="url(#bg)" />
    ${shapes.join("\n")}
    <rect width="${size}" height="${size}" filter="url(#grain)" opacity="0.5" />
    <rect x="0" y="${size - 108}" width="${size}" height="108" fill="rgba(0,0,0,0.28)" />
    ${captionSvg}
    <text x="${size - 18}" y="30" text-anchor="end" font-family="Inter, system-ui, sans-serif" font-size="14" font-weight="700" letter-spacing="2" fill="rgba(255,255,255,0.75)">CLINTOY · LOCAL</text>
  </svg>`;
}

function svgToDataUrl(svg: string) {
  const base64 = Buffer.from(svg, "utf-8").toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

async function generateWithOpenAI(prompt: string, apiKey: string): Promise<ImageResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1",
        prompt,
        size: "1024x1024",
        n: 1,
      }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { data?: { b64_json?: string; url?: string }[] };
    const first = data.data?.[0];
    if (first?.b64_json) {
      return { dataUrl: `data:image/png;base64,${first.b64_json}`, engine: "cloud", caption: prompt };
    }
    if (first?.url) {
      const imageResponse = await fetch(first.url);
      if (!imageResponse.ok) return null;
      const buffer = Buffer.from(await imageResponse.arrayBuffer());
      return { dataUrl: `data:image/png;base64,${buffer.toString("base64")}`, engine: "cloud", caption: prompt };
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function generateWithHuggingFace(prompt: string, token: string): Promise<ImageResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  try {
    const client = new InferenceClient(token);
    const imageBlob = await client.textToImage({
      provider: "auto",
      model: process.env.HF_IMAGE_MODEL ?? "black-forest-labs/FLUX.1-schnell",
      inputs: prompt,
      parameters: { num_inference_steps: 5 },
    }, { signal: controller.signal });

    const buffer = Buffer.from(await imageBlob.arrayBuffer());
    if (buffer.length === 0) return null;

    const mimeType = imageBlob.type || "image/jpeg";
    if (!mimeType.startsWith("image/")) return null;

    return {
      dataUrl: `data:${mimeType};base64,${buffer.toString("base64")}`,
      engine: "cloud",
      caption: prompt,
    };
  } catch (error) {
    console.error(
      "Hugging Face image generation failed:",
      error instanceof Error ? error.message : "Unknown provider error"
    );
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function generateWithCloudflare(
  prompt: string,
  accountId: string,
  token: string,
): Promise<ImageResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, steps: 4 }),
      },
    );

    const data = (await response.json().catch(() => null)) as {
      success?: boolean;
      result?: { image?: string };
      errors?: { code?: number; message?: string }[];
    } | null;

    if (!response.ok || !data?.success || !data.result?.image) {
      console.error(
        "Cloudflare image generation failed:",
        response.status,
        data?.errors?.map((item) => item.message).join("; ") || "No image returned",
      );
      return null;
    }

    return {
      dataUrl: `data:image/jpeg;base64,${data.result.image}`,
      engine: "cloud",
      caption: prompt,
    };
  } catch (error) {
    console.error(
      "Cloudflare image generation failed:",
      error instanceof Error ? error.message : "Unknown provider error",
    );
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
export async function generateImage(rawPrompt: string): Promise<ImageResult> {
  const prompt = rawPrompt.trim().slice(0, 600) || "an abstract idea";

  // Try Cloudflare FLUX first because this provider was tested successfully.
  const cfAccount = process.env.CF_ACCOUNT_ID;
  const cfToken = process.env.CF_API_TOKEN;

  if (cfAccount && cfToken) {
    const cfResult = await generateWithCloudflare(prompt, cfAccount, cfToken);
    if (cfResult) return cfResult;
  }

  // Keep the existing providers as backups.
  const hfToken = process.env.HF_TOKEN;
  if (hfToken) {
    const hfResult = await generateWithHuggingFace(prompt, hfToken);
    if (hfResult) return hfResult;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    const cloudResult = await generateWithOpenAI(prompt, apiKey);
    if (cloudResult) return cloudResult;
  }

  // Preserve the original local fallback if all cloud providers fail.
  console.warn("All configured cloud image providers failed; using local artwork.");
  return {
    dataUrl: svgToDataUrl(renderLocalSvg(prompt)),
    engine: "local",
    caption: prompt,
  };
}

export function imageEngineStatus() {
  return {
    cloud: Boolean((process.env.CF_ACCOUNT_ID && process.env.CF_API_TOKEN) || process.env.HF_TOKEN || process.env.OPENAI_API_KEY),
  };
}
