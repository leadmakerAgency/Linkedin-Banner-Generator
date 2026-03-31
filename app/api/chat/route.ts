import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

export const runtime = "nodejs";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000)
});

const stylePresetSchema = z.enum([
  "corporate",
  "modern",
  "minimal",
  "bold",
  "premium",
  "elegant",
  "vibrant",
  "dark-tech",
  "clean-light",
  "gradient-wave"
]);

const fontStyleSchema = z.enum([
  "inter",
  "poppins",
  "montserrat",
  "lato",
  "roboto",
  "openSans",
  "nunito",
  "raleway",
  "oswald",
  "playfairDisplay",
  "merriweather",
  "ubuntu",
  "workSans",
  "sourceSansPro",
  "manrope",
  "mulish",
  "quicksand",
  "ptSans",
  "dmSans",
  "libreBaskerville"
]);

const settingsSchema = z.object({
  bannerType: z.enum(["personal", "corporate"]),
  companyName: z.string(),
  companyDescription: z.string(),
  companyNameFontStyle: fontStyleSchema,
  companyDescriptionFontStyle: fontStyleSchema,
  companyNameColorMode: z.enum(["auto", "manual"]),
  companyNameTextColor: z.string(),
  companyDescriptionColorMode: z.enum(["auto", "manual"]),
  companyDescriptionTextColor: z.string(),
  companyPageType: z.enum(["company", "agency", "personal-brand"]),
  primaryBrandColor: z.string(),
  secondaryBrandColor: z.string(),
  phoneNumber: z.string(),
  imageModel: z.enum(["gpt-image-1", "gpt-image-1-mini"]),
  stylePreset: stylePresetSchema
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(30),
  currentSettings: settingsSchema
});

const patchSchema = z.object({
  bannerType: z.enum(["personal", "corporate"]).optional(),
  companyName: z.string().max(80).optional(),
  companyDescription: z.string().max(80).optional(),
  companyNameFontStyle: fontStyleSchema.optional(),
  companyDescriptionFontStyle: fontStyleSchema.optional(),
  companyNameColorMode: z.enum(["auto", "manual"]).optional(),
  companyNameTextColor: z.string().regex(/^#([A-Fa-f0-9]{6})$/).optional(),
  companyDescriptionColorMode: z.enum(["auto", "manual"]).optional(),
  companyDescriptionTextColor: z.string().regex(/^#([A-Fa-f0-9]{6})$/).optional(),
  companyPageType: z.enum(["company", "agency", "personal-brand"]).optional(),
  primaryBrandColor: z.string().regex(/^#([A-Fa-f0-9]{6})$/).optional(),
  secondaryBrandColor: z.string().regex(/^#([A-Fa-f0-9]{6})$/).optional(),
  phoneNumber: z.string().max(40).optional(),
  imageModel: z.enum(["gpt-image-1", "gpt-image-1-mini"]).optional(),
  stylePreset: stylePresetSchema.optional()
});

type StreamEvent =
  | { type: "token"; text: string }
  | { type: "patch"; patch: z.infer<typeof patchSchema> }
  | { type: "error"; message: string }
  | { type: "done" };

const encodeEvent = (event: StreamEvent): Uint8Array => {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
};

export const POST = async (request: Request) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is missing." }, { status: 400 });
  }

  let payload: z.infer<typeof requestSchema>;
  try {
    const body = await request.json();
    payload = requestSchema.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid chat request payload." }, { status: 400 });
  }

  const client = new OpenAI({ apiKey });
  const latestUserMessage = [...payload.messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const uiMessages = payload.messages.map((message) => ({
    role: message.role,
    content: message.content
  }));

  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      try {
        const completion = await client.chat.completions.create({
          model: "gpt-4.1-mini",
          stream: true,
          messages: [
            {
              role: "system",
              content:
                "You are a banner assistant inside a SaaS app. Respond concisely with practical guidance and actionable wording."
            },
            ...uiMessages
          ]
        });

        for await (const chunk of completion) {
          const token = chunk.choices[0]?.delta?.content ?? "";
          if (token) {
            controller.enqueue(encodeEvent({ type: "token", text: token }));
          }
        }

        const patchCompletion = await client.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content:
                "Extract only setting changes from user request into JSON. Return only JSON object with optional keys: bannerType, companyName, companyDescription, companyNameFontStyle, companyDescriptionFontStyle, companyNameColorMode, companyNameTextColor, companyDescriptionColorMode, companyDescriptionTextColor, companyPageType, primaryBrandColor, secondaryBrandColor, phoneNumber, imageModel, stylePreset."
            },
            {
              role: "user",
              content: `Current settings: ${JSON.stringify(payload.currentSettings)}`
            },
            {
              role: "user",
              content: `Latest user message: ${latestUserMessage}`
            }
          ],
          response_format: {
            type: "json_object"
          }
        });

        const patchText = patchCompletion.choices[0]?.message?.content ?? "{}";
        const parsedPatch = patchSchema.safeParse(JSON.parse(patchText));
        if (parsedPatch.success) {
          controller.enqueue(encodeEvent({ type: "patch", patch: parsedPatch.data }));
        }

        controller.enqueue(encodeEvent({ type: "done" }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Chat request failed.";
        controller.enqueue(encodeEvent({ type: "error", message }));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache"
    }
  });
};
