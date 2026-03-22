import { withAlpha } from "../../utils/mapCanvasOverlayUtils";
import {
  createWaypointGroupColorById
} from "./overlay/spotEditorOverlayHelpers";
import SpotEditorAreaLayer from "./overlay/SpotEditorAreaLayer";
import SpotEditorEdgeLayer from "./overlay/SpotEditorEdgeLayer";
import SpotEditorGroupLayer from "./overlay/SpotEditorGroupLayer";
import SpotEditorWaypointLayer from "./overlay/SpotEditorWaypointLayer";

export default function SpotEditorOverlay({
  mapImageSrc,
  imageWidth,
  imageHeight,
  editorViewBox,
  mapEditorGridPatternId,
  mapEditorFallbackPatternId,
  originX,
  originY,
  normalizedGridStepPx,
  gridRotationDeg,
  gridPlaneWidth,
  gridPlaneHeight,
  gridColor,
  gridOpacity,
  visibleSpotLayers,
  spotEditor,
  selectedWaypointId = "",
  selectedWaypointIds = [],
  selectedEdgeId = "",
  selectedEdgeIds = [],
  selectedAreaId = "",
  activeWaypointGroup = null,
  isGroupSelectionActive = false,
  edgeCreateMode = false,
  edgeLinkMode = "hold",
  activeEdgeAnchorId = "",
  edgeChainPreview,
  waypointVisualScale = 1,
  groupTagVisualScale = 1,
  marqueeRect = null,
  onFocusWaypoint,
  onSelectEdge,
  onSelectArea,
  onSelectGroup,
  onCanvasContextMenu,
  handleWaypointPointerDown,
  handleWaypointPointerEnter,
  handleWaypointClick,
  handleGroupPointerDown,
  handleAreaPointerDown,
  handleAreaResizePointerDown
}) {
  const gridLineColor = withAlpha(gridColor, gridOpacity);
  const gridHighlightColor = withAlpha(gridColor, Math.min(1, gridOpacity + 0.16));
  const selectedWaypointIdSet = new Set(
    Array.isArray(selectedWaypointIds) && selectedWaypointIds.length ? selectedWaypointIds : []
  );
  const selectedEdgeIdSet = new Set(Array.isArray(selectedEdgeIds) && selectedEdgeIds.length ? selectedEdgeIds : []);
  const waypointById = new Map(spotEditor.waypoints.map((waypoint) => [waypoint.id, waypoint]));
  const waypointGroupColorById = createWaypointGroupColorById(spotEditor);
  const shouldPromoteArea = Boolean(selectedAreaId);
  const shouldPromoteEdge = Boolean(selectedEdgeId || selectedEdgeIdSet.size);
  const shouldPromoteGroup = Boolean(isGroupSelectionActive && activeWaypointGroup?.id);
  const shouldPromoteWaypoint = Boolean(selectedWaypointId || selectedWaypointIdSet.size);

  return (
    <svg
      className="map-editor-svg"
      viewBox={`${editorViewBox.x} ${editorViewBox.y} ${editorViewBox.width} ${editorViewBox.height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <pattern
          id={mapEditorGridPatternId}
          x={originX}
          y={originY}
          width={normalizedGridStepPx}
          height={normalizedGridStepPx}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${normalizedGridStepPx} 0 L 0 0 0 ${normalizedGridStepPx}`}
            fill="none"
            stroke={gridLineColor}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </pattern>
        <pattern id={mapEditorFallbackPatternId} width="32" height="32" patternUnits="userSpaceOnUse">
          <path
            d="M 32 0 L 0 0 0 32"
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </pattern>
      </defs>

      <rect x="0" y="0" width={imageWidth} height={imageHeight} fill="#17181b" pointerEvents="none" />
      {mapImageSrc ? (
        <image
          className="map-editor-image"
          href={mapImageSrc}
          x="0"
          y="0"
          width={imageWidth}
          height={imageHeight}
          preserveAspectRatio="none"
          pointerEvents="none"
        />
      ) : (
        <rect
          x="0"
          y="0"
          width={imageWidth}
          height={imageHeight}
          fill={`url(#${mapEditorFallbackPatternId})`}
          pointerEvents="none"
        />
      )}

      {visibleSpotLayers.grid ? (
        <g transform={`rotate(${gridRotationDeg} ${originX} ${originY})`} pointerEvents="none">
          <rect
            className="map-grid-svg"
            x={originX - gridPlaneWidth / 2}
            y={originY - gridPlaneHeight / 2}
            width={gridPlaneWidth}
            height={gridPlaneHeight}
            fill={`url(#${mapEditorGridPatternId})`}
            stroke={gridHighlightColor}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={originX - gridPlaneWidth / 2}
            y1={originY}
            x2={originX + gridPlaneWidth / 2}
            y2={originY}
            stroke={gridHighlightColor}
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={originX}
            y1={originY - gridPlaneHeight / 2}
            x2={originX}
            y2={originY + gridPlaneHeight / 2}
            stroke={gridHighlightColor}
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ) : null}

      <SpotEditorAreaLayer
        visible={visibleSpotLayers.areas}
        areas={spotEditor.zones}
        selectedAreaId={selectedAreaId}
        renderMode={shouldPromoteArea ? "background" : "all"}
        onSelectArea={onSelectArea}
        onCanvasContextMenu={onCanvasContextMenu}
        handleAreaPointerDown={handleAreaPointerDown}
        handleAreaResizePointerDown={handleAreaResizePointerDown}
      />

      <SpotEditorEdgeLayer
        visible={visibleSpotLayers.edges}
        edges={spotEditor.edges}
        waypointById={waypointById}
        waypointGroupColorById={waypointGroupColorById}
        activeEdgeAnchorId={activeEdgeAnchorId}
        selectedEdgeId={selectedEdgeId}
        selectedEdgeIdSet={selectedEdgeIdSet}
        renderMode={shouldPromoteEdge ? "background" : "all"}
        edgeCreateMode={edgeCreateMode}
        edgeLinkMode={edgeLinkMode}
        edgeChainPreview={edgeChainPreview}
        onSelectEdge={onSelectEdge}
        onCanvasContextMenu={onCanvasContextMenu}
      />

      <SpotEditorGroupLayer
        visible={visibleSpotLayers.groups}
        activeWaypointGroup={activeWaypointGroup}
        isSelectedGroup={isGroupSelectionActive}
        renderMode={shouldPromoteGroup ? "background" : "all"}
        waypoints={spotEditor.waypoints}
        imageWidth={imageWidth}
        imageHeight={imageHeight}
        groupTagVisualScale={groupTagVisualScale}
        waypointGroupColorById={waypointGroupColorById}
        onSelectGroup={onSelectGroup}
        onCanvasContextMenu={onCanvasContextMenu}
        handleGroupPointerDown={handleGroupPointerDown}
      />

      <SpotEditorWaypointLayer
        visible={visibleSpotLayers.waypoints}
        waypoints={spotEditor.waypoints}
        activeWaypointGroup={activeWaypointGroup}
        activeEdgeAnchorId={activeEdgeAnchorId}
        edgeCreateMode={edgeCreateMode}
        edgeLinkMode={edgeLinkMode}
        edgeChainPreview={edgeChainPreview}
        selectedWaypointId={selectedWaypointId}
        selectedWaypointIdSet={selectedWaypointIdSet}
        renderMode={shouldPromoteWaypoint ? "background" : "all"}
        waypointVisualScale={waypointVisualScale}
        waypointGroupColorById={waypointGroupColorById}
        onFocusWaypoint={onFocusWaypoint}
        onCanvasContextMenu={onCanvasContextMenu}
        handleWaypointPointerDown={handleWaypointPointerDown}
        handleWaypointPointerEnter={handleWaypointPointerEnter}
        handleWaypointClick={handleWaypointClick}
      />

      {shouldPromoteArea ? (
        <SpotEditorAreaLayer
          visible={visibleSpotLayers.areas}
          areas={spotEditor.zones}
          selectedAreaId={selectedAreaId}
          renderMode="foreground"
          onSelectArea={onSelectArea}
          onCanvasContextMenu={onCanvasContextMenu}
          handleAreaPointerDown={handleAreaPointerDown}
          handleAreaResizePointerDown={handleAreaResizePointerDown}
        />
      ) : null}

      {shouldPromoteEdge ? (
        <SpotEditorEdgeLayer
          visible={visibleSpotLayers.edges}
          edges={spotEditor.edges}
          waypointById={waypointById}
          waypointGroupColorById={waypointGroupColorById}
          activeEdgeAnchorId={activeEdgeAnchorId}
          selectedEdgeId={selectedEdgeId}
          selectedEdgeIdSet={selectedEdgeIdSet}
          renderMode="foreground"
          edgeCreateMode={edgeCreateMode}
          edgeLinkMode={edgeLinkMode}
          edgeChainPreview={edgeChainPreview}
          onSelectEdge={onSelectEdge}
          onCanvasContextMenu={onCanvasContextMenu}
        />
      ) : null}

      {shouldPromoteGroup ? (
        <SpotEditorGroupLayer
          visible={visibleSpotLayers.groups}
          activeWaypointGroup={activeWaypointGroup}
          isSelectedGroup={isGroupSelectionActive}
          renderMode="foreground"
          waypoints={spotEditor.waypoints}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          groupTagVisualScale={groupTagVisualScale}
          waypointGroupColorById={waypointGroupColorById}
          onSelectGroup={onSelectGroup}
          onCanvasContextMenu={onCanvasContextMenu}
          handleGroupPointerDown={handleGroupPointerDown}
        />
      ) : null}

      {shouldPromoteWaypoint ? (
        <SpotEditorWaypointLayer
          visible={visibleSpotLayers.waypoints}
          waypoints={spotEditor.waypoints}
          activeWaypointGroup={activeWaypointGroup}
          activeEdgeAnchorId={activeEdgeAnchorId}
          edgeCreateMode={edgeCreateMode}
          edgeLinkMode={edgeLinkMode}
          edgeChainPreview={edgeChainPreview}
          selectedWaypointId={selectedWaypointId}
          selectedWaypointIdSet={selectedWaypointIdSet}
          renderMode="foreground"
          waypointVisualScale={waypointVisualScale}
          waypointGroupColorById={waypointGroupColorById}
          onFocusWaypoint={onFocusWaypoint}
          onCanvasContextMenu={onCanvasContextMenu}
          handleWaypointPointerDown={handleWaypointPointerDown}
          handleWaypointPointerEnter={handleWaypointPointerEnter}
          handleWaypointClick={handleWaypointClick}
        />
      ) : null}

      {marqueeRect ? (
        <rect
          className="map-marquee-selection-svg"
          x={marqueeRect.x}
          y={marqueeRect.y}
          width={marqueeRect.width}
          height={marqueeRect.height}
        />
      ) : null}
    </svg>
  );
}
