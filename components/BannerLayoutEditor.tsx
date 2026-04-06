"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import Draggable, { type DraggableData, type DraggableEvent } from "react-draggable";
import { getBannerLayoutConstants } from "@/lib/bannerLayoutConstants";
import type { LayoutDragGroup } from "@/lib/nudgeLayoutOverlay";
import type { BannerFormValues, LayoutElementRect, LayoutOverlayPayload } from "@/types/banner";
import { getBannerDimensions } from "@/types/banner";

const clampDelta = (value: number): number => Math.max(-400, Math.min(400, value));

/** Preview CSS px → banner px: read container width at pointer-up so commits never use a stale scale. */
const getCommitScale = (
  container: HTMLDivElement | null,
  bannerPixelWidth: number,
  fallback: number
): number => {
  if (!container) {
    return fallback > 0 ? fallback : 1;
  }
  const w = container.getBoundingClientRect().width;
  if (w <= 0) {
    return fallback > 0 ? fallback : 1;
  }
  return w / bannerPixelWidth;
};

const handleClass =
  "pointer-events-auto absolute z-10 box-border cursor-grab rounded-lg border border-dashed border-sky-400/80 bg-sky-500/20 shadow-sm active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-sky-400";

const rectToStyle = (rect: LayoutElementRect, scale: number) => ({
  left: rect.left * scale,
  top: rect.top * scale,
  width: rect.width * scale,
  height: rect.height * scale
});

type DragPos = { x: number; y: number };

interface BannerLayoutEditorProps {
  values: BannerFormValues;
  layoutOverlay: LayoutOverlayPayload | null;
  onLayoutDeltaChange: (patch: Partial<BannerFormValues>) => void;
  onLayoutDragNudge: (group: LayoutDragGroup, dxBanner: number, dyBanner: number) => void;
  hasPrimaryLogo: boolean;
  hasSecondaryLogo: boolean;
}

