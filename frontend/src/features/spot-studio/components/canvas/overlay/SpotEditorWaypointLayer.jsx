import { BsGeoAltFill } from "react-icons/bs";
import { softenColor, withAlpha } from "../../../utils/mapCanvasOverlayUtils";
import { getWaypointColor } from "./spotEditorOverlayHelpers";

export default function SpotEditorWaypointLayer({
  visible,
  waypoints,
  activeWaypointGroup,
  activeEdgeAnchorId,
  edgeCreateMode,
  edgeLinkMode,
  edgeChainPreview,
  selectedWaypointId,
  selectedWaypointIdSet,
  renderMode = "all",
  waypointVisualScale,
  waypointGroupColorById,
  onFocusWaypoint,
  onCanvasContextMenu,
  handleWaypointPointerDown,
  handleWaypointPointerEnter,
  handleWaypointClick
}) {
  if (!visible) {
    return null;
  }

  return waypoints.map((waypoint) => {
    const isSelectedWaypoint =
      selectedWaypointId === waypoint.id || selectedWaypointIdSet.has(waypoint.id);
    const shouldRenderWaypoint =
      renderMode === "all" ||
      (renderMode === "background" && !isSelectedWaypoint) ||
      (renderMode === "foreground" && isSelectedWaypoint);

    if (!shouldRenderWaypoint) {
      return null;
    }

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
    const waypointColor = getWaypointColor(waypoint, waypointGroupColorById);
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
  });
}
