"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { BannerFiles } from "@/components/BannerForm";
import { hydrateBannerFormValues, type BannerFormValues, type LayoutOverlayPayload } from "@/types/banner";

export type DesignHistoryListItem = {
  id: string;
  title: string;
  banner_type: string;
  updated_at: string;
  previewUrl: string | null;
};

type DesignHistoryListResponse = {
  designs?: DesignHistoryListItem[];
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  error?: string;
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

const PAGE_SIZE = 5;

const urlToPngFile = async (url: string, filename: string): Promise<File> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to download logo asset.");
  }
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type || "image/png" });
};

export const DesignHistoryPanel = ({ onLoadDesign }: DesignHistoryPanelProps) => {
  const [designs, setDesigns] = useState<DesignHistoryListItem[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [historyStatus, setHistoryStatus] = useState<"idle" | "signed_out" | "unavailable">("idle");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchPage = useCallback(async (targetPage: number) => {
    setListError(null);
    setIsLoadingList(true);
    try {
      const params = new URLSearchParams({ page: String(targetPage), pageSize: String(PAGE_SIZE) });
      const response = await fetch(`/api/designs?${params.toString()}`, { credentials: "include" });
      const data = (await response.json()) as DesignHistoryListResponse;

      if (response.status === 401) {
        setHistoryStatus("signed_out");
        setDesigns([]);
        setTotal(0);
        setTotalPages(0);
        setPage(1);
        setListError(null);
        return;
      }
      if (response.status === 503) {
        setHistoryStatus("unavailable");
        setListError(data.error ?? "Design history is not available.");
        setDesigns([]);
        setTotal(0);
        setTotalPages(0);
        setPage(1);
        return;
      }
      if (!response.ok) {
        setListError(data.error ?? "Failed to load history.");
        setDesigns([]);
        return;
      }

      setHistoryStatus("idle");
      setDesigns(data.designs ?? []);
      setPage(data.page ?? targetPage);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);
    } catch {
      setListError("Unable to reach history API.");
      setDesigns([]);
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void fetchPage(1);
  }, [fetchPage]);

  const handleRefresh = useCallback(() => {
    void fetchPage(page);
  }, [fetchPage, page]);

  const handlePrevPage = useCallback(() => {
    if (page <= 1 || isLoadingList) {
      return;
    }
    void fetchPage(page - 1);
  }, [fetchPage, page, isLoadingList]);

  const handleNextPage = useCallback(() => {
    if (page >= totalPages || isLoadingList || totalPages === 0) {
      return;
    }
    void fetchPage(page + 1);
  }, [fetchPage, page, isLoadingList, totalPages]);

  const handleEditDesign = useCallback(
    async (designId: string) => {
      setEditError(null);
      try {
        const response = await fetch(`/api/designs/${designId}`, { credentials: "include" });
        const data = (await response.json()) as {
          designId?: string;
          backgroundStoragePath?: string;
          backgroundSignedUrl?: string;
          snapshot?: { form: BannerFormValues; promptSnapshot: string; layoutOverlay: LayoutOverlayPayload | null };
          primaryLogoSignedUrl?: string | null;
          secondaryLogoSignedUrl?: string | null;
          error?: string;
        };

        if (response.status === 401) {
          setEditError("Sign in to load a saved design.");
          return;
        }

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
          values: hydrateBannerFormValues(data.snapshot.form),
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
    [onLoadDesign]
  );

  const showPagination = historyStatus === "idle" && totalPages > 1;

  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold tracking-tight text-slate-200">Design history</h4>
          <p className="mt-1 text-xs text-slate-400">
            When Supabase is configured, your saved banners appear here after you sign in. No shared secret is
            required.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={isLoadingList}
          className="shrink-0 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoadingList ? "Loading…" : "Refresh"}
        </button>
      </div>

      {historyStatus === "signed_out" ? (
        <p className="mt-4 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs text-slate-200" aria-live="polite">
          <Link href="/login" className="font-semibold text-blue-400 hover:text-blue-300">
            Sign in
          </Link>{" "}
          to see your saved designs. Magic link email is sent from Supabase Auth.
        </p>
      ) : null}

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

      {historyStatus === "idle" && total > 0 ? (
        <p className="mt-3 text-xs text-slate-500" aria-live="polite">
          Showing {designs.length} of {total} saved design{total === 1 ? "" : "s"}
          {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : null}
        </p>
      ) : null}

      {designs.length > 0 ? (
        <ul className="mt-3 space-y-2 text-xs">
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
      ) : historyStatus !== "signed_out" && historyStatus !== "unavailable" && !isLoadingList && !listError ? (
        <p className="mt-3 text-xs text-slate-500">No saved designs yet.</p>
      ) : null}

      {showPagination ? (
        <nav
          className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3"
          aria-label="Design history pages"
        >
          <button
            type="button"
            onClick={() => void handlePrevPage()}
            disabled={page <= 1 || isLoadingList}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-slate-400">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => void handleNextPage()}
            disabled={page >= totalPages || isLoadingList}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </nav>
      ) : null}
    </div>
  );
};
