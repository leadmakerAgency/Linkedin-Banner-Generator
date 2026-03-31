"use client";

import { useState } from "react";
import Image from "next/image";
import { BannerFiles, BannerForm } from "@/components/BannerForm";
import { ChatAssistant } from "@/components/ChatAssistant";
import { BannerPreview } from "@/components/BannerPreview";
import { BannerFormValues, RevisionAction } from "@/types/banner";

const INITIAL_VALUES: BannerFormValues = {
  bannerType: "personal",
  companyName: "",
  companyDescription: "",
  companyNameFontStyle: "inter",
  companyDescriptionFontStyle: "inter",
  companyNameColorMode: "auto",
  companyNameTextColor: "#FFFFFF",
  companyDescriptionColorMode: "auto",
  companyDescriptionTextColor: "#E2E8F0",
  companyPageType: "company",
  primaryBrandColor: "#1D4ED8",
  secondaryBrandColor: "#0F172A",
  phoneNumber: "",
  stylePreset: "corporate",
  imageModel: "gpt-image-1"
};

const DEFAULT_GENERATION_VALUES: Pick<
  BannerFormValues,
  | "companyName"
  | "companyDescription"
  | "phoneNumber"
  | "companyNameFontStyle"
  | "companyDescriptionFontStyle"
  | "companyNameColorMode"
  | "companyNameTextColor"
  | "companyDescriptionColorMode"
  | "companyDescriptionTextColor"
  | "imageModel"
> = {
  companyName: "Your Company",
  companyDescription: "Lead generation through strategic marketing, virtual assistants, and call center support.",
  phoneNumber: "+1 555 010 234",
  companyNameFontStyle: "inter",
  companyDescriptionFontStyle: "inter",
  companyNameColorMode: "auto",
  companyNameTextColor: "#FFFFFF",
  companyDescriptionColorMode: "auto",
  companyDescriptionTextColor: "#E2E8F0",
  imageModel: "gpt-image-1"
};

const INITIAL_FILES: BannerFiles = {
  primaryLogo: null,
  secondaryLogo: null
};

