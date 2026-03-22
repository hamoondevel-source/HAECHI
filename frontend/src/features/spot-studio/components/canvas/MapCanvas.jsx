import { useId, useRef, useState } from "react";
import MapCanvasEditorChrome from "./MapCanvasEditorChrome";
import MapCanvasMiniMap from "./MapCanvasMiniMap";
import MapCanvasWorld from "./MapCanvasWorld";
import SpotEditorOverlay from "./SpotEditorOverlay";
import { normalizeSpotEditor } from "../../model/spotEditorModel";
import {
  EDITOR_MAX_ZOOM,
  getAdaptiveOverlayScale,
  getMapDimensionMaxZoom,
  getMapDimensionScale,
  getResolutionScale,
  getSpotCalibration,
  resolveMapImageSrc
} from "../../utils/mapCanvasViewport";
import { withAlpha } from "../../utils/mapCanvasOverlayUtils";
import useMapCanvasInteraction from "../../hooks/useMapCanvasInteraction";
import { SPOT_STUDIO_GRID_COLOR } from "../../constants/spotStudioColors";

export default function MapCanvas({
  deck,
  robots,
  accessibleSpotIds,
  selectedRobotId,
  selectedNode,
  onSelectRobot,
  onCanvasClick,
  onSelectSpot,
  onSelectNoGo,
  onSelectDock,
  onMoveSpot,
  onMoveNoGo,
  onMoveDock,
  showSpots,
  showNoGo,
  showDocks,
  interactive = false,
  editable = interactive,
  originPlacementMode = false,
  showMiniMap = false,
  onViewportChange,
  spotEditorData = null,
  showSpotEditorLayer = false,
  spotLayerVisibility = null,
  onToggleSpotLayerVisibility,
  edgeCreateMode = false,
  edgeDirectionMode = "bidirectional",
  edgeLinkMode = "hold",
  selectedWaypointId = "",
  selectedEdgeId = "",
  selectedAreaId = "",
  selectedWaypointIds = [],
  selectedEdgeIds = [],
  activeWaypointGroup = null,
  isGroupSelectionActive = false,
  edgeAnchorWaypointId = "",
  onSelectWaypoint,
  onFocusWaypoint,
  onSelectEdge,
  onSelectArea,
  onSelectGroup,
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
  onExternalDropItem,
  onExternalDropActiveChange,
  lockToDeckScope = false
}) {
  const svgDefsId = useId().replace(/:/g, "");
  const [isRenderToolboxCollapsed, setIsRenderToolboxCollapsed] = useState(false);
  const externalDragDepthRef = useRef(0);
  const suppressWorldClickRef = useRef(false);

  if (!deck) {
    return <div className="empty-state">표시할 맵이 없습니다.</div>;
  }

  const mapScope = lockToDeckScope
    ? {
        spot: null,
        calibration: deck?.calibration ?? null
      }
    : getSpotCalibration(deck, selectedNode);
  const activeImage = lockToDeckScope ? deck.image ?? null : mapScope.spot?.image ?? deck.image ?? null;
  const imageWidth = activeImage?.width ?? deck.image?.width ?? 1600;
  const imageHeight = activeImage?.height ?? deck.image?.height ?? 900;
  const mapImageSrc = resolveMapImageSrc(activeImage) ?? resolveMapImageSrc(deck.image);
  const activeCalibration = mapScope.calibration;
  const gridStepPx = ((activeCalibration?.gridMeters ?? 1) / (activeCalibration?.resolution ?? 0.05)) || 20;
  const normalizedGridStepPx = Math.max(8, gridStepPx);
  const originX = Number(activeCalibration?.origin?.x ?? 0);
  const originY = Number(activeCalibration?.origin?.y ?? 0);
  const gridRotationDeg = Number(activeCalibration?.rotation ?? 0);
  const gridColor = activeCalibration?.gridColor ?? SPOT_STUDIO_GRID_COLOR;
  const gridOpacity = Math.min(1, Math.max(0.05, Number(activeCalibration?.gridOpacity ?? 0.26)));
  const gridCount = Math.max(4, Math.min(120, Number(activeCalibration?.gridCount ?? 20)));
  const gridPlaneWidth = normalizedGridStepPx * gridCount * 2;
  const gridPlaneHeight = normalizedGridStepPx * gridCount * 2;
  const gridLineColor = withAlpha(gridColor, gridOpacity);
  const gridHighlightColor = withAlpha(gridColor, Math.min(1, gridOpacity + 0.16));
  const mapEditorGridPatternId = `map-editor-grid-pattern-${svgDefsId}`;
  const mapEditorFallbackPatternId = `map-editor-fallback-pattern-${svgDefsId}`;
  const spotEditor = normalizeSpotEditor(spotEditorData);
  const visibleSpotLayers = {
    grid: spotLayerVisibility?.grid !== false,
    waypoints: spotLayerVisibility?.waypoints !== false,
    edges: spotLayerVisibility?.edges !== false,
    areas: spotLayerVisibility?.areas !== false,
    groups: spotLayerVisibility?.groups !== false
  };

  const {
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
  } = useMapCanvasInteraction({
    deckId: deck?.id,
    spotId: lockToDeckScope ? "" : mapScope.spot?.id,
    interactive,
    editable,
    showSpotEditorLayer,
    originPlacementMode,
    edgeCreateMode,
    edgeLinkMode,
    imageWidth,
    imageHeight,
    editorMaxZoom: getMapDimensionMaxZoom(imageWidth, imageHeight, {
      baseZoom: EDITOR_MAX_ZOOM,
      exponent: 0.26,
      min: 6.4,
      max: 10.8
    }),
    onViewportChange,
    spotEditor,
    selectedWaypointIds,
    activeWaypointGroup,
    edgeAnchorWaypointId,
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
  });

  const editorCanvasRect = canvasRef.current?.getBoundingClientRect() ?? {
    width: imageWidth,
    height: imageHeight
  };
  const editorCanvasScale = Math.min(
    editorCanvasRect.width / Math.max(1, editorViewBox.width),
    editorCanvasRect.height / Math.max(1, editorViewBox.height)
  );
  const waypointMapScale = showSpotEditorLayer
    ? getMapDimensionScale(imageWidth, imageHeight, {
        exponent: 0.18,
        min: 0.86,
        max: 1.2
      })
    : 1;
  const groupTagMapScale = showSpotEditorLayer
    ? getMapDimensionScale(imageWidth, imageHeight, {
        exponent: 0.14,
        min: 0.9,
        max: 1.14
      })
    : 1;
  const waypointResolutionScale = showSpotEditorLayer
    ? getResolutionScale(activeCalibration?.resolution, {
        reference: 0.12,
        exponent: 0.07,
        min: 0.94,
        max: 1.1
      })
    : 1;
  const groupTagResolutionScale = showSpotEditorLayer
    ? getResolutionScale(activeCalibration?.resolution, {
        reference: 0.12,
        exponent: 0.05,
        min: 0.96,
        max: 1.08
      })
    : 1;
  const waypointVisualScale = showSpotEditorLayer
    ? getAdaptiveOverlayScale({
        baseUnitSize: 18,
        targetPx: 26,
        canvasScale: editorCanvasScale,
        zoomExponent: 0.12,
        mapScale: waypointMapScale,
        resolutionScale: waypointResolutionScale,
        min: 0.22,
        max: 2.6
      })
    : 1;
  const groupTagVisualScale = showSpotEditorLayer
    ? getAdaptiveOverlayScale({
        baseUnitSize: 14,
        targetPx: 30,
        canvasScale: editorCanvasScale,
        zoomExponent: 0.08,
        mapScale: groupTagMapScale,
        resolutionScale: groupTagResolutionScale,
        min: 0.28,
        max: 2.4
      })
    : 1;
  const renderLayerButtons = [
    { id: "grid", label: "GRID" },
    { id: "waypoints", label: "WP" },
    { id: "edges", label: "EDGE" },
    { id: "areas", label: "AREA" },
    { id: "groups", label: "GROUP" }
  ];
  const modeIndicatorMeta = edgeCreateMode
    ? {
        label: "EDGE",
        detail: `${edgeDirectionMode === "unidirectional" ? "UNI" : "BI"} / ${
          edgeLinkMode === "single" ? "SINGLE" : "HOLD"
        }`,
        toneClassName: "is-edge"
      }
    : originPlacementMode
      ? {
          label: "ORIGIN",
          detail: "PLACE",
          toneClassName: "is-origin"
        }
      : {
          label: "VIEW",
          detail: "SELECT",
          toneClassName: ""
        };
  const availableSpotIds = accessibleSpotIds ?? [];
  const robotItems = robots ?? [];

  function isDeckItemDragEvent(event) {
    return event.dataTransfer?.types?.includes("application/x-haechi-deck-item");
  }

  function handleExternalDragEnter(event) {
    if (!editable || !onExternalDropItem || !isDeckItemDragEvent(event)) {
      return;
    }

    event.preventDefault();
    externalDragDepthRef.current += 1;
    onExternalDropActiveChange?.(true);
  }

  function handleExternalDragOver(event) {
    if (!editable || !onExternalDropItem || !isDeckItemDragEvent(event)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    onExternalDropActiveChange?.(true);
  }

  function handleExternalDragLeave(event) {
    if (!editable || !onExternalDropItem) {
      return;
    }

    event.preventDefault();
    externalDragDepthRef.current = Math.max(0, externalDragDepthRef.current - 1);

    if (externalDragDepthRef.current === 0) {
      onExternalDropActiveChange?.(false);
    }
  }

  function handleExternalDrop(event) {
    if (!editable || !onExternalDropItem || !isDeckItemDragEvent(event)) {
      return;
    }

    event.preventDefault();
    externalDragDepthRef.current = 0;
    onExternalDropActiveChange?.(false);

    const rawPayload = event.dataTransfer.getData("application/x-haechi-deck-item");

    if (!rawPayload) {
      return;
    }

    let payload = null;

    try {
      payload = JSON.parse(rawPayload);
    } catch {
      payload = null;
    }

    if (!payload) {
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const scale = Math.max(0.0001, Number(viewport.scale ?? 1));
    const point = {
      x: (event.clientX - rect.left - Number(viewport.x ?? 0)) / scale,
      y: (event.clientY - rect.top - Number(viewport.y ?? 0)) / scale
    };

    onExternalDropItem(payload, point);
  }

  function handleCanvasClickWithWorldSuppression(event) {
    if (suppressWorldClickRef.current) {
      suppressWorldClickRef.current = false;
      return;
    }

    handleCanvasClick(event);
  }

  return (
    <div
      ref={canvasRef}
      className={`map-canvas ${interactive ? "is-interactive" : ""} ${isMapActive ? "is-active" : ""} ${
        isPanning ? "is-panning" : ""
      } ${originPlacementMode ? "is-origin-mode" : ""} ${edgeCreateMode ? "is-edge-mode" : ""}`}
      style={{
        aspectRatio: showSpotEditorLayer ? "auto" : `${imageWidth} / ${imageHeight}`
      }}
      tabIndex={interactive ? 0 : undefined}
      onClick={handleCanvasClickWithWorldSuppression}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerLeave={handlePointerEnd}
      onMouseEnter={() => {
        if (interactive) {
          setIsMapActive(true);
        }
      }}
      onContextMenu={handleCanvasContextMenu}
      onDragEnter={handleExternalDragEnter}
      onDragOver={handleExternalDragOver}
      onDragLeave={handleExternalDragLeave}
      onDrop={handleExternalDrop}
    >
      {showSpotEditorLayer ? (
        <SpotEditorOverlay
          mapImageSrc={mapImageSrc}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          editorViewBox={editorViewBox}
          mapEditorGridPatternId={mapEditorGridPatternId}
          mapEditorFallbackPatternId={mapEditorFallbackPatternId}
          originX={originX}
          originY={originY}
          normalizedGridStepPx={normalizedGridStepPx}
          gridRotationDeg={gridRotationDeg}
          gridPlaneWidth={gridPlaneWidth}
          gridPlaneHeight={gridPlaneHeight}
          gridColor={gridColor}
          gridOpacity={gridOpacity}
          visibleSpotLayers={visibleSpotLayers}
          spotEditor={spotEditor}
          selectedWaypointId={selectedWaypointId}
          selectedWaypointIds={selectedWaypointIds}
          selectedEdgeId={selectedEdgeId}
          selectedEdgeIds={selectedEdgeIds}
          selectedAreaId={selectedAreaId}
          activeWaypointGroup={activeWaypointGroup}
          isGroupSelectionActive={isGroupSelectionActive}
          edgeCreateMode={edgeCreateMode}
          edgeLinkMode={edgeLinkMode}
          activeEdgeAnchorId={activeEdgeAnchorId}
          edgeChainPreview={edgeChainPreview}
          waypointVisualScale={waypointVisualScale}
          groupTagVisualScale={groupTagVisualScale}
          marqueeRect={marqueeRect}
          onFocusWaypoint={onFocusWaypoint}
          onSelectEdge={onSelectEdge}
          onSelectArea={onSelectArea}
          onSelectGroup={onSelectGroup}
          onCanvasContextMenu={onCanvasContextMenu}
          handleWaypointPointerDown={handleWaypointPointerDown}
          handleWaypointPointerEnter={handleWaypointPointerEnter}
          handleWaypointClick={handleWaypointClick}
          handleGroupPointerDown={handleGroupPointerDown}
          handleAreaPointerDown={handleAreaPointerDown}
          handleAreaResizePointerDown={handleAreaResizePointerDown}
        />
      ) : (
        <MapCanvasWorld
          showSpotEditorLayer={showSpotEditorLayer}
          mapImageSrc={mapImageSrc}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          viewport={viewport}
          visibleSpotLayers={visibleSpotLayers}
          originX={originX}
          originY={originY}
          gridPlaneWidth={gridPlaneWidth}
          gridPlaneHeight={gridPlaneHeight}
          normalizedGridStepPx={normalizedGridStepPx}
          gridLineColor={gridLineColor}
          gridHighlightColor={gridHighlightColor}
          gridRotationDeg={gridRotationDeg}
          activeCalibration={activeCalibration}
          showSpots={showSpots}
          deck={deck}
          availableSpotIds={availableSpotIds}
          selectedNode={selectedNode}
          onSelectSpot={onSelectSpot}
          onMoveSpot={onMoveSpot}
          showNoGo={showNoGo}
          onSelectNoGo={onSelectNoGo}
          onMoveNoGo={onMoveNoGo}
          showDocks={showDocks}
          onSelectDock={onSelectDock}
          onMoveDock={onMoveDock}
          onCanvasContextMenu={onCanvasContextMenu}
          editable={editable}
          robotItems={robotItems}
          selectedRobotId={selectedRobotId}
          onSelectRobot={onSelectRobot}
          mapScope={mapScope}
          marqueeRect={marqueeRect}
          onWorldDragSuppressClick={() => {
            suppressWorldClickRef.current = true;
          }}
        />
      )}

      <MapCanvasEditorChrome
        showSpotEditorLayer={showSpotEditorLayer}
        modeIndicatorMeta={modeIndicatorMeta}
        isRenderToolboxCollapsed={isRenderToolboxCollapsed}
        onToggleRenderToolboxCollapsed={() => setIsRenderToolboxCollapsed((current) => !current)}
        renderLayerButtons={renderLayerButtons}
        visibleSpotLayers={visibleSpotLayers}
        onToggleSpotLayerVisibility={onToggleSpotLayerVisibility}
      />

      <MapCanvasMiniMap
        showMiniMap={showMiniMap}
        mapImageSrc={mapImageSrc}
        mapScope={mapScope}
        activeCalibration={activeCalibration}
        originX={originX}
        originY={originY}
        imageWidth={imageWidth}
        imageHeight={imageHeight}
        showSpotEditorLayer={showSpotEditorLayer}
        editorViewBox={editorViewBox}
        viewport={viewport}
        canvasWidth={canvasRef.current?.clientWidth || 1}
        canvasHeight={canvasRef.current?.clientHeight || 1}
      />

      {interactive ? (
        <div className="map-gizmo-2d" aria-hidden="true">
          <div className="map-gizmo-axis axis-x"><span>X</span></div>
          <div className="map-gizmo-axis axis-y"><span>Y</span></div>
        </div>
      ) : null}
    </div>
  );
}
