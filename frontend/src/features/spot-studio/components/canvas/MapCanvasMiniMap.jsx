import { clamp, toPercent } from "../../utils/mapCanvasViewport";

export default function MapCanvasMiniMap({
  showMiniMap,
  mapImageSrc,
  mapScope,
  activeCalibration,
  originX,
  originY,
  imageWidth,
  imageHeight,
  showSpotEditorLayer,
  editorViewBox,
  viewport,
  canvasWidth,
  canvasHeight
}) {
  if (!showMiniMap) {
    return null;
  }

  return (
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
              : clamp((-viewport.x / viewport.scale / Math.max(1, canvasWidth)) * 100, 0, 100)
          }%`,
          top: `${
            showSpotEditorLayer
              ? clamp((editorViewBox.y / imageHeight) * 100, 0, 100)
              : clamp((-viewport.y / viewport.scale / Math.max(1, canvasHeight)) * 100, 0, 100)
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
  );
}
