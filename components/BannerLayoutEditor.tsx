"use client";

import { type CSSProperties, type PointerEvent, useState } from "react";
import { getBannerLayoutConstants } from "@/lib/bannerLayoutConstants";
import { clampRectWithinBanner, getPreviewScale, toBannerDelta } from "@/lib/layoutDragMath";
import type { LayoutDragGroup } from "@/lib/nudgeLayoutOverlay";
import type { BannerFormValues, LayoutElementRect, LayoutOverlayPayload } from "@/types/banner";
import { getBannerDimensions } from "@/types/banner";

const applyDelta = (rect: LayoutElementRect, dx: number, dy: number): LayoutElementRect => {
  return {
    left: rect.left + dx,
    top: rect.top + dy,
    width: rect.width,
    height: rect.height
  };
};

const clampLayoutDelta = (value: number): number => Math.max(-2000, Math.min(2000, value));

const handleClass =
  "pointer-events-auto absolute z-10 box-border touch-none cursor-grab rounded-lg border border-dashed border-sky-400/80 bg-sky-500/20 shadow-sm active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-sky-400";

const rectToStyle = (
  rect: LayoutElementRect,
  scale: number,
  offsetX: number,
  offsetY: number
): CSSProperties => ({
  left: offsetX + rect.left * scale,
  top: offsetY + rect.top * scale,
  width: rect.width * scale,
  height: rect.height * scale
});

type LiveDelta = { dx: number; dy: number };
type LiveOffsets = Record<LayoutDragGroup, LiveDelta>;
type ActiveDragState = {
  group: LayoutDragGroup;
  pointerId: number;
  startClientX: number;
  startClientY: number;
};
export type PreviewViewport = {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
};

const EMPTY_LIVE_OFFSETS: LiveOffsets = {
  primary: { dx: 0, dy: 0 },
  secondary: { dx: 0, dy: 0 },
  text: { dx: 0, dy: 0 },
  phone: { dx: 0, dy: 0 }
};

interface BannerLayoutEditorProps {
  values: BannerFormValues;
  layoutOverlay: LayoutOverlayPayload | null;
  onLayoutDeltaChange: (patch: Partial<BannerFormValues>) => void;
  onLayoutDragNudge: (group: LayoutDragGroup, dxBanner: number, dyBanner: number) => void;
  hasPrimaryLogo: boolean;
  hasSecondaryLogo: boolean;
  previewViewport: PreviewViewport;
}

