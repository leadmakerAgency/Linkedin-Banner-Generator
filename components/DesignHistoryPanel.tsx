"use client";

import { useCallback, useEffect, useState } from "react";
import type { BannerFiles } from "@/components/BannerForm";
import type { BannerFormValues, LayoutOverlayPayload } from "@/types/banner";

const STORAGE_KEY = "banner_designs_api_secret";

export type DesignHistoryListItem = {
  id: string;
  title: string;
  banner_type: string;
  updated_at: string;
  previewUrl: string | null;
};

type DesignHistoryPanelProps = {
  onLoadDesign: (payload: {
    values: BannerFormValues;
    promptSnapshot: string;
    layoutOverlay: LayoutOverlayPayload | null;
    backgroundDisplayUrl: string;
    backgroundStoragePath: string | null;
    designId: string | null;
    files: BannerFiles;
  }) => void;
};

const urlToPngFile = async (url: string, filename: string): Promise<File> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to download logo asset.");
  }
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type || "image/png" });
};

export const DesignHistoryPanel = ({ onLoadDesign }: DesignHistoryPanelProps) => {
  const [secretInput, setSecretInput] = useState("");
  const [secret, setSecret] = useState("");
  const [designs, setDesigns] = useState<DesignHistoryListItem[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.sessionStorage.getItem(STORAGE_KEY) : null;
    if (stored) {
      setSecret(stored);
      setSecretInput(stored);
    }
  }, []);

  const handleSaveSecret = useCallback(() => {
    const next = secretInput.trim();
    setSecret(next);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, next);
    }
  }, [secretInput]);

  const handleFetchList = useCallback(async () => {
    setListError(null);
    setIsLoadingList(true);
    try {
      const response = await fetch("/api/designs", {
        headers: { "x-designs-secret": secret }
      });
      const data = (await response.json()) as { designs?: DesignHistoryListItem[]; error?: string };
      if (!response.ok) {
        setListError(data.error ?? "Failed to load history.");
        setDesigns([]);
        return;
      }
      setDesigns(data.designs ?? []);
    } catch {
      setListError("Unable to reach history API.");
      setDesigns([]);
    } finally {
      setIsLoadingList(false);
    }
  }, [secret]);

  const handleEditDesign = useCallback(
    async (designId: string) => {
      setEditError(null);
      try {
        const response = await fetch(`/api/designs/${designId}`, {
          headers: { "x-designs-secret": secret }
        });
        const data = (await response.json()) as {
          designId?: string;
          backgroundStoragePath?: string;
          backgroundSignedUrl?: string;
          snapshot?: { form: BannerFormValues; promptSnapshot: string; layoutOverlay: LayoutOverlayPayload | null };
          primaryLogoSignedUrl?: string | null;
          secondaryLogoSignedUrl?: string | null;
          error?: string;
        };

        if (!response.ok || !data.snapshot || !data.backgroundSignedUrl) {
          setEditError(data.error ?? "Failed to load design.");
          return;
        }

        const primaryLogo =
          data.primaryLogoSignedUrl && data.snapshot.form
            ? await urlToPngFile(data.primaryLogoSignedUrl, "primary-logo.png")
            : null;
        const secondaryLogo =
          data.secondaryLogoSignedUrl && data.snapshot.form
            ? await urlToPngFile(data.secondaryLogoSignedUrl, "secondary-logo.png")
            : null;

        onLoadDesign({
          values: data.snapshot.form,
          promptSnapshot: data.snapshot.promptSnapshot,
          layoutOverlay: data.snapshot.layoutOverlay,
          backgroundDisplayUrl: data.backgroundSignedUrl,
          backgroundStoragePath: data.backgroundStoragePath ?? null,
          designId: data.designId ?? designId,
          files: { primaryLogo, secondaryLogo }
        });
      } catch {
        setEditError("Unable to load design for editing.");
      }
    },
    [onLoadDesign, secret]
  );

  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
      <h4 className="text-sm font-semibold tracking-tight text-slate-200">Design history</h4>
      <p className="mt-1 text-xs text-slate-400">
        Saved designs use Supabase. Enter the same value as <code className="text-slate-300">DESIGNS_API_SECRET</code> on
        the server; it is kept in session storage for this browser only.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="designs-secret" className="mb-1 block text-xs font-medium text-slate-300">
            History secret
          </label>
          <input
            id="designs-secret"
            type="password"
            autoComplete="off"
            value={secretInput}
            onChange={(event) => setSecretInput(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-200 outline-none ring-blue-500/40 focus:ring-2"
          />
        </div>
        <button
          type="button"
          onClick={handleSaveSecret}
          className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
        >
          Save secret
        </button>
        <button
          type="button"
          onClick={() => void handleFetchList()}
          disabled={isLoadingList || secret.trim().length === 0}
          className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          {isLoadingList ? "Loading…" : "Refresh list"}
        </button>
      </div>
      {listError ? (
        <p className="mt-2 text-xs font-medium text-rose-200" aria-live="polite">
          {listError}
        </p>
      ) : null}
      {editError ? (
        <p className="mt-2 text-xs font-medium text-rose-200" aria-live="polite">
          {editError}
        </p>
      ) : null}
      {designs.length > 0 ? (
        <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto text-xs">
          {designs.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-100">{row.title}</p>
                <p className="text-slate-500">
                  {row.banner_type} · {new Date(row.updated_at).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleEditDesign(row.id)}
                className="shrink-0 rounded-lg border border-slate-600 px-2 py-1 font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                Edit
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-slate-500">No saved designs yet, or list not loaded.</p>
      )}
    </div>
  );
};
