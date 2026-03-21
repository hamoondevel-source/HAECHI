import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AREA_MIN_SIZE,
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
} from "./mapCanvasViewport";

export default function useMapCanvasInteraction({
  deckId,
  spotId,
  interactive,
  showSpotEditorLayer,
  originPlacementMode,
  edgeCreateMode,
  edgeLinkMode,
  imageWidth,
  imageHeight,
  editorMaxZoom,
  onViewportChange,
  spotEditor,
  selectedWaypointIds = [],
  activeWaypointGroup = null,
  edgeAnchorWaypointId = "",
  onCanvasClick,
  onMoveWaypoint,
  onMoveWaypoints,
  onMoveWaypointGroup,
  onMoveArea,
  onResizeArea,
  onCanvasContextMenu,
  onEdgeChainStart,
  onEdgeChainEnd,
  onMarqueeSelect,
  onCanvasBlankLeftClick,
  onSelectArea,
  onSelectWaypoint
}) {
  const canvasRef = useRef(null);
  const panStateRef = useRef(null);
  const draggingWaypointRef = useRef(null);
  const draggingGroupRef = useRef(null);
  const draggingAreaRef = useRef(null);
  const resizingAreaRef = useRef(null);
  const edgeChainRef = useRef({ active: false, waypointIds: [], cursor: null });
  const suppressContextMenuRef = useRef(false);
  const suppressClickRef = useRef(false);
  const marqueeRef = useRef(null);
  const isViewportManualRef = useRef(false);
  const [edgeChainPreview, setEdgeChainPreview] = useState({
    active: false,
    waypointIds: [],
    cursor: null
  });
  const [viewport, setViewport] = useState({ scale: 1, x: 0, y: 0 });
  const [editorViewBox, setEditorViewBox] = useState({ x: 0, y: 0, width: 1600, height: 900 });
  const [isPanning, setIsPanning] = useState(false);
  const [isMapActive, setIsMapActive] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [marqueeRect, setMarqueeRect] = useState(null);
  const waypointById = new Map((spotEditor?.waypoints ?? []).map((waypoint) => [waypoint.id, waypoint]));
  const selectedWaypointIdSet = new Set(
    Array.isArray(selectedWaypointIds) && selectedWaypointIds.length ? selectedWaypointIds : []
  );
  const selectedGroupWaypoints = activeWaypointGroup
    ? (spotEditor?.waypoints ?? []).filter((waypoint) => waypoint.groupId === activeWaypointGroup.id)
    : [];
  const activeEdgeAnchorId =
    edgeChainPreview.active && edgeChainPreview.waypointIds.length
      ? edgeChainPreview.waypointIds[edgeChainPreview.waypointIds.length - 1]
      : edgeAnchorWaypointId;

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
  }, [deckId, spotId, showSpotEditorLayer, imageWidth, imageHeight]);

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

  useEffect(() => {
    if (edgeCreateMode && edgeLinkMode === "hold") {
      return;
    }

    edgeChainRef.current = { active: false, waypointIds: [], cursor: null };
    setEdgeChainPreview({ active: false, waypointIds: [], cursor: null });
  }, [edgeCreateMode, edgeLinkMode]);

  function handleCanvasClick(event) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    if (!originPlacementMode && interactive && event.button === 0) {
      onCanvasBlankLeftClick?.();
    }

    if (!originPlacementMode || !onCanvasClick) {
      return;
    }

    onCanvasClick(getMapPointFromClient(event.clientX, event.clientY));
  }

  function handlePointerDown(event) {
    if (!interactive) {
      return;
    }

    const isPanGesture = event.button === 1 || (event.button === 0 && isSpacePressed);
    const isMarqueeGesture =
      event.button === 0 &&
      !isSpacePressed &&
      !originPlacementMode &&
      !edgeCreateMode &&
      showSpotEditorLayer;

    const interactiveTarget = event.target.closest(
      ".map-zone, .map-hazard, .map-pin, .map-robot, .map-waypoint-node, .map-waypoint-edge-hit, .map-editor-area-hit, .map-editor-area-resize-hit"
    );

    if (isMarqueeGesture && !interactiveTarget) {
      event.preventDefault();
      const startPoint = getMapPointFromClient(event.clientX, event.clientY);
      marqueeRef.current = {
        start: startPoint,
        current: startPoint
      };
      setMarqueeRect({
        x: startPoint.x,
        y: startPoint.y,
        width: 0,
        height: 0
      });
      return;
    }

    if (!isPanGesture || interactiveTarget) {
      return;
    }

    event.preventDefault();

    setIsMapActive(true);
    panStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: showSpotEditorLayer ? editorViewBox.x : viewport.x,
      originY: showSpotEditorLayer ? editorViewBox.y : viewport.y,
      moved: false
    };
  }

  function handlePointerMove(event) {
    if (marqueeRef.current) {
      const currentPoint = getMapPointFromClient(event.clientX, event.clientY);
      marqueeRef.current.current = currentPoint;
      const startPoint = marqueeRef.current.start;
      const x = Math.min(startPoint.x, currentPoint.x);
      const y = Math.min(startPoint.y, currentPoint.y);
      const width = Math.abs(currentPoint.x - startPoint.x);
      const height = Math.abs(currentPoint.y - startPoint.y);
      setMarqueeRect({ x, y, width, height });
      return;
    }

    if (interactive && edgeChainRef.current.active) {
      const point = getMapPointFromClient(event.clientX, event.clientY);
      edgeChainRef.current.cursor = point;
      setEdgeChainPreview((current) =>
        current.active
          ? {
              ...current,
              cursor: point
            }
          : current
      );
      return;
    }

    if (interactive && draggingWaypointRef.current) {
      const point = getMapPointFromClient(event.clientX, event.clientY);
      if (draggingWaypointRef.current.mode === "multi") {
        const deltaX = point.x - draggingWaypointRef.current.startPoint.x;
        const deltaY = point.y - draggingWaypointRef.current.startPoint.y;
        const updates = draggingWaypointRef.current.waypointIds.map((waypointId) => {
          const origin = draggingWaypointRef.current.startPositions.get(waypointId) ?? { x: 0, y: 0 };
          return {
            id: waypointId,
            x: clamp(origin.x + deltaX, 0, imageWidth),
            y: clamp(origin.y + deltaY, 0, imageHeight)
          };
        });
        onMoveWaypoints?.(updates);
      } else {
        onMoveWaypoint?.(draggingWaypointRef.current.waypointId, point);
      }
      suppressClickRef.current = true;
      return;
    }

    if (interactive && draggingGroupRef.current) {
      const point = getMapPointFromClient(event.clientX, event.clientY);
      const deltaX = point.x - draggingGroupRef.current.startPoint.x;
      const deltaY = point.y - draggingGroupRef.current.startPoint.y;
      const updates = draggingGroupRef.current.waypointIds.map((waypointId) => {
        const origin = draggingGroupRef.current.startPositions.get(waypointId) ?? { x: 0, y: 0 };
        return {
          id: waypointId,
          x: clamp(origin.x + deltaX, 0, imageWidth),
          y: clamp(origin.y + deltaY, 0, imageHeight)
        };
      });
      onMoveWaypointGroup?.(draggingGroupRef.current.groupId, updates);
      suppressClickRef.current = true;
      return;
    }

    if (interactive && resizingAreaRef.current) {
      const point = getMapPointFromClient(event.clientX, event.clientY);
      const { areaId, handle, startPoint, originArea } = resizingAreaRef.current;
      const deltaX = point.x - startPoint.x;
      const deltaY = point.y - startPoint.y;
      const originLeft = originArea.x;
      const originTop = originArea.y;
      const originRight = originArea.x + originArea.width;
      const originBottom = originArea.y + originArea.height;
      const nextLeft = handle.includes("w")
        ? clamp(originLeft + deltaX, 0, originRight - AREA_MIN_SIZE)
        : originLeft;
      const nextRight = handle.includes("e")
        ? clamp(originRight + deltaX, originLeft + AREA_MIN_SIZE, imageWidth)
        : originRight;
      const nextTop = handle.includes("n")
        ? clamp(originTop + deltaY, 0, originBottom - AREA_MIN_SIZE)
        : originTop;
      const nextBottom = handle.includes("s")
        ? clamp(originBottom + deltaY, originTop + AREA_MIN_SIZE, imageHeight)
        : originBottom;

      onResizeArea?.(areaId, {
        x: nextLeft,
        y: nextTop,
        width: nextRight - nextLeft,
        height: nextBottom - nextTop
      });
      suppressClickRef.current = true;
      return;
    }

    if (interactive && draggingAreaRef.current) {
      const point = getMapPointFromClient(event.clientX, event.clientY);
      const areaWidth = draggingAreaRef.current.width ?? 0;
      const areaHeight = draggingAreaRef.current.height ?? 0;
      onMoveArea?.(draggingAreaRef.current.areaId, {
        x: clamp(point.x - draggingAreaRef.current.offsetX, 0, Math.max(0, imageWidth - areaWidth)),
        y: clamp(point.y - draggingAreaRef.current.offsetY, 0, Math.max(0, imageHeight - areaHeight))
      });
      suppressClickRef.current = true;
      return;
    }

    if (!interactive || !panStateRef.current) {
      return;
    }

    const deltaX = event.clientX - panStateRef.current.startX;
    const deltaY = event.clientY - panStateRef.current.startY;
    const movedEnough = Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4;

    if (!movedEnough) {
      return;
    }

    isViewportManualRef.current = true;
    const { originX, originY } = panStateRef.current;
    panStateRef.current.moved = true;
    setIsPanning(true);
    if (showSpotEditorLayer && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const fitViewBox = getFitEditorViewBox(rect, imageWidth, imageHeight);
      const mapDeltaX = (deltaX / Math.max(1, rect.width)) * editorViewBox.width;
      const mapDeltaY = (deltaY / Math.max(1, rect.height)) * editorViewBox.height;
      setEditorViewBox((current) =>
        clampEditorViewport(
          {
            ...current,
            x: originX - mapDeltaX,
            y: originY - mapDeltaY
          },
          {
            fitViewportRect: fitViewBox,
            imageWidth,
            imageHeight,
            editorMaxZoom
          }
        )
      );
      return;
    }

    setViewport((current) => ({
      ...current,
      x: originX + deltaX,
      y: originY + deltaY
    }));
  }

  function handlePointerEnd() {
    if (marqueeRef.current) {
      const { start, current } = marqueeRef.current;
      marqueeRef.current = null;
      setMarqueeRect(null);

      const minX = Math.min(start.x, current.x);
      const minY = Math.min(start.y, current.y);
      const maxX = Math.max(start.x, current.x);
      const maxY = Math.max(start.y, current.y);
      const boxWidth = Math.abs(maxX - minX);
      const boxHeight = Math.abs(maxY - minY);

      if (boxWidth > 2 || boxHeight > 2) {
        const isPointInside = (point) =>
          point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
        const waypointIds = (spotEditor?.waypoints ?? [])
          .filter((waypoint) => isPointInside({ x: waypoint.x, y: waypoint.y }))
          .map((waypoint) => waypoint.id);
        const waypointSet = new Set(waypointIds);
        const edgeIds = (spotEditor?.edges ?? [])
          .filter((edge) => waypointSet.has(edge.from) && waypointSet.has(edge.to))
          .map((edge) => edge.id);

        onMarqueeSelect?.({
          waypointIds,
          edgeIds
        });
        suppressClickRef.current = true;
      }
      return;
    }

    if (edgeChainRef.current.active) {
      const chainPath = [...(edgeChainRef.current.waypointIds ?? [])];
      edgeChainRef.current = { active: false, waypointIds: [], cursor: null };
      setEdgeChainPreview({ active: false, waypointIds: [], cursor: null });
      suppressContextMenuRef.current = true;
      onEdgeChainEnd?.(chainPath);
      return;
    }

    if (draggingWaypointRef.current) {
      draggingWaypointRef.current = null;
      return;
    }

    if (draggingGroupRef.current) {
      draggingGroupRef.current = null;
      return;
    }

    if (draggingAreaRef.current) {
      draggingAreaRef.current = null;
      return;
    }

    if (resizingAreaRef.current) {
      resizingAreaRef.current = null;
      return;
    }

    if (!interactive || !panStateRef.current) {
      return;
    }

    if (panStateRef.current.moved) {
      suppressClickRef.current = true;
    }

    panStateRef.current = null;
    setIsPanning(false);
  }

  function handleCanvasContextMenu(event) {
    if (!interactive) {
      return;
    }

    event.preventDefault();
    if (edgeCreateMode && edgeLinkMode === "hold") {
      return;
    }
    if (suppressContextMenuRef.current) {
      suppressContextMenuRef.current = false;
      return;
    }
    onCanvasContextMenu?.(event, {
      type: "canvas",
      point: getMapPointFromClient(event.clientX, event.clientY)
    });
  }

  function handleWaypointPointerDown(event, waypointId) {
    if (!interactive) {
      return;
    }

    if (edgeCreateMode && edgeLinkMode === "hold" && event.button === 2) {
      event.preventDefault();
      event.stopPropagation();
      setIsMapActive(true);
      const initialPath = [waypointId];
      edgeChainRef.current = { active: true, waypointIds: initialPath, cursor: null };
      setEdgeChainPreview({ active: true, waypointIds: initialPath, cursor: null });
      suppressContextMenuRef.current = true;
      onEdgeChainStart?.(waypointId);
      return;
    }

    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setIsMapActive(true);
    const shouldMoveMulti = selectedWaypointIdSet.has(waypointId) && selectedWaypointIdSet.size > 1;
    if (shouldMoveMulti) {
      const startPoint = getMapPointFromClient(event.clientX, event.clientY);
      const waypointIds = Array.from(selectedWaypointIdSet).filter((id) => waypointById.has(id));
      const startPositions = new Map(
        waypointIds.map((id) => {
          const waypoint = waypointById.get(id);
          return [id, { x: waypoint?.x ?? 0, y: waypoint?.y ?? 0 }];
        })
      );
      draggingWaypointRef.current = {
        mode: "multi",
        waypointIds,
        startPoint,
        startPositions
      };
      return;
    }

    draggingWaypointRef.current = { mode: "single", waypointId };
  }

  function handleWaypointPointerEnter(event, waypointId) {
    if (!interactive || !edgeCreateMode || edgeLinkMode !== "hold") {
      return;
    }

    const chainState = edgeChainRef.current;

    if (!chainState.active || (event.buttons & 2) !== 2) {
      return;
    }

    const path = chainState.waypointIds ?? [];
    const lastWaypointId = path[path.length - 1];

    if (!lastWaypointId || lastWaypointId === waypointId) {
      return;
    }

    const nextPath = [...path, waypointId];
    chainState.waypointIds = nextPath;
    setEdgeChainPreview((current) => ({
      ...current,
      active: true,
      waypointIds: nextPath
    }));
  }

  function handleWaypointClick(event, waypointId) {
    event.stopPropagation();
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    onSelectWaypoint?.(waypointId);
  }

  function handleGroupPointerDown(event) {
    if (!interactive || !activeWaypointGroup || !selectedGroupWaypoints.length || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setIsMapActive(true);
    const startPoint = getMapPointFromClient(event.clientX, event.clientY);
    const startPositions = new Map(
      selectedGroupWaypoints.map((waypoint) => [waypoint.id, { x: waypoint.x, y: waypoint.y }])
    );

    draggingGroupRef.current = {
      groupId: activeWaypointGroup.id,
      waypointIds: selectedGroupWaypoints.map((waypoint) => waypoint.id),
      startPoint,
      startPositions
    };
  }

  function handleAreaPointerDown(event, area) {
    if (!interactive || !area || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setIsMapActive(true);
    onSelectArea?.(area.id);
    const startPoint = getMapPointFromClient(event.clientX, event.clientY);
    draggingAreaRef.current = {
      areaId: area.id,
      offsetX: startPoint.x - area.x,
      offsetY: startPoint.y - area.y,
      width: area.width,
      height: area.height
    };
  }

  function handleAreaResizePointerDown(event, area, handle) {
    if (!interactive || !area || !handle || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setIsMapActive(true);
    onSelectArea?.(area.id);
    resizingAreaRef.current = {
      areaId: area.id,
      handle,
      startPoint: getMapPointFromClient(event.clientX, event.clientY),
      originArea: {
        x: area.x,
        y: area.y,
        width: area.width,
        height: area.height
      }
    };
  }

  return {
    canvasRef,
    viewport,
    editorViewBox,
    isPanning,
    isMapActive,
    marqueeRect,
    edgeChainPreview,
    activeEdgeAnchorId,
    setIsMapActive,
    handleCanvasClick,
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
    handleCanvasContextMenu,
    handleWaypointPointerDown,
    handleWaypointPointerEnter,
    handleWaypointClick,
    handleGroupPointerDown,
    handleAreaPointerDown,
    handleAreaResizePointerDown
  };
}
