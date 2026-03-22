import { MAP_CANVAS_INTERACTIVE_TARGET_SELECTOR } from "../utils/mapCanvasInteractionShared";
import { clampEditorViewport, getFitEditorViewBox } from "../utils/mapCanvasViewport";
import useMapCanvasObjectDragInteraction from "./useMapCanvasObjectDragInteraction";

export default function useMapCanvasPointerDragInteraction({
  interactive,
  editable,
  originPlacementMode,
  edgeCreateMode,
  edgeLinkMode,
  showSpotEditorLayer,
  imageWidth,
  imageHeight,
  editorMaxZoom,
  viewport,
  setViewport,
  editorViewBox,
  setEditorViewBox,
  canvasRef,
  panStateRef,
  isViewportManualRef,
  setIsPanning,
  setIsMapActive,
  isSpacePressed,
  getMapPointFromClient,
  waypointById,
  selectedWaypointIdSet,
  activeWaypointGroup,
  selectedGroupWaypoints,
  onCanvasClick,
  onMoveWaypoint,
  onMoveWaypoints,
  onMoveWaypointGroup,
  onMoveArea,
  onResizeArea,
  onCanvasContextMenu,
  onCanvasBlankLeftClick,
  onSelectArea,
  onSelectWaypoint,
  consumeSuppressedContextMenu,
  suppressClickRef
}) {
  const objectDragInteraction = useMapCanvasObjectDragInteraction({
    interactive,
    editable,
    imageWidth,
    imageHeight,
    getMapPointFromClient,
    waypointById,
    selectedWaypointIdSet,
    activeWaypointGroup,
    selectedGroupWaypoints,
    setIsMapActive,
    onMoveWaypoint,
    onMoveWaypoints,
    onMoveWaypointGroup,
    onMoveArea,
    onResizeArea,
    onSelectArea,
    onSelectWaypoint,
    suppressClickRef
  });

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

  function handleCanvasPointerDown(event) {
    if (!interactive) {
      return false;
    }

    const isPanGesture = event.button === 1 || (event.button === 0 && isSpacePressed);
    const interactiveTarget = event.target.closest(MAP_CANVAS_INTERACTIVE_TARGET_SELECTOR);

    if (!isPanGesture || interactiveTarget) {
      return false;
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
    return true;
  }

  function handlePointerMove(event) {
    if (objectDragInteraction.handlePointerMove(event)) {
      return true;
    }

    if (!interactive || !panStateRef.current) {
      return false;
    }

    const deltaX = event.clientX - panStateRef.current.startX;
    const deltaY = event.clientY - panStateRef.current.startY;
    const movedEnough = Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4;

    if (!movedEnough) {
      return false;
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
      return true;
    }

    setViewport((current) => ({
      ...current,
      x: originX + deltaX,
      y: originY + deltaY
    }));
    return true;
  }

  function handlePointerEnd() {
    if (objectDragInteraction.handlePointerEnd()) {
      return true;
    }

    if (!interactive || !panStateRef.current) {
      return false;
    }

    if (panStateRef.current.moved) {
      suppressClickRef.current = true;
    }

    panStateRef.current = null;
    setIsPanning(false);
    return true;
  }

  function handleCanvasContextMenu(event) {
    if (!interactive) {
      return;
    }

    event.preventDefault();
    if (!editable) {
      return;
    }
    if (edgeCreateMode && edgeLinkMode === "hold") {
      return;
    }
    if (consumeSuppressedContextMenu?.()) {
      return;
    }
    onCanvasContextMenu?.(event, {
      type: "canvas",
      point: getMapPointFromClient(event.clientX, event.clientY)
    });
  }

  return {
    handleCanvasClick,
    handleCanvasPointerDown,
    handlePointerMove,
    handlePointerEnd,
    handleCanvasContextMenu,
    handleWaypointPointerDown: objectDragInteraction.handleWaypointPointerDown,
    handleWaypointClick: objectDragInteraction.handleWaypointClick,
    handleGroupPointerDown: objectDragInteraction.handleGroupPointerDown,
    handleAreaPointerDown: objectDragInteraction.handleAreaPointerDown,
    handleAreaResizePointerDown: objectDragInteraction.handleAreaResizePointerDown
  };
}