const HomePage = () => {
  const [values, setValues] = useState<BannerFormValues>(INITIAL_VALUES);
  const [files, setFiles] = useState<BannerFiles>(INITIAL_FILES);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const generateNonce = (): string => {
    if (typeof window !== "undefined" && window.crypto && "randomUUID" in window.crypto) {
      return window.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  };

  const autoChatPrompt = [
    `Create a ${values.bannerType} LinkedIn banner.`,
    `Company name: ${values.companyName.trim() || DEFAULT_GENERATION_VALUES.companyName}.`,
    `Company description: ${values.companyDescription.trim() || DEFAULT_GENERATION_VALUES.companyDescription}.`,
    `Company name font: ${values.companyNameFontStyle || DEFAULT_GENERATION_VALUES.companyNameFontStyle}.`,
    `Description font: ${values.companyDescriptionFontStyle || DEFAULT_GENERATION_VALUES.companyDescriptionFontStyle}.`,
    values.companyNameColorMode === "auto"
      ? "Company name text color: Auto (AI chooses the best fitting contrast color based on the generated design)."
      : `Company name text color (manual): ${values.companyNameTextColor || DEFAULT_GENERATION_VALUES.companyNameTextColor}.`,
    values.companyDescriptionColorMode === "auto"
      ? "Company description text color: Auto (AI chooses the best fitting contrast color based on the generated design)."
      : `Company description text color (manual): ${
          values.companyDescriptionTextColor || DEFAULT_GENERATION_VALUES.companyDescriptionTextColor
        }.`,
    "Phone number text color: Auto (AI chooses the best fitting contrast color based on the generated design).",
    `Company type: ${values.companyPageType}.`,
    `Primary brand color: ${values.primaryBrandColor}.`,
    `Secondary brand color: ${values.secondaryBrandColor}.`,
    `Phone number: ${values.phoneNumber.trim() || DEFAULT_GENERATION_VALUES.phoneNumber}.`,
    `Style preset: ${values.stylePreset}.`,
    `Image model: ${values.imageModel}.`,
    "Make it professional, clean, and suitable for 1584x396 LinkedIn cover dimensions."
  ].join(" ");

  const handleBuildFormData = (revisionAction?: RevisionAction, forceFresh?: boolean): FormData => {
    const companyName = values.companyName.trim() || DEFAULT_GENERATION_VALUES.companyName;
    const companyDescription = values.companyDescription.trim() || DEFAULT_GENERATION_VALUES.companyDescription;
    const phoneNumber = values.phoneNumber.trim() || DEFAULT_GENERATION_VALUES.phoneNumber;

    const formData = new FormData();
    formData.set("bannerType", values.bannerType);
    formData.set("companyName", companyName);
    formData.set("companyDescription", companyDescription);
    formData.set("companyNameFontStyle", values.companyNameFontStyle);
    formData.set("companyDescriptionFontStyle", values.companyDescriptionFontStyle);
    formData.set("companyNameColorMode", values.companyNameColorMode);
    formData.set("companyNameTextColor", values.companyNameTextColor);
    formData.set("companyDescriptionColorMode", values.companyDescriptionColorMode);
    formData.set("companyDescriptionTextColor", values.companyDescriptionTextColor);
    formData.set("companyPageType", values.companyPageType);
    formData.set("primaryBrandColor", values.primaryBrandColor);
    formData.set("secondaryBrandColor", values.secondaryBrandColor);
    formData.set("phoneNumber", phoneNumber);
    formData.set("stylePreset", values.stylePreset);
    formData.set("imageModel", values.imageModel);
    if (files.primaryLogo) {
      formData.set("primaryLogo", files.primaryLogo);
    }
    if (files.secondaryLogo) {
      formData.set("secondaryLogo", files.secondaryLogo);
    }
    if (revisionAction) {
      formData.set("revisionAction", revisionAction);
    }
    if (forceFresh) {
      formData.set("regenerateNonce", generateNonce());
    }

    return formData;
  };

  const handleRequest = async (
    endpoint: "/api/generate" | "/api/revise",
    revisionAction?: RevisionAction,
    forceFresh?: boolean
  ) => {
    setIsLoading(true);
    setLoadingProgress(8);
    setErrorMessage(null);
    const progressTimer = window.setInterval(() => {
      setLoadingProgress((previous) => {
        if (previous >= 90) {
          return previous;
        }
        const next = previous + Math.floor(Math.random() * 12) + 4;
        return Math.min(next, 90);
      });
    }, 350);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: handleBuildFormData(revisionAction, forceFresh)
      });
      const data = (await response.json()) as { imageUrl?: string; error?: string };

      if (!response.ok || !data.imageUrl) {
        setErrorMessage(data.error ?? "Banner generation failed.");
        return;
      }

      setLoadingProgress(100);
      setImageUrl(data.imageUrl);
    } catch {
      setErrorMessage("Unable to reach generator API. Please retry.");
    } finally {
      window.clearInterval(progressTimer);
      setLoadingProgress(100);
      window.setTimeout(() => setLoadingProgress(0), 450);
      setIsLoading(false);
    }
  };

  const handleGenerate = () => {
    void handleRequest("/api/generate", undefined, true);
  };

  const handleRegenerate = () => {
    void handleRequest("/api/generate", undefined, true);
  };

  const handleRevision = (action: RevisionAction) => {
    void handleRequest("/api/revise", action);
  };

  const handlePatchFromChat = (patch: Partial<BannerFormValues>) => {
    setValues((previous) => ({
      ...previous,
      ...patch
    }));
  };

  return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto mb-6 w-full max-w-[1460px] rounded-3xl border border-slate-800/90 bg-slate-900/75 p-5 shadow-[0_22px_60px_-30px_rgba(2,6,23,0.95)] backdrop-blur-xl md:p-7">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-2 shadow-inner shadow-blue-500/10">
            <Image src="/app-logo.svg" alt="App logo" width={44} height={44} priority />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-100 md:text-3xl">LinkedIn Banner Generator</h1>
            <p className="mt-2 text-sm text-slate-300 md:text-base">
              Build high-quality LinkedIn banners with guided settings, AI assistance, and deterministic brand overlays.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1460px] gap-6 xl:grid-cols-[1fr,1.15fr]">
        <section>
          <div className="rounded-3xl border border-slate-800/90 bg-slate-900/75 p-6 shadow-[0_24px_60px_-32px_rgba(2,6,23,0.98)] backdrop-blur-xl">
            <BannerForm
              values={values}
              files={files}
              embedded
              onValuesChange={setValues}
              onFilesChange={setFiles}
            />

            <ChatAssistant
              settings={values}
              draftPrompt={autoChatPrompt}
              embedded
              onPatchSettings={handlePatchFromChat}
              onGenerate={handleGenerate}
            />
          </div>
        </section>

        <section>
          <BannerPreview
            imageUrl={imageUrl}
            isLoading={isLoading}
            loadingProgress={loadingProgress}
            onRegenerate={handleRegenerate}
            onRevision={handleRevision}
          />

          {errorMessage ? (
            <p className="mt-3 rounded-xl border border-rose-500/50 bg-rose-950/70 px-4 py-2.5 text-sm font-medium text-rose-200 shadow-sm" aria-live="polite">
              {errorMessage}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
};

export default HomePage;
