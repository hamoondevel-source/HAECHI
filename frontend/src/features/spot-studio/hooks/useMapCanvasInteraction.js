import { useRef } from "react";
import useMapCanvasEdgeChainInteraction from "./useMapCanvasEdgeChainInteraction";
import useMapCanvasMarqueeInteraction from "./useMapCanvasMarqueeInteraction";
import useMapCanvasPointerDragInteraction from "./useMapCanvasPointerDragInteraction";
import useMapCanvasViewportState from "./useMapCanvasViewportState";

export default function useMapCanvasInteraction({
  deckId,
  spotId,
  interactive,
  editable = interactive,
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
  const suppressClickRef = useRef(false);
  const waypointById = new Map((spotEditor?.waypoints ?? []).map((waypoint) => [waypoint.id, waypoint]));
  const selectedWaypointIdSet = new Set(
    Array.isArray(selectedWaypointIds) && selectedWaypointIds.length ? selectedWaypointIds : []
  );
  const selectedGroupWaypoints = activeWaypointGroup
    ? (spotEditor?.waypoints ?? []).filter((waypoint) => waypoint.groupId === activeWaypointGroup.id)
    : [];

  const {
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
  } = useMapCanvasViewportState({
    deckId,
    spotId,
    interactive,
    showSpotEditorLayer,
    imageWidth,
    imageHeight,
    editorMaxZoom,
    onViewportChange,
    suppressClickRef
  });

  const {
    marqueeRect,
    maybeStartMarquee,
    handlePointerMove: handleMarqueePointerMove,
    handlePointerEnd: handleMarqueePointerEnd
  } = useMapCanvasMarqueeInteraction({
    interactive,
    showSpotEditorLayer,
    originPlacementMode,
    edgeCreateMode,
    isSpacePressed,
    spotEditor,
    getMapPointFromClient,
    onMarqueeSelect,
    suppressClickRef
  });

  const {
    edgeChainPreview,
    activeEdgeAnchorId,
    handlePointerMove: handleEdgeChainPointerMove,
    handlePointerEnd: handleEdgeChainPointerEnd,
    handleWaypointPointerDown: handleEdgeChainWaypointPointerDown,
    handleWaypointPointerEnter,
    consumeSuppressedContextMenu
  } = useMapCanvasEdgeChainInteraction({
    interactive,
    editable,
    edgeCreateMode,
    edgeLinkMode,
    edgeAnchorWaypointId,
    getMapPointFromClient,
    onEdgeChainStart,
    onEdgeChainEnd
  });

  const {
    handleCanvasClick,
    handleCanvasPointerDown,
    handlePointerMove: handlePointerDragMove,
    handlePointerEnd: handlePointerDragEnd,
    handleCanvasContextMenu,
    handleWaypointPointerDown,
    handleWaypointClick,
    handleGroupPointerDown,
    handleAreaPointerDown,
    handleAreaResizePointerDown
  } = useMapCanvasPointerDragInteraction({
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
  });

  function handlePointerDown(event) {
    if (!interactive) {
      return;
    }

    if (maybeStartMarquee(event)) {
      return;
    }

    handleCanvasPointerDown(event);
  }

  function handlePointerMove(event) {
    if (handleMarqueePointerMove(event)) {
      return;
    }

    if (handleEdgeChainPointerMove(event)) {
      return;
    }

    handlePointerDragMove(event);
  }

  function handlePointerEnd() {
    if (handleMarqueePointerEnd()) {
      return;
    }

    if (handleEdgeChainPointerEnd()) {
      return;
    }

    handlePointerDragEnd();
  }

  function handleWaypointPointerDownWithEdgeChain(event, waypointId) {
    if (handleEdgeChainWaypointPointerDown(event, waypointId)) {
      setIsMapActive(true);
      return;
    }

    handleWaypointPointerDown(event, waypointId);
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
    handleWaypointPointerDown: handleWaypointPointerDownWithEdgeChain,
    handleWaypointPointerEnter,
    handleWaypointClick,
    handleGroupPointerDown,
    handleAreaPointerDown,
    handleAreaResizePointerDown
  };
}
