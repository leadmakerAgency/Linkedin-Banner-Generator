"use client";

import { useEffect, useMemo, useState } from "react";
import { BannerFormValues } from "@/types/banner";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

type ChatEvent =
  | { type: "token"; text: string }
  | { type: "patch"; patch: Partial<BannerFormValues> }
  | { type: "error"; message: string }
  | { type: "done" };

interface ChatAssistantProps {
  settings: BannerFormValues;
  draftPrompt: string;
  embedded?: boolean;
  onPatchSettings: (patch: Partial<BannerFormValues>) => void;
  onGenerate: () => void;
}

const createId = (): string => {
  if (typeof window !== "undefined" && window.crypto && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
};

export const ChatAssistant = ({ settings, draftPrompt, embedded = false, onPatchSettings, onGenerate }: ChatAssistantProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "assistant-welcome",
      role: "assistant",
      content:
        "Tell me what banner you want, for example: 'Corporate style, company name LeadMaker Hub, use blue tones, phone +1 555 010 234, description about lead generation services.'"
    }
  ]);
  const [inputValue, setInputValue] = useState(draftPrompt);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastPatchNotice, setLastPatchNotice] = useState<string | null>(null);

  useEffect(() => {
    setInputValue(draftPrompt);
  }, [draftPrompt]);

  const currentSettingsSummary = useMemo(() => {
    return `${settings.bannerType} | ${settings.stylePreset} | ${settings.companyName || "No company name yet"}`;
  }, [settings.bannerType, settings.companyName, settings.stylePreset]);

  const handleSend = async () => {
    const messageText = inputValue.trim();
    if (!messageText || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: messageText
    };
    const assistantId = createId();

    setInputValue("");
    setErrorMessage(null);
    setLastPatchNotice(null);
    setIsLoading(true);
    setMessages((previous) => [
      ...previous,
      userMessage,
      {
        id: assistantId,
        role: "assistant",
        content: ""
      }
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(({ role, content }) => ({ role, content })),
          currentSettings: settings
        })
      });

      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Chat request failed.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            continue;
          }

          const event = JSON.parse(trimmed) as ChatEvent;
          if (event.type === "token") {
            setMessages((previous) =>
              previous.map((message) =>
                message.id === assistantId
                  ? {
                      ...message,
                      content: `${message.content}${event.text}`
                    }
                  : message
              )
            );
          }
          if (event.type === "patch") {
            const patchKeys = Object.keys(event.patch ?? {});
            if (patchKeys.length > 0) {
              onPatchSettings(event.patch);
              setLastPatchNotice(`Settings updated: ${patchKeys.join(", ")}`);
            } else {
              setLastPatchNotice("No structured settings found in message. You can still click Generate Banner.");
            }
          }
          if (event.type === "error") {
            setErrorMessage(event.message);
          }
        }
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to send chat message.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  return (
    <section className={embedded ? "mt-6 border-t border-slate-800 pt-6" : "rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-[0_20px_45px_-30px_rgba(2,6,23,0.95)]"}>
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-slate-100">AI Assistant</h2>
        <p className="mt-1 text-sm text-slate-400">Use chat to refine settings, then generate final banner variants.</p>
        <p className="mt-1 text-xs font-medium text-slate-400">Current: {currentSettingsSummary}</p>
      </div>

      <div className="mb-3 h-[360px] space-y-3 overflow-y-auto rounded-xl border border-slate-700 bg-gradient-to-b from-slate-950 to-slate-900 p-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[92%] rounded-xl px-3 py-2 text-sm ${
              message.role === "user"
                ? "ml-auto border border-blue-400/70 bg-blue-600/95 text-white shadow-sm"
                : "border border-slate-700 bg-slate-900 text-slate-200 shadow-sm"
            }`}
          >
            {message.content || (message.role === "assistant" && isLoading ? "..." : "")}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <textarea
          className="h-28 w-full resize-none rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25"
          placeholder="Tell the assistant how to set your banner..."
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleKeyDown}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={isLoading || !inputValue.trim()}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {isLoading ? "Thinking..." : "Send"}
          </button>
          <button
            type="button"
            onClick={onGenerate}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            Generate Banner
          </button>
        </div>

        {lastPatchNotice ? <p className="text-xs font-medium text-emerald-300">{lastPatchNotice}</p> : null}
        {errorMessage ? <p className="text-xs font-medium text-rose-300">{errorMessage}</p> : null}
      </div>
    </section>
  );
};