export const BannerLayoutEditor = ({
  values,
  layoutOverlay,
  onLayoutDeltaChange,
  onLayoutDragNudge,
  hasPrimaryLogo,
  hasSecondaryLogo,
  previewViewport
}: BannerLayoutEditorProps) => {
  const [activeDrag, setActiveDrag] = useState<ActiveDragState | null>(null);
  const [liveOffsets, setLiveOffsets] = useState<LiveOffsets>(EMPTY_LIVE_OFFSETS);

  const { width: bannerPixelWidth, height: bannerPixelHeight } = getBannerDimensions(values.bannerType);
  const L = getBannerLayoutConstants(values.bannerType);
  const previewScale = getPreviewScale(previewViewport.width, bannerPixelWidth);

  const setLiveOffset = (group: LayoutDragGroup, next: LiveDelta) => {
    setLiveOffsets((previous) => ({
      ...previous,
      [group]: next
    }));
  };

  const clearLiveOffset = (group: LayoutDragGroup) => {
    setLiveOffset(group, { dx: 0, dy: 0 });
  };

  const primaryRect: LayoutElementRect | null = !hasPrimaryLogo
    ? null
    : (layoutOverlay?.primaryLogo ?? {
        left: L.LAYOUT_MARGIN + values.layoutPrimaryLogoDeltaX,
        top: L.LAYOUT_LOGO_TOP + values.layoutPrimaryLogoDeltaY,
        width: L.LAYOUT_PRIMARY_LOGO_BOX,
        height: L.LAYOUT_PRIMARY_LOGO_BOX
      });

  const secondaryRect: LayoutElementRect | null = !hasSecondaryLogo
    ? null
    : (layoutOverlay?.secondaryLogo ?? {
        left: L.LAYOUT_SECONDARY_LOGO_LEFT + values.layoutSecondaryLogoDeltaX,
        top: L.LAYOUT_SECONDARY_LOGO_TOP + values.layoutSecondaryLogoDeltaY,
        width: L.LAYOUT_SECONDARY_LOGO_BOX,
        height: L.LAYOUT_SECONDARY_LOGO_BOX
      });

  const textRect: LayoutElementRect = layoutOverlay?.textBlock ?? {
    left: L.LAYOUT_TEXT_BLOCK_LEFT + values.layoutTextBlockDeltaX,
    top: L.LAYOUT_TEXT_BLOCK_TOP + values.layoutTextBlockDeltaY,
    width: L.LAYOUT_TEXT_BLOCK_WIDTH,
    height: L.LAYOUT_TEXT_BLOCK_HEIGHT
  };

  const phoneRect: LayoutElementRect = layoutOverlay?.phoneGroup ?? {
    left: L.LAYOUT_PHONE_REGION_LEFT + values.layoutPhoneGroupDeltaX,
    top: L.LAYOUT_PHONE_REGION_TOP + values.layoutPhoneGroupDeltaY,
    width: L.LAYOUT_PHONE_REGION_W,
    height: L.LAYOUT_PHONE_REGION_H
  };
  const showPhoneHandle = values.phoneNumber.trim().length > 0;
  const expectedPhoneLeft = L.LAYOUT_PHONE_REGION_LEFT + values.layoutPhoneGroupDeltaX;
  const expectedPhoneTop = L.LAYOUT_PHONE_REGION_TOP + values.layoutPhoneGroupDeltaY;
  const hasSuspiciousServerPhoneRect = Boolean(
    layoutOverlay?.phoneGroup &&
      layoutOverlay.phoneGroup.left <= 4 &&
      layoutOverlay.phoneGroup.top <= 4 &&
      (expectedPhoneLeft > bannerPixelWidth * 0.25 || expectedPhoneTop > bannerPixelHeight * 0.25)
  );
  const effectivePhoneRect: LayoutElementRect = hasSuspiciousServerPhoneRect
    ? {
        left: expectedPhoneLeft,
        top: expectedPhoneTop,
        width: L.LAYOUT_PHONE_REGION_W,
        height: L.LAYOUT_PHONE_REGION_H
      }
    : phoneRect;

  const commitGroupDelta = (group: LayoutDragGroup, dx: number, dy: number) => {
    switch (group) {
      case "primary":
        onLayoutDeltaChange({
          layoutPrimaryLogoDeltaX: clampLayoutDelta(values.layoutPrimaryLogoDeltaX + dx),
          layoutPrimaryLogoDeltaY: clampLayoutDelta(values.layoutPrimaryLogoDeltaY + dy)
        });
        break;
      case "secondary":
        onLayoutDeltaChange({
          layoutSecondaryLogoDeltaX: clampLayoutDelta(values.layoutSecondaryLogoDeltaX + dx),
          layoutSecondaryLogoDeltaY: clampLayoutDelta(values.layoutSecondaryLogoDeltaY + dy)
        });
        break;
      case "text":
        onLayoutDeltaChange({
          layoutTextBlockDeltaX: clampLayoutDelta(values.layoutTextBlockDeltaX + dx),
          layoutTextBlockDeltaY: clampLayoutDelta(values.layoutTextBlockDeltaY + dy)
        });
        break;
      case "phone":
        onLayoutDeltaChange({
          layoutPhoneGroupDeltaX: clampLayoutDelta(values.layoutPhoneGroupDeltaX + dx),
          layoutPhoneGroupDeltaY: clampLayoutDelta(values.layoutPhoneGroupDeltaY + dy)
        });
        break;
      default:
        return;
    }
    onLayoutDragNudge(group, dx, dy);
  };

  const startDrag = (event: PointerEvent<HTMLDivElement>, group: LayoutDragGroup) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setActiveDrag({
      group,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY
    });
    setLiveOffset(group, { dx: 0, dy: 0 });
  };

  const updateDrag = (event: PointerEvent<HTMLDivElement>, group: LayoutDragGroup, rect: LayoutElementRect) => {
    if (!activeDrag || activeDrag.group !== group || activeDrag.pointerId !== event.pointerId) {
      return;
    }

    const { dxBanner, dyBanner } = toBannerDelta(
      event.clientX - activeDrag.startClientX,
      event.clientY - activeDrag.startClientY,
      previewScale
    );
    const clamped = clampRectWithinBanner(rect, dxBanner, dyBanner, bannerPixelWidth, bannerPixelHeight);
    setLiveOffset(group, { dx: clamped.dxBanner, dy: clamped.dyBanner });
  };

  const stopDrag = (event: PointerEvent<HTMLDivElement>, group: LayoutDragGroup) => {
    if (!activeDrag || activeDrag.group !== group || activeDrag.pointerId !== event.pointerId) {
      return;
    }
    const offset = liveOffsets[group];
    if (offset.dx !== 0 || offset.dy !== 0) {
      commitGroupDelta(group, offset.dx, offset.dy);
    }
    clearLiveOffset(group);
    setActiveDrag(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const cancelDrag = (event: PointerEvent<HTMLDivElement>, group: LayoutDragGroup) => {
    if (!activeDrag || activeDrag.group !== group || activeDrag.pointerId !== event.pointerId) {
      return;
    }
    clearLiveOffset(group);
    setActiveDrag(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const renderedPrimaryRect = primaryRect ? applyDelta(primaryRect, liveOffsets.primary.dx, liveOffsets.primary.dy) : null;
  const renderedSecondaryRect = secondaryRect ? applyDelta(secondaryRect, liveOffsets.secondary.dx, liveOffsets.secondary.dy) : null;
  const renderedTextRect = applyDelta(textRect, liveOffsets.text.dx, liveOffsets.text.dy);
  const renderedPhoneRect = showPhoneHandle ? applyDelta(effectivePhoneRect, liveOffsets.phone.dx, liveOffsets.phone.dy) : null;

  return (
    <div className="pointer-events-none absolute inset-0">
      {renderedPrimaryRect ? (
        <div
          className={handleClass}
          role="button"
          tabIndex={0}
          aria-label="Drag primary logo"
          style={rectToStyle(renderedPrimaryRect, previewScale, previewViewport.offsetX, previewViewport.offsetY)}
          onPointerDown={(event) => startDrag(event, "primary")}
          onPointerMove={(event) => updateDrag(event, "primary", primaryRect!)}
          onPointerUp={(event) => stopDrag(event, "primary")}
          onPointerCancel={(event) => cancelDrag(event, "primary")}
        />
      ) : null}

      {renderedSecondaryRect ? (
        <div
          className={handleClass}
          role="button"
          tabIndex={0}
          aria-label="Drag secondary logo"
          style={rectToStyle(renderedSecondaryRect, previewScale, previewViewport.offsetX, previewViewport.offsetY)}
          onPointerDown={(event) => startDrag(event, "secondary")}
          onPointerMove={(event) => updateDrag(event, "secondary", secondaryRect!)}
          onPointerUp={(event) => stopDrag(event, "secondary")}
          onPointerCancel={(event) => cancelDrag(event, "secondary")}
        />
      ) : null}

      <div
        className={handleClass}
        role="button"
        tabIndex={0}
        aria-label="Drag title and description text block"
        style={rectToStyle(renderedTextRect, previewScale, previewViewport.offsetX, previewViewport.offsetY)}
        onPointerDown={(event) => startDrag(event, "text")}
        onPointerMove={(event) => updateDrag(event, "text", textRect)}
        onPointerUp={(event) => stopDrag(event, "text")}
        onPointerCancel={(event) => cancelDrag(event, "text")}
      />

      {renderedPhoneRect ? (
        <div
          className={handleClass}
          role="button"
          tabIndex={0}
          aria-label="Drag phone number and icon"
          style={rectToStyle(renderedPhoneRect, previewScale, previewViewport.offsetX, previewViewport.offsetY)}
          onPointerDown={(event) => startDrag(event, "phone")}
          onPointerMove={(event) => updateDrag(event, "phone", effectivePhoneRect)}
          onPointerUp={(event) => stopDrag(event, "phone")}
          onPointerCancel={(event) => cancelDrag(event, "phone")}
        />
      ) : null}
    </div>
  );
};
