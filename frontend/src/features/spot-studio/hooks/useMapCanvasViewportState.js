import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  CANVAS_MAX_SCALE,
  CANVAS_MIN_SCALE,
  CANVAS_ZOOM_IN_STEP,
  CANVAS_ZOOM_OUT_STEP,
  clamp,
  clampEditorViewport,
  EDITOR_ZOOM_IN_STEP,
  EDITOR_ZOOM_OUT_STEP,
  getFitEditorViewBox,
  getFitViewport
} from "../utils/mapCanvasViewport";

export default function useMapCanvasViewportState({
  deckId,
  spotId,
  interactive,
  showSpotEditorLayer,
  imageWidth,
  imageHeight,
  editorMaxZoom,
  onViewportChange,
  suppressClickRef
}) {
  const canvasRef = useRef(null);
  const panStateRef = useRef(null);
  const isViewportManualRef = useRef(false);
  const [viewport, setViewport] = useState({ scale: 1, x: 0, y: 0 });
  const [editorViewBox, setEditorViewBox] = useState({ x: 0, y: 0, width: 1600, height: 900 });
  const [isPanning, setIsPanning] = useState(false);
  const [isMapActive, setIsMapActive] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  function getMapPointFromClient(clientX, clientY) {
    const rect = canvasRef.current?.getBoundingClientRect();

    if (!rect) {
      return { x: 0, y: 0 };
    }

    if (showSpotEditorLayer) {
      const ratioX = (clientX - rect.left) / Math.max(1, rect.width);
      const ratioY = (clientY - rect.top) / Math.max(1, rect.height);

      return {
        x: clamp(editorViewBox.x + editorViewBox.width * ratioX, 0, imageWidth),
        y: clamp(editorViewBox.y + editorViewBox.height * ratioY, 0, imageHeight)
      };
    }

    const localX = (clientX - rect.left - viewport.x) / viewport.scale;
    const localY = (clientY - rect.top - viewport.y) / viewport.scale;

    return {
      x: clamp(localX, 0, imageWidth),
      y: clamp(localY, 0, imageHeight)
    };
  }

  useEffect(() => {
    const canvasNode = canvasRef.current;
    if (canvasNode) {
      if (showSpotEditorLayer) {
        setEditorViewBox(getFitEditorViewBox(canvasNode.getBoundingClientRect(), imageWidth, imageHeight));
      } else {
        setViewport(getFitViewport(canvasNode.getBoundingClientRect(), imageWidth, imageHeight));
      }
    } else if (showSpotEditorLayer) {
      setEditorViewBox({ x: 0, y: 0, width: imageWidth, height: imageHeight });
    } else {
      setViewport({ scale: 1, x: 0, y: 0 });
    }
    isViewportManualRef.current = false;
    setIsPanning(false);
    panStateRef.current = null;
    suppressClickRef.current = false;
  }, [deckId, spotId, showSpotEditorLayer, imageWidth, imageHeight, suppressClickRef]);

  useLayoutEffect(() => {
    if (!canvasRef.current) {
      return undefined;
    }

    const canvasNode = canvasRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || isViewportManualRef.current) {
        return;
      }
      if (showSpotEditorLayer) {
        setEditorViewBox(getFitEditorViewBox(entry.contentRect, imageWidth, imageHeight));
      } else {
        setViewport(getFitViewport(entry.contentRect, imageWidth, imageHeight));
      }
    });

    observer.observe(canvasNode);
    return () => observer.disconnect();
  }, [deckId, spotId, imageWidth, imageHeight, showSpotEditorLayer]);

  useEffect(() => {
    if (!onViewportChange) {
      return;
    }

    if (showSpotEditorLayer) {
      const canvasWidth = canvasRef.current?.clientWidth || 1;
      onViewportChange({
        scale: canvasWidth / Math.max(1, editorViewBox.width),
        x: editorViewBox.x,
        y: editorViewBox.y,
        width: editorViewBox.width,
        height: editorViewBox.height
      });
      return;
    }

    onViewportChange({ scale: viewport.scale, x: viewport.x, y: viewport.y });
  }, [onViewportChange, viewport, editorViewBox, showSpotEditorLayer]);

  useEffect(() => {
    if (!interactive) {
      return undefined;
    }

    function onKeyDown(event) {
      if (event.code === "Space") {
        setIsSpacePressed(true);
      }
    }

    function onKeyUp(event) {
      if (event.code === "Space") {
        setIsSpacePressed(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [interactive]);

  useEffect(() => {
    if (!interactive || !canvasRef.current) {
      return undefined;
    }

    const node = canvasRef.current;

    function handleNativeWheel(event) {
      event.preventDefault();
      setIsMapActive(true);
      isViewportManualRef.current = true;

      const rect = node.getBoundingClientRect();
      const cursorX = event.clientX - rect.left;
      const cursorY = event.clientY - rect.top;
      const zoomFactor = event.deltaY < 0 ? 1 / EDITOR_ZOOM_IN_STEP : 1 / EDITOR_ZOOM_OUT_STEP;

      if (showSpotEditorLayer) {
        const fitViewBox = getFitEditorViewBox(rect, imageWidth, imageHeight);
        const ratioX = cursorX / Math.max(1, rect.width);
        const ratioY = cursorY / Math.max(1, rect.height);

        setEditorViewBox((current) => {
          const anchorX = current.x + current.width * ratioX;
          const anchorY = current.y + current.height * ratioY;
          const nextWidth = current.width * zoomFactor;
          const nextHeight = current.height * zoomFactor;
          return clampEditorViewport(
            {
              x: anchorX - nextWidth * ratioX,
              y: anchorY - nextHeight * ratioY,
              width: nextWidth,
              height: nextHeight
            },
            {
              fitViewportRect: fitViewBox,
              imageWidth,
              imageHeight,
              editorMaxZoom
            }
          );
        });
        return;
      }

      setViewport((current) => {
        const nextScale = clamp(
          Number(
            (
              current.scale *
              (event.deltaY < 0 ? CANVAS_ZOOM_IN_STEP : CANVAS_ZOOM_OUT_STEP)
            ).toFixed(4)
          ),
          CANVAS_MIN_SCALE,
          CANVAS_MAX_SCALE
        );
        const anchorX = (cursorX - current.x) / current.scale;
        const anchorY = (cursorY - current.y) / current.scale;

        return {
          scale: nextScale,
          x: cursorX - anchorX * nextScale,
          y: cursorY - anchorY * nextScale
        };
      });
    }

    node.addEventListener("wheel", handleNativeWheel, { passive: false });

    return () => {
      node.removeEventListener("wheel", handleNativeWheel);
    };
  }, [interactive, showSpotEditorLayer, imageWidth, imageHeight, editorMaxZoom]);

  return {
    canvasRef,
    panStateRef,
    isViewportManualRef,
    viewport,
    setViewport,
    editorViewBox,
    setEditorViewBox,
    isPanning,
    setIsPanning,
    isMapActive,
    setIsMapActive,
    isSpacePressed,
    getMapPointFromClient
  };
}
