import { SPOT_STUDIO_GROUP_COLOR } from "../../../constants/spotStudioColors";
import { softenColor, withAlpha } from "../../../utils/mapCanvasOverlayUtils";
import { clamp } from "../../../utils/mapCanvasViewport";
import {
  getSelectedGroupBounds
} from "./spotEditorOverlayHelpers";

export default function SpotEditorGroupLayer({
  visible,
  activeWaypointGroup,
  isSelectedGroup = false,
  renderMode = "all",
  waypoints,
  imageWidth,
  imageHeight,
  groupTagVisualScale,
  waypointGroupColorById,
  onSelectGroup,
  onCanvasContextMenu,
  handleGroupPointerDown
}) {
  if (!visible || !activeWaypointGroup) {
    return null;
  }

  const shouldRenderGroup =
    renderMode === "all" ||
    (renderMode === "background" && !isSelectedGroup) ||
    (renderMode === "foreground" && isSelectedGroup);

  if (!shouldRenderGroup) {
    return null;
  }

  const selectedGroupBounds = getSelectedGroupBounds(activeWaypointGroup, waypoints, imageWidth, imageHeight);

  if (!selectedGroupBounds) {
    return null;
  }

  const selectedGroupColor =
    waypointGroupColorById.get(activeWaypointGroup.id) ?? activeWaypointGroup.color ?? SPOT_STUDIO_GROUP_COLOR;
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
}
