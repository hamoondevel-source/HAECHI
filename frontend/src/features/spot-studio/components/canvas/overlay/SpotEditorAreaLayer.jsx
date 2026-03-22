import {
  buildAreaCornerPath,
  getAreaLabelWidth,
  getAreaResizeHandles,
  getAreaStylePreset,
  softenColor,
  withAlpha
} from "../../../utils/mapCanvasOverlayUtils";

export default function SpotEditorAreaLayer({
  visible,
  areas,
  selectedAreaId,
  renderMode = "all",
  onSelectArea,
  onCanvasContextMenu,
  handleAreaPointerDown,
  handleAreaResizePointerDown
}) {
  if (!visible) {
    return null;
  }

  return areas.map((area) => {
    const areaPreset = getAreaStylePreset(area.kind);
    const isSelectedArea = selectedAreaId === area.id;
    const shouldRenderArea =
      renderMode === "all" ||
      (renderMode === "background" && !isSelectedArea) ||
      (renderMode === "foreground" && isSelectedArea);

    if (!shouldRenderArea) {
      return null;
    }

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
  });
}
