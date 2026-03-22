import {
  SPOT_STUDIO_EDGE_COLOR,
  SPOT_STUDIO_GROUP_COLOR,
  SPOT_STUDIO_WAYPOINT_COLOR
} from "../../../constants/spotStudioColors";
import { softenColor } from "../../../utils/mapCanvasOverlayUtils";

export function getSelectedGroupBounds(activeWaypointGroup, waypoints, imageWidth, imageHeight) {
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

export function createWaypointGroupColorById(spotEditor) {
  return new Map(
    (spotEditor?.waypointGroups ?? []).map((group) => [group.id, group.color ?? SPOT_STUDIO_GROUP_COLOR])
  );
}

export function getWaypointColor(waypoint, waypointGroupColorById) {
  return waypoint?.color ?? waypointGroupColorById.get(waypoint?.groupId) ?? SPOT_STUDIO_WAYPOINT_COLOR;
}

export function getEdgeColor(edge, waypointGroupColorById) {
  return edge?.color ?? waypointGroupColorById.get(edge?.groupId) ?? SPOT_STUDIO_EDGE_COLOR;
}

export function getRenderedEdgeColor(edge, waypointGroupColorById, { isSelected = false, isAnchorLinked = false, isHovered = false } = {}) {
  const whiteMix = isSelected ? 0.18 : isAnchorLinked ? 0.16 : isHovered ? 0.14 : 0.1;
  const desaturate = isSelected ? 0.44 : isAnchorLinked ? 0.4 : isHovered ? 0.38 : 0.34;

  return softenColor(getEdgeColor(edge, waypointGroupColorById), {
    alpha: 1,
    desaturate,
    whiteMix
  });
}

export function getEdgeChainPreviewData({ edgeCreateMode, edgeLinkMode, edgeChainPreview, waypointById }) {
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

  return {
    previewWaypointPairs,
    previewTail
  };
}
