import { BsChevronDown, BsChevronUp, BsLayers } from "react-icons/bs";

export default function MapCanvasEditorChrome({
  showSpotEditorLayer,
  modeIndicatorMeta,
  isRenderToolboxCollapsed,
  onToggleRenderToolboxCollapsed,
  renderLayerButtons,
  visibleSpotLayers,
  onToggleSpotLayerVisibility
}) {
  if (!showSpotEditorLayer) {
    return null;
  }

  return (
    <>
      <div className={`map-mode-indicator ${modeIndicatorMeta.toneClassName}`} aria-live="polite">
        <span className="map-mode-indicator-label">MODE</span>
        <strong>{modeIndicatorMeta.label}</strong>
        <span className="map-mode-indicator-detail">{modeIndicatorMeta.detail}</span>
      </div>

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
          onClick={onToggleRenderToolboxCollapsed}
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
                className={`map-overlay-toolbox-checkbox ${visibleSpotLayers[layer.id] ? "is-active" : ""}`}
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
    </>
  );
}
