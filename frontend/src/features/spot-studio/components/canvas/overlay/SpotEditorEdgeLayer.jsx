import { BsArrowRightShort } from "react-icons/bs";
import { getEdgeArrowIcons } from "../../../utils/mapCanvasOverlayUtils";
import {
  getEdgeChainPreviewData,
  getRenderedEdgeColor
} from "./spotEditorOverlayHelpers";

export default function SpotEditorEdgeLayer({
  visible,
  edges,
  waypointById,
  waypointGroupColorById,
  activeEdgeAnchorId,
  selectedEdgeId,
  selectedEdgeIdSet,
  renderMode = "all",
  edgeCreateMode,
  edgeLinkMode,
  edgeChainPreview,
  onSelectEdge,
  onCanvasContextMenu
}) {
  if (!visible) {
    return null;
  }

  const { previewWaypointPairs, previewTail } = getEdgeChainPreviewData({
    edgeCreateMode,
    edgeLinkMode,
    edgeChainPreview,
    waypointById
  });

  return (
    <>
      {edges.map((edge) => {
        const from = waypointById.get(edge.from);
        const to = waypointById.get(edge.to);
        const isAnchorLinked =
          Boolean(activeEdgeAnchorId) &&
          (edge.from === activeEdgeAnchorId || edge.to === activeEdgeAnchorId);
        const isSelectedEdge = selectedEdgeId === edge.id || selectedEdgeIdSet.has(edge.id);
        const shouldRenderEdge =
          renderMode === "all" ||
          (renderMode === "background" && !isSelectedEdge) ||
          (renderMode === "foreground" && isSelectedEdge);

        if (!shouldRenderEdge) {
          return null;
        }

        const edgeStroke = getRenderedEdgeColor(edge, waypointGroupColorById, {
          isSelected: isSelectedEdge,
          isAnchorLinked
        });
        const edgeHoverStroke = getRenderedEdgeColor(edge, waypointGroupColorById, {
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
      })}

      {renderMode !== "foreground"
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

      {renderMode !== "foreground" && previewTail?.from && previewTail?.to ? (
        <line
          x1={previewTail.from.x}
          y1={previewTail.from.y}
          x2={previewTail.to.x}
          y2={previewTail.to.y}
          className="map-waypoint-edge-preview-tail"
        />
      ) : null}
    </>
  );
}
