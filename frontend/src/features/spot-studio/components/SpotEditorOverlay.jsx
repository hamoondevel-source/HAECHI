import { BsArrowRightShort, BsGeoAltFill } from "react-icons/bs";
import {
  SPOT_STUDIO_EDGE_COLOR,
  SPOT_STUDIO_GROUP_COLOR,
  SPOT_STUDIO_WAYPOINT_COLOR
} from "../spotStudioColors";
import {
  buildAreaCornerPath,
  getAreaLabelWidth,
  getAreaResizeHandles,
  getAreaStylePreset,
  getEdgeArrowIcons,
  softenColor,
  withAlpha
} from "../mapCanvasOverlayUtils";
import { clamp } from "../mapCanvasViewport";

function getSelectedGroupBounds(activeWaypointGroup, waypoints, imageWidth, imageHeight) {
  if (!activeWaypointGroup) {
    return null;
  }

  const selectedGroupWaypoints = waypoints.filter((waypoint) => waypoint.groupId === activeWaypointGroup.id);

  if (!selectedGroupWaypoints.length) {
    return null;
  }

  const xs = selectedGroupWaypoints.map((waypoint) => waypoint.x);
  const ys = selectedGroupWaypoints.map((waypoint) => waypoint.y);
  const padding = 24;
  const minX = Math.max(0, Math.min(...xs) - padding);
  const maxX = Math.min(imageWidth, Math.max(...xs) + padding);
  const minY = Math.max(0, Math.min(...ys) - padding);
  const maxY = Math.min(imageHeight, Math.max(...ys) + padding);
  return {
    x: minX,
    y: minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY)
  };
}

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
  const waypointGroupColorById = new Map(
    spotEditor.waypointGroups.map((group) => [group.id, group.color ?? SPOT_STUDIO_GROUP_COLOR])
  );
  const selectedGroupBounds = getSelectedGroupBounds(
    activeWaypointGroup,
    spotEditor.waypoints,
    imageWidth,
    imageHeight
  );
  const selectedGroupColor = activeWaypointGroup
    ? waypointGroupColorById.get(activeWaypointGroup.id) ?? activeWaypointGroup.color ?? SPOT_STUDIO_GROUP_COLOR
    : SPOT_STUDIO_GROUP_COLOR;
  const selectedGroupFrameStroke = softenColor(selectedGroupColor, {
    alpha: 0.84,
    desaturate: 0.22,
    whiteMix: 0.18
  });
  const selectedGroupTagOpacity = clamp(Number(activeWaypointGroup?.tagOpacity ?? 0.24), 0.08, 0.85);
  const selectedGroupChipFill = withAlpha(selectedGroupColor, selectedGroupTagOpacity);
  const selectedGroupChipStroke = softenColor(selectedGroupColor, {
    alpha: 0.92,
    desaturate: 0.16,
    whiteMix: 0.26
  });
  const previewWaypointPairs =
    edgeCreateMode && edgeLinkMode === "hold" && edgeChainPreview.active
      ? edgeChainPreview.waypointIds
          .slice(1)
          .map((waypointId, index) => {
            const from = waypointById.get(edgeChainPreview.waypointIds[index]);
            const to = waypointById.get(waypointId);
            if (!from || !to) {
              return null;
            }
            return { from, to, key: `${from.id}-${to.id}-${index}` };
          })
          .filter(Boolean)
      : [];
  const previewTail =
    edgeCreateMode &&
    edgeLinkMode === "hold" &&
    edgeChainPreview.active &&
    edgeChainPreview.cursor &&
    edgeChainPreview.waypointIds.length
      ? {
          from: waypointById.get(edgeChainPreview.waypointIds[edgeChainPreview.waypointIds.length - 1]),
          to: edgeChainPreview.cursor
        }
      : null;

  function getWaypointColor(waypoint) {
    return waypoint?.color ?? waypointGroupColorById.get(waypoint?.groupId) ?? SPOT_STUDIO_WAYPOINT_COLOR;
  }

  function getEdgeColor(edge) {
    return edge?.color ?? waypointGroupColorById.get(edge?.groupId) ?? SPOT_STUDIO_EDGE_COLOR;
  }

  function getRenderedEdgeColor(edge, { isSelected = false, isAnchorLinked = false, isHovered = false } = {}) {
    const whiteMix = isSelected ? 0.18 : isAnchorLinked ? 0.16 : isHovered ? 0.14 : 0.1;
    const desaturate = isSelected ? 0.44 : isAnchorLinked ? 0.4 : isHovered ? 0.38 : 0.34;

    return softenColor(getEdgeColor(edge), {
      alpha: 1,
      desaturate,
      whiteMix
    });
  }

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

      {visibleSpotLayers.areas
        ? spotEditor.zones.map((area) => {
            const areaPreset = getAreaStylePreset(area.kind);
            const isSelectedArea = selectedAreaId === area.id;
            const labelWidth = getAreaLabelWidth(area.name);
            const labelY = Math.max(4, area.y - 20);
            const cornerPath = buildAreaCornerPath(area.x, area.y, area.width, area.height);
            const resizeHandles = isSelectedArea ? getAreaResizeHandles(area) : [];

            return (
              <g key={area.id}>
                <rect
                  className="map-editor-area-hit"
                  x={area.x}
                  y={area.y}
                  width={area.width}
                  height={area.height}
                  onPointerDown={(event) => handleAreaPointerDown(event, area)}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectArea?.(area.id);
                  }}
                  onContextMenu={(event) => {
                    event.stopPropagation();
                    onSelectArea?.(area.id);
                    onCanvasContextMenu?.(event, {
                      type: "area",
                      areaId: area.id,
                      point: { x: area.x, y: area.y }
                    });
                  }}
                />
                <rect
                  className={`map-editor-area-underlay ${isSelectedArea ? "is-selected" : ""}`}
                  x={area.x}
                  y={area.y}
                  width={area.width}
                  height={area.height}
                />
                <rect
                  className={`map-editor-area ${isSelectedArea ? "is-selected" : ""}`}
                  x={area.x}
                  y={area.y}
                  width={area.width}
                  height={area.height}
                  style={{
                    fill: withAlpha(area.color ?? areaPreset.color, area.opacity ?? areaPreset.opacity),
                    stroke: withAlpha(area.color ?? areaPreset.color, isSelectedArea ? 0.9 : 0.64)
                  }}
                />
                <rect
                  className={`map-editor-area-frame ${isSelectedArea ? "is-selected" : ""}`}
                  x={area.x + 3}
                  y={area.y + 3}
                  width={Math.max(0, area.width - 6)}
                  height={Math.max(0, area.height - 6)}
                />
                <path
                  className={`map-editor-area-corners ${isSelectedArea ? "is-selected" : ""}`}
                  d={cornerPath}
                  style={{
                    stroke: softenColor(area.color ?? areaPreset.color, {
                      alpha: 0.96,
                      desaturate: 0.18,
                      whiteMix: 0.28
                    })
                  }}
                />
                <rect
                  className={`map-editor-area-tag ${isSelectedArea ? "is-selected" : ""}`}
                  x={area.x}
                  y={labelY}
                  width={labelWidth}
                  height="16"
                />
                <text className={`map-editor-area-label ${isSelectedArea ? "is-selected" : ""}`} x={area.x + 7} y={labelY + 11}>
                  {area.name}
                </text>
                {resizeHandles.map((handle) => (
                  <g key={`${area.id}-${handle.id}`} className="map-editor-area-resize-handle">
                    <circle
                      className="map-editor-area-resize-hit"
                      cx={handle.x}
                      cy={handle.y}
                      r="7"
                      style={{ cursor: handle.cursor }}
                      onPointerDown={(event) => handleAreaResizePointerDown(event, area, handle.id)}
                    />
                    <rect
                      className="map-editor-area-resize-visual"
                      x={handle.x - 3.5}
                      y={handle.y - 3.5}
                      width="7"
                      height="7"
                    />
                  </g>
                ))}
              </g>
            );
          })
        : null}

      {visibleSpotLayers.edges
        ? spotEditor.edges.map((edge) => {
            const from = waypointById.get(edge.from);
            const to = waypointById.get(edge.to);
            const isAnchorLinked =
              Boolean(activeEdgeAnchorId) &&
              (edge.from === activeEdgeAnchorId || edge.to === activeEdgeAnchorId);
            const isSelectedEdge = selectedEdgeId === edge.id || selectedEdgeIdSet.has(edge.id);
            const edgeStroke = getRenderedEdgeColor(edge, {
              isSelected: isSelectedEdge,
              isAnchorLinked
            });
            const edgeHoverStroke = getRenderedEdgeColor(edge, {
              isSelected: isSelectedEdge,
              isAnchorLinked,
              isHovered: true
            });
            const edgeArrows = getEdgeArrowIcons(from, to, edge.direction);

            if (!from || !to) {
              return null;
            }

            return (
              <g key={edge.id}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  className={`map-waypoint-edge-underlay ${isSelectedEdge ? "is-selected" : ""}`}
                />
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  className="map-waypoint-edge-hit"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectEdge?.(edge.id);
                  }}
                  onContextMenu={(event) => {
                    event.stopPropagation();
                    onCanvasContextMenu?.(event, {
                      type: "edge",
                      edgeId: edge.id
                    });
                  }}
                />
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  className={`map-waypoint-edge ${
                    isAnchorLinked ? "is-anchor-linked" : ""
                  } ${isSelectedEdge ? "is-selected" : ""}`}
                  style={{
                    "--map-edge-stroke": edgeStroke,
                    "--map-edge-hover-stroke": edgeHoverStroke
                  }}
                />
                {edgeArrows.map((arrow, index) => (
                  <g
                    key={`${edge.id}-arrow-${index}`}
                    transform={`translate(${arrow.x} ${arrow.y}) rotate(${arrow.rotation})`}
                  >
                    <BsArrowRightShort
                      className="map-waypoint-edge-arrow-icon"
                      x={-arrow.size / 2}
                      y={-arrow.size / 2}
                      size={arrow.size}
                      style={{ color: edgeStroke }}
                    />
                  </g>
                ))}
              </g>
            );
          })
        : null}

      {visibleSpotLayers.edges
        ? previewWaypointPairs.map((segment) => (
            <line
              key={`preview-${segment.key}`}
              x1={segment.from.x}
              y1={segment.from.y}
              x2={segment.to.x}
              y2={segment.to.y}
              className="map-waypoint-edge-preview"
            />
          ))
        : null}

      {visibleSpotLayers.edges && previewTail?.from && previewTail?.to ? (
        <line
          x1={previewTail.from.x}
          y1={previewTail.from.y}
          x2={previewTail.to.x}
          y2={previewTail.to.y}
          className="map-waypoint-edge-preview-tail"
        />
      ) : null}

      {visibleSpotLayers.groups && selectedGroupBounds ? (
        (() => {
          const groupName = String(activeWaypointGroup.name ?? "");
          const groupTagHeight = 14;
          const groupTagWidth = Math.max(64, groupName.length * 6.2 + 10);
          const groupTagY = Math.max(2, selectedGroupBounds.y - 16);
          const groupTagTransform = `translate(${selectedGroupBounds.x} ${groupTagY}) scale(${groupTagVisualScale})`;

          return (
            <g
              className="map-group-bounds"
              onPointerDown={handleGroupPointerDown}
              onClick={(event) => {
                event.stopPropagation();
                onSelectGroup?.(activeWaypointGroup.id);
              }}
              onContextMenu={(event) => {
                event.stopPropagation();
                onCanvasContextMenu?.(event, {
                  type: "group",
                  groupId: activeWaypointGroup.id
                });
              }}
            >
              <rect
                className="map-group-bounds-hit"
                x={selectedGroupBounds.x}
                y={selectedGroupBounds.y}
                width={selectedGroupBounds.width}
                height={selectedGroupBounds.height}
                rx="0"
                ry="0"
              />
              <rect
                className="map-group-bounds-frame"
                x={selectedGroupBounds.x}
                y={selectedGroupBounds.y}
                width={selectedGroupBounds.width}
                height={selectedGroupBounds.height}
                rx="0"
                ry="0"
                style={{ stroke: selectedGroupFrameStroke }}
              />
              <g className="map-group-bounds-tag" transform={groupTagTransform}>
                <rect
                  className="map-group-bounds-chip"
                  x="0"
                  y="0"
                  width={groupTagWidth}
                  height={groupTagHeight}
                  rx="0"
                  ry="0"
                  style={{
                    fill: selectedGroupChipFill,
                    stroke: selectedGroupChipStroke
                  }}
                />
                <text className="map-group-bounds-label" x={groupTagWidth / 2} y={groupTagHeight / 2}>
                  {groupName}
                </text>
              </g>
            </g>
          );
        })()
      ) : null}

      {visibleSpotLayers.waypoints
        ? spotEditor.waypoints.map((waypoint) => {
            if (!Number.isFinite(waypoint.x) || !Number.isFinite(waypoint.y)) {
              return null;
            }

            const waypointLabelWidth = Math.max(24, String(waypoint.name ?? "").length * 5 + 8);
            const waypointIconSize = 18;
            const waypointIconX = -waypointIconSize / 2;
            const waypointIconY = -waypointIconSize;
            const waypointIconHeadCenterY = waypointIconY + waypointIconSize * 0.375;
            const waypointChipX = 8;
            const waypointChipY = -15;
            const waypointChipHeight = 11.5;
            const waypointColor = getWaypointColor(waypoint);
            const waypointChipStroke = softenColor(waypointColor, {
              alpha: 0.88,
              desaturate: 0.28,
              whiteMix: 0.14
            });
            const waypointIconColor = softenColor(waypointColor, {
              alpha: 0.96,
              desaturate: 0.18,
              whiteMix: 0.12
            });
            const waypointSelectionStroke = withAlpha(waypointColor, selectedWaypointId === waypoint.id ? 1 : 0.9);
            const waypointSecondarySelectionStroke = withAlpha(waypointColor, 0.82);
            const waypointAnchorStroke = softenColor(waypointColor, {
              alpha: 0.88,
              desaturate: 0.1,
              whiteMix: 0.34
            });

            return (
              <g
                key={waypoint.id}
                className={`map-waypoint-node ${
                  activeEdgeAnchorId === waypoint.id ? "is-anchor" : ""
                } ${edgeCreateMode ? "is-edge-mode" : ""}`}
                transform={`translate(${waypoint.x}, ${waypoint.y})`}
                onPointerDown={(event) => handleWaypointPointerDown(event, waypoint.id)}
                onPointerEnter={(event) => handleWaypointPointerEnter(event, waypoint.id)}
                onClick={(event) => handleWaypointClick(event, waypoint.id)}
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  if (
                    activeWaypointGroup?.id &&
                    waypoint.groupId === activeWaypointGroup.id &&
                    !edgeCreateMode
                  ) {
                    onFocusWaypoint?.(waypoint.id);
                  }
                }}
                onContextMenu={(event) => {
                  if (edgeCreateMode && edgeLinkMode === "hold") {
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                  }
                  event.stopPropagation();
                  onCanvasContextMenu?.(event, {
                    type: "waypoint",
                    waypointId: waypoint.id,
                    point: { x: waypoint.x, y: waypoint.y }
                  });
                }}
              >
                <g className="map-waypoint-node-visual" transform={`scale(${waypointVisualScale})`}>
                  <rect
                    className="map-waypoint-node-hit"
                    x="-14"
                    y="-22"
                    width={waypointChipX + waypointLabelWidth + 18}
                    height="30"
                    rx="5"
                    ry="5"
                  />
                  <g className="map-waypoint-node-shell" aria-hidden="true">
                    <circle
                      className="map-waypoint-node-vertex"
                      cx="0"
                      cy="0"
                      r="1.7"
                      style={{ fill: withAlpha(waypointColor, 0.96) }}
                    />
                    <BsGeoAltFill
                      className="map-waypoint-node-icon"
                      x={waypointIconX}
                      y={waypointIconY}
                      size={waypointIconSize}
                      style={{ color: waypointIconColor }}
                    />
                    <rect
                      className="map-waypoint-node-chip"
                      x={waypointChipX}
                      y={waypointChipY}
                      width={waypointLabelWidth}
                      height={waypointChipHeight}
                      rx="3"
                      ry="3"
                      style={{ stroke: waypointChipStroke }}
                    />
                  </g>
                  {activeEdgeAnchorId === waypoint.id ? (
                    <circle
                      className="map-waypoint-node-anchor-ring"
                      cx="0"
                      cy={waypointIconHeadCenterY}
                      r="8.9"
                      style={{ stroke: waypointAnchorStroke }}
                    />
                  ) : null}
                  {selectedWaypointId === waypoint.id ? (
                    <circle
                      className="map-waypoint-node-ring"
                      cx="0"
                      cy={waypointIconHeadCenterY}
                      r="7.7"
                      style={{ stroke: waypointSelectionStroke }}
                    />
                  ) : null}
                  {selectedWaypointIdSet.has(waypoint.id) && selectedWaypointId !== waypoint.id ? (
                    <circle
                      className="map-waypoint-node-ring"
                      cx="0"
                      cy={waypointIconHeadCenterY}
                      r="7.7"
                      style={{ stroke: waypointSecondarySelectionStroke }}
                    />
                  ) : null}
                  <text
                    className={`map-waypoint-node-label ${
                      selectedWaypointId === waypoint.id ? "is-selected" : ""
                    }`}
                    x={waypointChipX + waypointLabelWidth / 2}
                    y={waypointChipY + waypointChipHeight / 2}
                  >
                    {waypoint.name}
                  </text>
                  {activeEdgeAnchorId === waypoint.id ? (
                    <text className="map-waypoint-node-anchor-text" x={waypointChipX} y="6.8">
                      {edgeChainPreview.active && edgeLinkMode === "hold" ? "NEXT" : "START"}
                    </text>
                  ) : null}
                </g>
              </g>
            );
          })
        : null}

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