export const BannerLayoutEditor = ({
  values,
  layoutOverlay,
  onLayoutDeltaChange,
  onLayoutDragNudge,
  hasPrimaryLogo,
  hasSecondaryLogo
}: BannerLayoutEditorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLDivElement>(null);
  const secondaryRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [primaryDrag, setPrimaryDrag] = useState<DragPos>({ x: 0, y: 0 });
  const [secondaryDrag, setSecondaryDrag] = useState<DragPos>({ x: 0, y: 0 });
  const [textDrag, setTextDrag] = useState<DragPos>({ x: 0, y: 0 });
  const [phoneDrag, setPhoneDrag] = useState<DragPos>({ x: 0, y: 0 });

  const bannerPixelWidth = getBannerDimensions(values.bannerType).width;
  const L = getBannerLayoutConstants(values.bannerType);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }
    const update = () => {
      const width = element.getBoundingClientRect().width;
      if (width > 0) {
        setScale(width / bannerPixelWidth);
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [bannerPixelWidth, values.bannerType]);

  const s = scale;

  const primaryRect: LayoutElementRect | null = !hasPrimaryLogo
    ? null
    : layoutOverlay
      ? layoutOverlay.primaryLogo
      : {
          left: L.LAYOUT_MARGIN + values.layoutPrimaryLogoDeltaX,
          top: L.LAYOUT_LOGO_TOP + values.layoutPrimaryLogoDeltaY,
          width: L.LAYOUT_PRIMARY_LOGO_BOX,
          height: L.LAYOUT_PRIMARY_LOGO_BOX
        };

  const secondaryRect: LayoutElementRect | null = !hasSecondaryLogo
    ? null
    : layoutOverlay
      ? layoutOverlay.secondaryLogo
      : {
          left: L.LAYOUT_SECONDARY_LOGO_LEFT + values.layoutSecondaryLogoDeltaX,
          top: L.LAYOUT_SECONDARY_LOGO_TOP + values.layoutSecondaryLogoDeltaY,
          width: L.LAYOUT_SECONDARY_LOGO_BOX,
          height: L.LAYOUT_SECONDARY_LOGO_BOX
        };

  const textRect: LayoutElementRect = layoutOverlay?.textBlock ?? {
    left: L.LAYOUT_TEXT_BLOCK_LEFT + values.layoutTextBlockDeltaX,
    top: L.LAYOUT_TEXT_BLOCK_TOP + values.layoutTextBlockDeltaY,
    width: L.LAYOUT_TEXT_BLOCK_WIDTH,
    height: L.LAYOUT_TEXT_BLOCK_HEIGHT
  };

  const phoneRect: LayoutElementRect | null = layoutOverlay
    ? layoutOverlay.phoneGroup
    : {
        left: L.LAYOUT_PHONE_REGION_LEFT + values.layoutPhoneGroupDeltaX,
        top: L.LAYOUT_PHONE_REGION_TOP + values.layoutPhoneGroupDeltaY,
        width: L.LAYOUT_PHONE_REGION_W,
        height: L.LAYOUT_PHONE_REGION_H
      };

  const handlePrimaryStop = useCallback(
    (_e: DraggableEvent, data: DraggableData) => {
      const commitScale = getCommitScale(containerRef.current, bannerPixelWidth, s);
      const dx = Math.round(data.x / commitScale);
      const dy = Math.round(data.y / commitScale);
      onLayoutDeltaChange({
        layoutPrimaryLogoDeltaX: clampDelta(values.layoutPrimaryLogoDeltaX + dx),
        layoutPrimaryLogoDeltaY: clampDelta(values.layoutPrimaryLogoDeltaY + dy)
      });
      onLayoutDragNudge("primary", dx, dy);
      setPrimaryDrag({ x: 0, y: 0 });
    },
    [
      bannerPixelWidth,
      onLayoutDeltaChange,
      onLayoutDragNudge,
      s,
      values.layoutPrimaryLogoDeltaX,
      values.layoutPrimaryLogoDeltaY
    ]
  );

  const handleSecondaryStop = useCallback(
    (_e: DraggableEvent, data: DraggableData) => {
      const commitScale = getCommitScale(containerRef.current, bannerPixelWidth, s);
      const dx = Math.round(data.x / commitScale);
      const dy = Math.round(data.y / commitScale);
      onLayoutDeltaChange({
        layoutSecondaryLogoDeltaX: clampDelta(values.layoutSecondaryLogoDeltaX + dx),
        layoutSecondaryLogoDeltaY: clampDelta(values.layoutSecondaryLogoDeltaY + dy)
      });
      onLayoutDragNudge("secondary", dx, dy);
      setSecondaryDrag({ x: 0, y: 0 });
    },
    [
      bannerPixelWidth,
      onLayoutDeltaChange,
      onLayoutDragNudge,
      s,
      values.layoutSecondaryLogoDeltaX,
      values.layoutSecondaryLogoDeltaY
    ]
  );

  const handleTextStop = useCallback(
    (_e: DraggableEvent, data: DraggableData) => {
      const commitScale = getCommitScale(containerRef.current, bannerPixelWidth, s);
      const dx = Math.round(data.x / commitScale);
      const dy = Math.round(data.y / commitScale);
      onLayoutDeltaChange({
        layoutTextBlockDeltaX: clampDelta(values.layoutTextBlockDeltaX + dx),
        layoutTextBlockDeltaY: clampDelta(values.layoutTextBlockDeltaY + dy)
      });
      onLayoutDragNudge("text", dx, dy);
      setTextDrag({ x: 0, y: 0 });
    },
    [
      bannerPixelWidth,
      onLayoutDeltaChange,
      onLayoutDragNudge,
      s,
      values.layoutTextBlockDeltaX,
      values.layoutTextBlockDeltaY
    ]
  );

  const handlePhoneStop = useCallback(
    (_e: DraggableEvent, data: DraggableData) => {
      const commitScale = getCommitScale(containerRef.current, bannerPixelWidth, s);
      const dx = Math.round(data.x / commitScale);
      const dy = Math.round(data.y / commitScale);
      onLayoutDeltaChange({
        layoutPhoneGroupDeltaX: clampDelta(values.layoutPhoneGroupDeltaX + dx),
        layoutPhoneGroupDeltaY: clampDelta(values.layoutPhoneGroupDeltaY + dy)
      });
      onLayoutDragNudge("phone", dx, dy);
      setPhoneDrag({ x: 0, y: 0 });
    },
    [
      bannerPixelWidth,
      onLayoutDeltaChange,
      onLayoutDragNudge,
      s,
      values.layoutPhoneGroupDeltaX,
      values.layoutPhoneGroupDeltaY
    ]
  );

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0">
      {primaryRect ? (
        <Draggable
          nodeRef={primaryRef}
          bounds="parent"
          position={primaryDrag}
          scale={1}
          onDrag={(_e, data) => setPrimaryDrag({ x: data.x, y: data.y })}
          onStop={handlePrimaryStop}
        >
          <div
            ref={primaryRef}
            role="button"
            tabIndex={0}
            aria-label="Drag primary logo"
            className={handleClass}
            style={rectToStyle(primaryRect, s)}
          />
        </Draggable>
      ) : null}

      {secondaryRect ? (
        <Draggable
          nodeRef={secondaryRef}
          bounds="parent"
          position={secondaryDrag}
          scale={1}
          onDrag={(_e, data) => setSecondaryDrag({ x: data.x, y: data.y })}
          onStop={handleSecondaryStop}
        >
          <div
            ref={secondaryRef}
            role="button"
            tabIndex={0}
            aria-label="Drag secondary logo"
            className={handleClass}
            style={rectToStyle(secondaryRect, s)}
          />
        </Draggable>
      ) : null}

      <Draggable
        nodeRef={textRef}
        bounds="parent"
        position={textDrag}
        scale={1}
        onDrag={(_e, data) => setTextDrag({ x: data.x, y: data.y })}
        onStop={handleTextStop}
      >
        <div
          ref={textRef}
          role="button"
          tabIndex={0}
          aria-label="Drag title and description text block"
          className={handleClass}
          style={rectToStyle(textRect, s)}
        />
      </Draggable>

      {phoneRect ? (
        <Draggable
          nodeRef={phoneRef}
          bounds="parent"
          position={phoneDrag}
          scale={1}
          onDrag={(_e, data) => setPhoneDrag({ x: data.x, y: data.y })}
          onStop={handlePhoneStop}
        >
          <div
            ref={phoneRef}
            role="button"
            tabIndex={0}
            aria-label="Drag phone number and icon"
            className={handleClass}
            style={rectToStyle(phoneRect, s)}
          />
        </Draggable>
      ) : null}
    </div>
  );
};
