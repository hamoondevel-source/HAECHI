import { useId, useState } from "react";
import { BsChevronDown, BsChevronUp, BsLayers } from "react-icons/bs";
import SpotEditorOverlay from "./SpotEditorOverlay";
import { normalizeSpotEditor } from "../spotEditorModel";
import {
  clamp,
  EDITOR_MAX_ZOOM,
  getAdaptiveOverlayScale,
  getMapDimensionMaxZoom,
  getMapDimensionScale,
  getResolutionScale,
  getSpotCalibration,
  projectMeterToPixel,
  resolveMapImageSrc,
  toPercent
} from "../mapCanvasViewport";
import { withAlpha } from "../mapCanvasOverlayUtils";
import useMapCanvasInteraction from "../useMapCanvasInteraction";
import { SPOT_STUDIO_GRID_COLOR } from "../spotStudioColors";

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
  showSpots,
  showNoGo,
  showDocks,
  interactive = false,
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
  onCanvasBlankLeftClick
}) {
  const svgDefsId = useId().replace(/:/g, "");
  const [isRenderToolboxCollapsed, setIsRenderToolboxCollapsed] = useState(false);

  if (!deck) {
    return <div className="empty-state">표시할 맵이 없습니다.</div>;
  }

  const mapScope = getSpotCalibration(deck, selectedNode);
  const activeImage = mapScope.spot?.image ?? deck.image ?? null;
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
    spotId: mapScope.spot?.id,
    interactive,
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
      onClick={handleCanvasClick}
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
        <div
          className="map-world"
          style={{
            width: `${imageWidth}px`,
            height: `${imageHeight}px`,
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`
          }}
        >
          <div
            className={`map-surface ${mapImageSrc ? "has-image" : "is-generated"}`}
            style={
              mapImageSrc
                ? {
                    backgroundImage: `url(${mapImageSrc})`
                  }
                : undefined
            }
          />

          {visibleSpotLayers.grid ? (
            <div
              className="map-grid-overlay"
              style={{
                left: toPercent(originX - gridPlaneWidth / 2, imageWidth),
                top: toPercent(originY - gridPlaneHeight / 2, imageHeight),
                width: toPercent(gridPlaneWidth, imageWidth),
                height: toPercent(gridPlaneHeight, imageHeight),
                backgroundSize: `${normalizedGridStepPx}px ${normalizedGridStepPx}px`,
                backgroundImage: `linear-gradient(90deg, ${gridLineColor} 1px, transparent 1px), linear-gradient(${gridLineColor} 1px, transparent 1px)`,
                borderColor: gridHighlightColor,
                transform: `rotate(${gridRotationDeg}deg)`
              }}
            />
          ) : null}

          {activeCalibration?.origin ? (
            <div
              className="map-origin-axes"
              style={{
                left: toPercent(originX, imageWidth),
                top: toPercent(originY, imageHeight),
                color: gridHighlightColor,
                transform: `translate(-50%, -50%) rotate(${gridRotationDeg}deg)`
              }}
            />
          ) : null}

          {showSpots
            ? deck.spots?.map((spot) => (
                <div
                  key={spot.id}
                  className={`map-zone ${
                    availableSpotIds.includes(spot.id) ? "is-accessible" : "is-restricted"
                  } ${
                    selectedNode?.type === "spot" && selectedNode.id === spot.id ? "is-selected" : ""
                  }`}
                  style={{
                    left: toPercent(spot.x, imageWidth),
                    top: toPercent(spot.y, imageHeight),
                    width: toPercent(spot.width, imageWidth),
                    height: toPercent(spot.height, imageHeight)
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectSpot?.(spot);
                  }}
                >
                  <span>{spot.name}</span>
                </div>
              ))
            : null}

          {showNoGo
            ? deck.noGoZones?.map((zone) => (
                <div
                  key={zone.id}
                  className={`map-hazard ${
                    selectedNode?.type === "nogo" && selectedNode.id === zone.id ? "is-selected" : ""
                  }`}
                  style={{
                    left: toPercent(zone.x, imageWidth),
                    top: toPercent(zone.y, imageHeight),
                    width: toPercent(zone.width, imageWidth),
                    height: toPercent(zone.height, imageHeight)
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectNoGo?.(zone);
                  }}
                >
                  <span>{zone.name}</span>
                </div>
              ))
            : null}

          {showDocks
            ? [...(deck.docks ?? []), ...(deck.portals ?? [])].map((dock) => (
                <div
                  key={dock.id}
                  className={`map-pin ${dock.kind === "vertical" ? "is-portal" : ""} ${
                    selectedNode?.type === "dock" && selectedNode.id === dock.id ? "is-selected" : ""
                  }`}
                  style={{
                    left: toPercent(dock.x, imageWidth),
                    top: toPercent(dock.y, imageHeight)
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectDock?.(dock);
                  }}
                >
                  <span>{dock.name}</span>
                </div>
              ))
            : null}

          {robotItems.map((robot) => {
            const point = projectMeterToPixel(robot.mapPose, deck);

            if (!point) {
              return null;
            }

            return (
              <button
                key={robot.id}
                type="button"
                className={`map-robot ${selectedRobotId === robot.id ? "is-selected" : ""}`}
                style={{
                  left: toPercent(point.x, imageWidth),
                  top: toPercent(point.y, imageHeight),
                  transform: `translate(-50%, -50%) rotate(${robot.mapPose?.heading ?? 0}deg)`
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectRobot?.(robot);
                }}
              >
                <span className="map-robot-head" />
                <strong>{robot.badge ?? robot.name.slice(0, 1)}</strong>
                <small>{robot.name}</small>
              </button>
            );
          })}

          {mapScope.spot && activeCalibration?.origin ? (
            <div
              className="map-origin-marker"
              style={{
                left: toPercent(originX, imageWidth),
                top: toPercent(originY, imageHeight)
              }}
            />
          ) : null}

          {marqueeRect ? (
            <div
              className="map-marquee-selection"
              style={{
                left: toPercent(marqueeRect.x, imageWidth),
                top: toPercent(marqueeRect.y, imageHeight),
                width: toPercent(marqueeRect.width, imageWidth),
                height: toPercent(marqueeRect.height, imageHeight)
              }}
            />
          ) : null}
        </div>
      )}

      {showSpotEditorLayer ? (
        <div className={`map-mode-indicator ${modeIndicatorMeta.toneClassName}`} aria-live="polite">
          <span className="map-mode-indicator-label">MODE</span>
          <strong>{modeIndicatorMeta.label}</strong>
          <span className="map-mode-indicator-detail">{modeIndicatorMeta.detail}</span>
        </div>
      ) : null}

      {showSpotEditorLayer ? (
        <div
          className={`map-overlay-toolbox ${isRenderToolboxCollapsed ? "is-collapsed" : ""}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="map-overlay-toolbox-toggle"
            aria-expanded={!isRenderToolboxCollapsed}
            onClick={() => setIsRenderToolboxCollapsed((current) => !current)}
          >
            <span className="map-overlay-toolbox-title">
              <BsLayers aria-hidden="true" />
              Render
            </span>
            {isRenderToolboxCollapsed ? <BsChevronDown aria-hidden="true" /> : <BsChevronUp aria-hidden="true" />}
          </button>

          <div className="map-overlay-toolbox-body" aria-hidden={isRenderToolboxCollapsed}>
            <span className="map-overlay-toolbox-label">Layers</span>
            <div className="map-overlay-toolbox-list">
              {renderLayerButtons.map((layer) => (
                <label
                  key={layer.id}
                  className={`map-overlay-toolbox-checkbox ${
                    visibleSpotLayers[layer.id] ? "is-active" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={visibleSpotLayers[layer.id]}
                    disabled={isRenderToolboxCollapsed}
                    tabIndex={isRenderToolboxCollapsed ? -1 : undefined}
                    onChange={() => onToggleSpotLayerVisibility?.(layer.id)}
                  />
                  <span>{layer.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {showMiniMap ? (
        <div className="map-minimap">
          <div
            className={`map-minimap-surface ${mapImageSrc ? "has-image" : "is-generated"}`}
            style={
              mapImageSrc
                ? {
                    backgroundImage: `url(${mapImageSrc})`
                  }
                : undefined
            }
          />
          {mapScope.spot && activeCalibration?.origin ? (
            <div
              className="map-minimap-origin"
              style={{
                left: toPercent(originX, imageWidth),
                top: toPercent(originY, imageHeight)
              }}
            />
          ) : null}
          <div
            className="map-minimap-viewport"
            style={{
              left: `${
                showSpotEditorLayer
                  ? clamp((editorViewBox.x / imageWidth) * 100, 0, 100)
                  : clamp((-viewport.x / viewport.scale / (canvasRef.current?.clientWidth || 1)) * 100, 0, 100)
              }%`,
              top: `${
                showSpotEditorLayer
                  ? clamp((editorViewBox.y / imageHeight) * 100, 0, 100)
                  : clamp((-viewport.y / viewport.scale / (canvasRef.current?.clientHeight || 1)) * 100, 0, 100)
              }%`,
              width: `${
                showSpotEditorLayer
                  ? clamp((editorViewBox.width / imageWidth) * 100, 6, 100)
                  : clamp(100 / viewport.scale, 6, 100)
              }%`,
              height: `${
                showSpotEditorLayer
                  ? clamp((editorViewBox.height / imageHeight) * 100, 6, 100)
                  : clamp(100 / viewport.scale, 6, 100)
              }%`
            }}
          />
        </div>
      ) : null}

      {interactive ? (
        <div className="map-gizmo-2d" aria-hidden="true">
          <div className="map-gizmo-axis axis-x"><span>X</span></div>
          <div className="map-gizmo-axis axis-y"><span>Y</span></div>
        </div>
      ) : null}
    </div>
  );
}
