import OpenAI from "openai";
import { PERSONAL_BANNER_HEIGHT, PERSONAL_BANNER_WIDTH, ImageModelId } from "@/types/banner";

const DESIGN_W = PERSONAL_BANNER_WIDTH;
const DESIGN_H = PERSONAL_BANNER_HEIGHT;

const hashFromNonce = (nonce?: string): number => {
  if (!nonce) {
    return 1;
  }

  let hash = 0;
  for (let index = 0; index < nonce.length; index += 1) {
    hash = (hash << 5) - hash + nonce.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash) + 1;
};

const createFallbackBase = async (regenerateNonce: string | undefined, outWidth: number, outHeight: number): Promise<Buffer> => {
  const hash = hashFromNonce(regenerateNonce);
  const variant = hash % 5;
  const hueA = 200 + (hash % 40);
  const hueB = 220 + (hash % 35);
  const hueC = 245 + (hash % 25);
  const circleOneX = 980 + (hash % 420);
  const circleOneY = 70 + (hash % 120);
  const circleTwoX = 1120 + (hash % 380);
  const circleTwoY = 180 + (hash % 170);
  const circleThreeX = 1300 + (hash % 240);
  const circleThreeY = 230 + (hash % 140);
  const polygonOffset = 20 + (hash % 120);
  const stripeOffset = 120 + (hash % 340);

  const patternLayer = (() => {
    switch (variant) {
      case 0:
        return `
          <circle cx="${circleOneX}" cy="${circleOneY}" r="170" fill="rgba(191,219,254,0.14)" />
          <circle cx="${circleTwoX}" cy="${circleTwoY}" r="220" fill="rgba(56,189,248,0.12)" />
          <circle cx="${circleThreeX}" cy="${circleThreeY}" r="120" fill="rgba(148,163,184,0.10)" />
        `;
      case 1:
        return `
          <path d="M0 ${240 + polygonOffset} C 340 ${120 + polygonOffset}, 640 ${330 + polygonOffset}, 1040 ${210 + polygonOffset} C 1250 ${150 + polygonOffset}, 1430 ${230 + polygonOffset}, ${DESIGN_W} ${160 + polygonOffset} L ${DESIGN_W} ${DESIGN_H} L 0 ${DESIGN_H} Z" fill="rgba(191,219,254,0.16)" />
          <path d="M0 ${170 + polygonOffset} C 280 ${40 + polygonOffset}, 700 ${240 + polygonOffset}, 980 ${130 + polygonOffset} C 1300 ${20 + polygonOffset}, 1500 ${140 + polygonOffset}, ${DESIGN_W} ${80 + polygonOffset} L ${DESIGN_W} 0 L 0 0 Z" fill="rgba(125,211,252,0.14)" />
        `;
      case 2:
        return `
          <rect x="${stripeOffset}" y="-80" width="220" height="${DESIGN_H + 160}" transform="rotate(14 ${stripeOffset} 0)" fill="rgba(56,189,248,0.13)" />
          <rect x="${stripeOffset + 210}" y="-80" width="140" height="${DESIGN_H + 160}" transform="rotate(14 ${stripeOffset + 210} 0)" fill="rgba(191,219,254,0.15)" />
          <rect x="${stripeOffset + 340}" y="-80" width="320" height="${DESIGN_H + 160}" transform="rotate(14 ${stripeOffset + 340} 0)" fill="rgba(148,163,184,0.10)" />
        `;
      case 3:
        return `
          <polygon points="${1080 + polygonOffset},-10 ${1400 + polygonOffset},40 ${1360 + polygonOffset},220 ${980 + polygonOffset},190" fill="rgba(186,230,253,0.15)" />
          <polygon points="${970 + polygonOffset},120 ${1290 + polygonOffset},180 ${1180 + polygonOffset},360 ${840 + polygonOffset},300" fill="rgba(147,197,253,0.14)" />
          <circle cx="${circleThreeX}" cy="${circleThreeY}" r="160" fill="rgba(15,23,42,0.16)" />
        `;
      default:
        return `
          <ellipse cx="${circleOneX}" cy="${circleOneY}" rx="260" ry="110" fill="rgba(191,219,254,0.16)" />
          <ellipse cx="${circleTwoX}" cy="${circleTwoY}" rx="320" ry="130" fill="rgba(125,211,252,0.12)" />
          <path d="M780 ${280 + polygonOffset} C 980 ${220 + polygonOffset}, 1240 ${310 + polygonOffset}, ${DESIGN_W} ${200 + polygonOffset}" stroke="rgba(224,242,254,0.38)" stroke-width="4" fill="none" />
        `;
    }
  })();

  const svg = `
    <svg width="${outWidth}" height="${outHeight}" viewBox="0 0 ${DESIGN_W} ${DESIGN_H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="hsl(${hueA} 72% 35%)"/>
          <stop offset="50%" stop-color="hsl(${hueB} 78% 44%)"/>
          <stop offset="100%" stop-color="hsl(${hueC} 65% 16%)"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)" />
      ${patternLayer}
    </svg>
  `;

  return Buffer.from(svg);
};

export const generateCreativeBaseImage = async (
  prompt: string,
  regenerateNonce: string | undefined,
  imageModel: ImageModelId,
  targetWidth: number,
  targetHeight: number
): Promise<Buffer> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return createFallbackBase(regenerateNonce, targetWidth, targetHeight);
  }

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.images.generate({
      model: imageModel,
      prompt,
      size: "1536x1024"
    });

    const base64Image = response.data?.[0]?.b64_json;
    if (!base64Image) {
      return createFallbackBase(regenerateNonce, targetWidth, targetHeight);
    }

    return Buffer.from(base64Image, "base64");
  } catch {
    return createFallbackBase(regenerateNonce, targetWidth, targetHeight);
  }
};
